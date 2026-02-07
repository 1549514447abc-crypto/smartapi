/**
 * 插件余额API控制器
 * 专供外部插件调用，只能读取和扣减余额
 * 安全性：通过API Key验证用户身份
 */

import { Request, Response } from 'express';
import sequelize from '../config/database';
import supabaseService from '../services/SupabaseService';

/**
 * 获取用户余额（插件专用）
 * GET /api/plugin/balance?api_key=xxx
 */
export const getBalance = async (req: Request, res: Response) => {
  try {
    const { api_key } = req.query;

    if (!api_key || typeof api_key !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少 api_key 参数'
      });
    }

    // 通过 API Key 查找用户
    const [keys] = await sequelize.query(
      `SELECT ak.user_id, u.balance
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key = ? AND ak.status = 'active'`,
      { replacements: [api_key] }
    ) as [any[], any];

    if (!keys[0]) {
      return res.status(401).json({
        success: false,
        message: '无效的 API Key'
      });
    }

    // 只返回余额，不返回其他信息
    return res.json({
      success: true,
      data: {
        balance: Number(keys[0].balance) || 0
      }
    });
  } catch (error) {
    console.error('获取余额失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取余额失败'
    });
  }
};

/**
 * 扣减用户余额（插件专用）
 * POST /api/plugin/balance/deduct
 * Body: { api_key, amount, service_name, description }
 */
export const deductBalance = async (req: Request, res: Response) => {
  try {
    const { api_key, amount, service_name, description } = req.body;

    // 参数验证
    if (!api_key || typeof api_key !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少 api_key 参数'
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须是大于0的数字'
      });
    }

    // 通过 API Key 查找用户
    const [keys] = await sequelize.query(
      `SELECT ak.user_id, u.balance
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key = ? AND ak.status = 'active'`,
      { replacements: [api_key] }
    ) as [any[], any];

    if (!keys[0]) {
      return res.status(401).json({
        success: false,
        message: '无效的 API Key'
      });
    }

    const userId = keys[0].user_id;
    const currentBalance = Number(keys[0].balance) || 0;

    // 检查余额是否足够
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: '余额不足',
        data: { balance: currentBalance }
      });
    }

    const newBalance = currentBalance - amount;

    // 事务：扣减余额 + 记录日志
    const transaction = await sequelize.transaction();
    try {
      // 更新余额
      await sequelize.query(
        `UPDATE users SET balance = ?, total_consumed = total_consumed + ? WHERE id = ?`,
        { replacements: [newBalance, amount, userId], transaction }
      );

      // 记录余额变动日志
      await sequelize.query(
        `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
         VALUES (?, 'consumption', ?, ?, ?, 'plugin_api', ?, ?, NOW())`,
        {
          replacements: [
            userId,
            -amount,
            currentBalance,
            newBalance,
            service_name || 'unknown',
            description || '插件调用扣费'
          ],
          transaction
        }
      );

      await transaction.commit();

      // 同步到 Supabase（异步，不阻塞响应）
      supabaseService.syncBalance(userId, newBalance).catch(err => {
        console.error('Supabase 同步余额失败:', err);
      });

      return res.json({
        success: true,
        message: '扣费成功',
        data: {
          balance: newBalance,
          deducted: amount
        }
      });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('扣减余额失败:', error);
    return res.status(500).json({
      success: false,
      message: '扣减余额失败'
    });
  }
};
