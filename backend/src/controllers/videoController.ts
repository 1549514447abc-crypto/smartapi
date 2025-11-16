import { Request, Response } from 'express';
import VideoExtractionTask from '../models/VideoExtractionTask';
import User from '../models/User';
import AlapiService from '../services/AlapiService';
import DashscopeAsrService from '../services/DashscopeAsrService';
import DoubaoLlmService from '../services/DoubaoLlmService';
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

/**
 * Calculate cost based on used seconds and user membership
 */
const calculateCost = (usedSeconds: number, enableCorrection: boolean, user: User): number => {
  // Base cost: 0.02 credits per second
  let costPerSecond = 0.02;

  // Check if user has active workflow membership
  const now = new Date();
  if (user.workflow_member_expire && new Date(user.workflow_member_expire) > now) {
    // Check membership type based on status
    if (user.workflow_member_status === 'yearly') {
      costPerSecond = 0.015; // 25% off for yearly
    } else if (user.workflow_member_status === 'monthly') {
      costPerSecond = 0.018; // 10% off for monthly
    }
  }

  let totalCost = usedSeconds * costPerSecond;

  // Additional cost for correction: 0.01 credits
  if (enableCorrection) {
    totalCost += 0.01;
  }

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
};

/**
 * Extract video transcript from URL (3-step process)
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

    // Create initial task record
    const task = await VideoExtractionTask.create({
      user_id: userId,
      original_url: url,
      status: 'processing',
      enable_correction: enableCorrection
    });

    console.log(`\n🎬 Starting video transcript extraction for task #${task.id}`);
    console.log(`   URL: ${url.substring(0, 60)}...`);
    console.log(`   Enable Correction: ${enableCorrection}`);

    try {
      // ========================================
      // STEP 1: Parse video URL with ALAPI
      // ========================================
      console.log('\n📍 Step 1/3: Parsing video URL...');
      const startStep1 = Date.now();

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
      const cost = calculateCost(
        task.used_seconds || 0,
        enableCorrection,
        user
      );

      console.log(`\n💰 Cost calculation:`);
      console.log(`   Used seconds: ${task.used_seconds}s`);
      console.log(`   Membership: ${user.workflow_member_status || 'none'}`);
      console.log(`   Correction enabled: ${enableCorrection}`);
      console.log(`   Total cost: ${cost} credits`);

      // Check balance
      if (user.balance < cost) {
        await task.update({
          status: 'failed',
          error_message: `Insufficient balance. Required: ${cost}, Available: ${user.balance}`,
          completed_at: new Date()
        });

        errorResponse(res, 'Insufficient balance', 402, `Required: ${cost}, Available: ${user.balance}`);
        return;
      }

      // Deduct balance
      await user.update({
        balance: user.balance - cost
      });

      console.log(`✅ Balance deducted: ${user.balance + cost} → ${user.balance}`);

      // ========================================
      // Mark task as completed
      // ========================================
      await task.update({
        status: 'completed',
        completed_at: new Date()
      });

      console.log(`\n🎉 Extraction completed successfully!`);
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Total time: ${Date.now() - startStep1}ms\n`);

      // Return success response
      successResponse(res, {
        task_id: task.id,
        video_title: task.video_title,
        video_cover: task.video_cover,
        platform: task.platform,
        transcript: task.transcript,
        corrected_transcript: task.corrected_transcript,
        audio_duration: task.audio_duration,
        used_seconds: task.used_seconds,
        cost,
        remaining_balance: user.balance
      }, 'Video transcript extracted successfully', 201);

    } catch (error: any) {
      // Update task as failed
      await task.update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date()
      });

      console.error(`\n❌ Extraction failed:`, error.message);
      throw error;
    }

  } catch (error: any) {
    console.error('Extract video error:', error);
    errorResponse(res, 'Failed to extract video transcript', 500, error.message);
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
