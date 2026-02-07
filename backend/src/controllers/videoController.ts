import { Request, Response } from 'express';
import VideoExtractionTask from '../models/VideoExtractionTask';
import User from '../models/User';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import sequelize from '../config/database';
import AlapiService from '../services/AlapiService';
import DashscopeAsrService from '../services/DashscopeAsrService';
import DoubaoLlmService from '../services/DoubaoLlmService';
import supabaseService from '../services/SupabaseService';
import { successResponse, errorResponse } from '../utils/response';
import Joi from 'joi';

// Validation schema for video extraction
const extractVideoSchema = Joi.object({
  url: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Invalid URL format',
      'any.required': 'Video URL is required'
    }),
  enableCorrection: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'enableCorrection must be a boolean'
    })
});

// Validation schema for batch video extraction
const batchExtractVideoSchema = Joi.object({
  urls: Joi.array()
    .items(Joi.string().allow(''))
    .required()
    .messages({
      'array.base': 'urls must be an array',
      'any.required': 'Video URLs are required'
    }),
  enableCorrection: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'enableCorrection must be a boolean'
    })
});

/**
 * Calculate cost based on used seconds and user membership
 * 计费标准从系统配置读取：
 * - 非会员: video_rate_normal (默认 0.002 元/秒)
 * - 年度会员: video_rate_yearly (默认 0.0015 元/秒)
 * - 课程学员: video_rate_course (默认 0.0013 元/秒)
 */
const calculateCost = async (usedSeconds: number, enableCorrection: boolean, user: User): Promise<number> => {
  // 从系统配置读取费率
  const rateNormal = await SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_NORMAL) || 0.002;
  const rateYearly = await SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_YEARLY) || 0.0015;
  const rateCourse = await SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_COURSE) || 0.0013;

  let costPerSecond = rateNormal;

  const now = new Date();

  // 检查课程学员身份（优先级最高）
  if (user.is_course_student) {
    costPerSecond = rateCourse;
  }
  // 检查年度会员
  else if (user.membership_type === 'yearly' && user.membership_expiry && new Date(user.membership_expiry) > now) {
    costPerSecond = rateYearly;
  }
  // 检查课程会员类型
  else if (user.membership_type === 'course' && user.membership_expiry && new Date(user.membership_expiry) > now) {
    costPerSecond = rateCourse;
  }

  let totalCost = usedSeconds * costPerSecond;

  // Additional cost for correction: 0.01 credits (if enabled)
  if (enableCorrection) {
    totalCost += 0.01;
  }

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
};

/**
 * Process video extraction in background (async)
 */
