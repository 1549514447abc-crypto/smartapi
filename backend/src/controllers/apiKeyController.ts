import { Request, Response } from 'express';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import { generateApiKey } from '../utils/apiKey';
import { successResponse, errorResponse } from '../utils/response';
import supabaseService from '../services/SupabaseService';

/**
 * Get user's primary API key
 * GET /api/apikey
 */
export const getApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const userId = req.user.userId;

    let apiKeys: any[] = await sequelize.query(
      `SELECT api_key, key_name, status, created_at, last_used_at, total_calls
       FROM api_keys
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT 1`,
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    // 如果没有密钥，自动创建一个
    if (apiKeys.length === 0) {
      console.log(`用户 ${userId} 没有API密钥，自动创建...`);
      const newApiKey = generateApiKey();
      const keyName = '默认密钥';

      await sequelize.query(
        `INSERT INTO api_keys (api_key, user_id, key_name, status)
         VALUES (?, ?, ?, 'active')`,
        {
          replacements: [newApiKey, userId, keyName]
        }
      );

      // 获取用户余额用于同步
      const users: any[] = await sequelize.query(
        `SELECT balance FROM users WHERE id = ?`,
        { replacements: [userId], type: QueryTypes.SELECT }
      );
      const balance = users.length > 0 ? parseFloat(users[0].balance) : 0;

      // 同步到 Supabase
      supabaseService.syncUser(userId, balance).then(() => {
        return supabaseService.syncApiKey(newApiKey, userId, keyName);
      }).catch(err => {
        console.error('Supabase 同步失败:', err);
      });

      apiKeys = [{
        api_key: newApiKey,
        key_name: keyName,
        status: 'active',
        created_at: new Date(),
        last_used_at: null,
        total_calls: 0
      }];

      console.log(`✅ 用户 ${userId} API密钥创建成功: ${newApiKey}`);
    }

    successResponse(res, apiKeys[0], 'API key retrieved successfully');
  } catch (error: any) {
    console.error('Get API key error:', error);
    errorResponse(res, 'Failed to get API key', 500, error.message);
  }
};

/**
 * Regenerate user's primary API key
 * POST /api/apikey/regenerate
 */
export const regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const userId = req.user.userId;

    // Get current API key
    const currentKeys: any[] = await sequelize.query(
      `SELECT api_key, key_name FROM api_keys WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (currentKeys.length === 0) {
      errorResponse(res, 'No API key found', 404);
      return;
    }

    const oldApiKey = currentKeys[0].api_key;
    const keyName = currentKeys[0].key_name;
    const newApiKey = generateApiKey();

    const transaction = await sequelize.transaction();

    try {
      // Delete old key
      await sequelize.query(
        `DELETE FROM api_keys WHERE api_key = ?`,
        {
          replacements: [oldApiKey],
          transaction
        }
      );

      // Create new key with same name
      await sequelize.query(
        `INSERT INTO api_keys (api_key, user_id, key_name, status)
         VALUES (?, ?, ?, 'active')`,
        {
          replacements: [newApiKey, userId, keyName],
          transaction
        }
      );

      await transaction.commit();

      // Sync to Supabase (async, don't wait)
      supabaseService.deleteApiKey(oldApiKey).catch(err => {
        console.error('Supabase delete old API key failed:', err);
      });

      supabaseService.syncApiKey(newApiKey, userId, keyName).catch(err => {
        console.error('Supabase sync new API key failed:', err);
      });

      successResponse(
        res,
        {
          api_key: newApiKey,
          key_name: keyName,
          status: 'active',
          created_at: new Date(),
          last_used_at: null,
          total_calls: 0
        },
        'API key regenerated successfully'
      );
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('Regenerate API key error:', error);
    errorResponse(res, 'Failed to regenerate API key', 500, error.message);
  }
};