const processVideoExtraction = async (taskId: number, url: string, enableCorrection: boolean, userId: number): Promise<void> => {
  const startTime = Date.now();

  try {
    // Get task and user
    const task = await VideoExtractionTask.findByPk(taskId);
    const user = await User.findByPk(userId);

    if (!task || !user) {
      console.error(`Task ${taskId} or user ${userId} not found`);
      return;
    }

    // ========================================
    // STEP 1: Parse video URL with ALAPI
    // ========================================
    console.log('\n📍 Step 1/3: Parsing video URL...');
    const startStep1 = Date.now();

    await task.update({ status: 'step1_parsing' });

    const apiResponse = await AlapiService.parseVideo(url, userId);
    const videoData = apiResponse.data || {};

    // Update task with video metadata
    await task.update({
      platform: videoData.platform || null,
      video_url: videoData.video_url || null,
      video_title: videoData.title || null,
      video_cover: videoData.cover_url || null,
      video_duration: videoData.duration || null,
      author_name: videoData.author || null,
      author_avatar: videoData.author_avatar || null,
      raw_response: apiResponse,
      audio_url: videoData.video_url || null // Use video URL as audio source
    });

    console.log(`✅ Step 1 completed in ${Date.now() - startStep1}ms`);
    console.log(`   Platform: ${task.platform}`);
    console.log(`   Title: ${task.video_title}`);

    // Check if video URL was extracted
    if (!task.audio_url) {
      throw new Error('Failed to extract video URL from source');
    }

    // ========================================
    // STEP 2: Speech recognition with DashScope
    // ========================================
    console.log('\n📍 Step 2/3: Converting speech to text...');
    const startStep2 = Date.now();

    await task.update({ status: 'step2_transcribing' });

    const transcriptionResult = await DashscopeAsrService.transcribeFromUrl(
      task.audio_url,
      userId
    );

    // Update task with transcript data
    await task.update({
      transcript: transcriptionResult.text,
      audio_duration: transcriptionResult.duration,
      used_seconds: transcriptionResult.usedSeconds
    });

    console.log(`✅ Step 2 completed in ${Date.now() - startStep2}ms`);
    console.log(`   Transcript length: ${transcriptionResult.text.length} characters`);
    console.log(`   Used seconds: ${transcriptionResult.usedSeconds}s`);

    // ========================================
    // STEP 3 (Optional): Text correction with Doubao
    // ========================================
    let correctionCost = 0;

    if (enableCorrection && task.transcript) {
      console.log('\n📍 Step 3/3: Correcting text errors...');
      const startStep3 = Date.now();

      await task.update({ status: 'step3_correcting' });

      const correctionResult = await DoubaoLlmService.correctText(
        task.transcript,
        userId
      );

      // Update task with corrected transcript
      await task.update({
        corrected_transcript: correctionResult.correctedText,
        correction_cost: correctionResult.totalTokens
      });

      correctionCost = correctionResult.totalTokens;

      console.log(`✅ Step 3 completed in ${Date.now() - startStep3}ms`);
      console.log(`   Tokens used: ${correctionResult.totalTokens}`);
      console.log(`   Text changed: ${correctionResult.changed ? 'Yes' : 'No'}`);
    } else {
      console.log('\n⏭️  Step 3: Skipped (correction not enabled)');
    }

    // ========================================
    // Calculate cost and deduct from balance
    // ========================================
    // Reload user to get latest balance
    await user.reload();

    const cost = await calculateCost(
      task.used_seconds || 0,
      enableCorrection,
      user
    );

    console.log(`\n💰 Cost calculation:`);
    console.log(`   Used seconds: ${task.used_seconds}s`);
    console.log(`   Membership: ${user.workflow_member_status || 'none'}`);
    console.log(`   Correction enabled: ${enableCorrection}`);
    console.log(`   Total cost: ${cost} credits`);

    // Calculate balance after deduction (can be negative)
    const balanceBefore = user.balance;
    const balanceAfter = user.balance - cost;
    const needsRecharge = balanceAfter < 0;

    if (needsRecharge) {
      console.log(`⚠️ Balance will be negative after deduction: ${balanceBefore} → ${balanceAfter}`);
    }

    // Deduct balance and update total_consumed
    await user.update({
      balance: balanceAfter,
      total_consumed: Number(user.total_consumed || 0) + cost
    });

    // Create balance log record
    await sequelize.query(
      `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
       VALUES (?, 'consumption', ?, ?, ?, 'video_extraction', 'video_extract', ?, NOW())`,
      {
        replacements: [
          userId,
          -cost,
          balanceBefore,
          balanceAfter,
          `视频提取: ${task.video_title || task.original_url.substring(0, 50)}...`
        ]
      }
    );

    console.log(`✅ Balance deducted: ${balanceBefore} → ${balanceAfter}`);

    // 异步同步余额到 Supabase（不阻塞响应）
    supabaseService.syncBalance(userId, balanceAfter).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    // ========================================
    // Mark task as completed
    // ========================================
    await task.update({
      status: 'completed',
      cost: cost,
      completed_at: new Date()
    });

    console.log(`\n🎉 Extraction completed successfully!`);
    console.log(`   Task ID: ${task.id}`);
    console.log(`   Total time: ${Date.now() - startTime}ms`);
    if (needsRecharge) {
      console.log(`   ⚠️ User needs to recharge! Balance: ${balanceAfter}\n`);
    } else {
      console.log('');
    }

  } catch (error: any) {
    // Update task as failed
    const task = await VideoExtractionTask.findByPk(taskId);
    if (task) {
      await task.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      });
    }

    console.error(`\n❌ Extraction failed for task ${taskId}:`, error.message);
  }
};

/**
 * Extract video transcript from URL (async mode)
 * POST /api/video/extract
 */
export const extractVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = extractVideoSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const { url, enableCorrection } = value;
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Get user info for membership level
    const user = await User.findByPk(userId);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    // Check minimum balance before creating task (0.5 yuan minimum)
    const MIN_BALANCE_REQUIRED = 0.5;
    if (user.balance < MIN_BALANCE_REQUIRED) {
      errorResponse(res, `余额不足，请先充值。当前余额: ¥${user.balance.toFixed(2)}，最低需要: ¥${MIN_BALANCE_REQUIRED}`, 402);
      return;
    }

    // Create initial task record
    const task = await VideoExtractionTask.create({
      user_id: userId,
      original_url: url,
      status: 'pending',
      enable_correction: enableCorrection
    });

    console.log(`\n🎬 Task #${task.id} created, starting async extraction...`);
    console.log(`   URL: ${url.substring(0, 60)}...`);
    console.log(`   Enable Correction: ${enableCorrection}`);

    // Start async processing (don't await)
    processVideoExtraction(task.id, url, enableCorrection, userId);

    // Return immediately with task ID
    successResponse(res, {
      task_id: task.id,
      status: 'pending',
      message: 'Task created, processing in background'
    }, 'Video extraction task created', 202);

  } catch (error: any) {
    console.error('Extract video error:', error);
    errorResponse(res, 'Failed to create video extraction task', 500, error.message);
  }
};

/**
 * Helper function to extract URL from share text
 */
const extractUrlFromText = (text: string): string | null => {
  const urlPatterns = [
    /https?:\/\/v\.douyin\.com\/[^\s]+/i,
    /https?:\/\/www\.douyin\.com\/video\/[^\s]+/i,
    /https?:\/\/www\.bilibili\.com\/video\/[^\s]+/i,
    /https?:\/\/b23\.tv\/[^\s]+/i,
    /https?:\/\/v\.kuaishou\.com\/[^\s]+/i,
    /https?:\/\/www\.xiaohongshu\.com\/[^\s]+/i,
    /https?:\/\/xhslink\.com\/[^\s]+/i,
    /https?:\/\/[^\s]+/i
  ];

  for (const pattern of urlPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/[,，。！!?？\s]+$/, '');
    }
  }
  return null;
};

/**
 * Batch extract video transcripts from multiple URLs
 * POST /api/video/extract-batch
 */
export const extractVideoBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = batchExtractVideoSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const { urls, enableCorrection } = value;
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    // Check minimum balance
    const MIN_BALANCE_REQUIRED = 0.5;
    if (user.balance < MIN_BALANCE_REQUIRED) {
      errorResponse(res, `余额不足，请先充值。当前余额: ¥${user.balance.toFixed(2)}，最低需要: ¥${MIN_BALANCE_REQUIRED}`, 402);
      return;
    }

    // Filter and validate URLs
    const validUrls: string[] = [];
    const invalidUrls: { index: number; url: string; reason: string }[] = [];

    urls.forEach((rawUrl: string, index: number) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        // Skip empty lines
        return;
      }

      const extractedUrl = extractUrlFromText(trimmed);
      if (extractedUrl) {
        validUrls.push(extractedUrl);
      } else {
        invalidUrls.push({
          index: index + 1,
          url: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
          reason: '无法识别的链接格式'
        });
      }
    });

    if (validUrls.length === 0) {
      errorResponse(res, '没有有效的视频链接', 400);
      return;
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 10;
    if (validUrls.length > MAX_BATCH_SIZE) {
      errorResponse(res, `批量提取最多支持 ${MAX_BATCH_SIZE} 个链接，当前 ${validUrls.length} 个`, 400);
      return;
    }

    // Create tasks for all valid URLs
    const createdTasks: { task_id: number; url: string; status: string }[] = [];

    for (const url of validUrls) {
      const task = await VideoExtractionTask.create({
        user_id: userId,
        original_url: url,
        status: 'pending',
        enable_correction: enableCorrection
      });

      console.log(`\n🎬 Batch Task #${task.id} created for URL: ${url.substring(0, 60)}...`);

      // Start async processing
      processVideoExtraction(task.id, url, enableCorrection, userId);

      createdTasks.push({
        task_id: task.id,
        url: url,
        status: 'pending'
      });
    }

    console.log(`\n📦 Batch extraction: ${createdTasks.length} tasks created`);

    successResponse(res, {
      total: validUrls.length,
      tasks: createdTasks,
      invalid_urls: invalidUrls,
      message: invalidUrls.length > 0
        ? `已创建 ${createdTasks.length} 个任务，${invalidUrls.length} 个链接无效`
        : `已创建 ${createdTasks.length} 个任务`
    }, 'Batch extraction tasks created', 202);

  } catch (error: any) {
    console.error('Batch extract video error:', error);
    errorResponse(res, 'Failed to create batch extraction tasks', 500, error.message);
  }
};

/**
 * Get user's extraction tasks
 * GET /api/video/tasks
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get status filter
    const status = req.query.status as string | undefined;
    const where: any = { user_id: userId };
    if (status) {
      where.status = status;
    }

    // Query tasks
    const { count, rows } = await VideoExtractionTask.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    successResponse(res, {
      tasks: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    }, 'Tasks retrieved successfully');

  } catch (error: any) {
    console.error('Get tasks error:', error);
    errorResponse(res, 'Failed to get tasks', 500, error.message);
  }
};

/**
 * Get task by ID
 * GET /api/video/tasks/:id
 */
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find task
    const task = await VideoExtractionTask.findOne({
      where: {
        id: taskId,
        user_id: userId
      }
    });

    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    successResponse(res, task, 'Task retrieved successfully');

  } catch (error: any) {
    console.error('Get task error:', error);
    errorResponse(res, 'Failed to get task', 500, error.message);
  }
};

/**
 * Delete task by ID
 * DELETE /api/video/tasks/:id
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find task
    const task = await VideoExtractionTask.findOne({
      where: {
        id: taskId,
        user_id: userId
      }
    });

    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    // Delete task
    await task.destroy();

    successResponse(res, null, 'Task deleted successfully');

  } catch (error: any) {
    console.error('Delete task error:', error);
    errorResponse(res, 'Failed to delete task', 500, error.message);
  }
};

/**
 * Get API statistics (for current user or admin)
 * GET /api/video/statistics
 */
export const getStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.userType === 'admin';

    // Admin can see all stats, normal users see only their own
    const alapiStats = await AlapiService.getStatistics(isAdmin ? undefined : userId);
    const asrStats = await DashscopeAsrService.getStatistics(isAdmin ? undefined : userId);
    const llmStats = await DoubaoLlmService.getStatistics(isAdmin ? undefined : userId);

    successResponse(res, {
      alapi: alapiStats,
      dashscope_asr: asrStats,
      doubao_llm: llmStats
    }, 'Statistics retrieved successfully');

  } catch (error: any) {
    console.error('Get statistics error:', error);
    errorResponse(res, 'Failed to get statistics', 500, error.message);
  }
};

/**
 * Get token configuration (admin only)
 * GET /api/video/admin/token-config
 */
export const getTokenConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await AlapiService.getTokenConfig();

    // Mask tokens for security (show only first 8 and last 4 characters)
    const maskToken = (token: string): string => {
      if (token.length <= 12) return '***';
      return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
    };

    successResponse(res, {
      current_token: config.current_token,
      primary_token: maskToken(config.primary_token),
      backup_token: maskToken(config.backup_token),
      api_endpoint: config.api_endpoint
    }, 'Token configuration retrieved successfully');

  } catch (error: any) {
    console.error('Get token config error:', error);
    errorResponse(res, 'Failed to get token configuration', 500, error.message);
  }
};

/**
 * Update token configuration (admin only)
 * PUT /api/video/admin/token-config
 */
export const updateTokenConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { primary_token, backup_token, current_token } = req.body;

    // Validate current_token value
    if (current_token && !['primary', 'backup'].includes(current_token)) {
      errorResponse(res, 'Invalid current_token value. Must be "primary" or "backup"', 400);
      return;
    }

    await AlapiService.updateTokenConfig({
      primary_token,
      backup_token,
      current_token
    });

    successResponse(res, null, 'Token configuration updated successfully');

  } catch (error: any) {
    console.error('Update token config error:', error);
    errorResponse(res, 'Failed to update token configuration', 500, error.message);
  }
};
