/**
 * Webhook 控制器
 * 处理来自 Supabase 的 Webhook 请求（插件扣费通知）
 */

import { Request, Response } from 'express';
import User from '../models/User';
import sequelize from '../config/database';

/**
 * 接收 Supabase 余额更新 Webhook
 * 当插件扣费后，Supabase 会调用此接口同步余额变动
 */
export const receiveBalanceUpdate = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    // 1. 验证 Webhook 签名
    const webhookSecret = process.env.WEBHOOK_SECRET || 'your_webhook_secret_key';
    const authHeader = req.headers.authorization;

    if (authHeader !== `Bearer ${webhookSecret}`) {
      return res.status(401).json({
        success: false,
        error: '未授权的 Webhook 请求'
      });
    }

    // 2. 获取数据
    const {
      user_id,
      new_balance,
      old_balance,
      change_amount,
      timestamp
    } = req.body;

    console.log('📨 收到 Supabase Webhook 通知:', {
      user_id,
      new_balance,
      old_balance,
      change_amount,
      timestamp
    });

    // 3. 解析用户ID（u_{id} -> id）
    const userIdMatch = user_id.match(/^u_(\d+)$/);
    if (!userIdMatch) {
      return res.status(400).json({
        success: false,
        error: '无效的用户ID格式'
      });
    }
    const numericUserId = parseInt(userIdMatch[1], 10);

    // 4. 查询用户
    const user = await User.findByPk(numericUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 5. 更新本地余额
    const oldBalanceLocal = user.balance || 0;
    await user.update({ balance: new_balance }, { transaction });

    // 6. 如果是扣费（change_amount < 0），记录消费日志
    if (change_amount < 0) {
      await sequelize.query(
        `INSERT INTO balance_logs
        (user_id, change_type, change_amount, balance_before, balance_after, source, description)
        VALUES (?, 'consume', ?, ?, ?, 'plugin', '插件扣费')`,
        {
          replacements: [
            numericUserId,
            Math.abs(change_amount),
            old_balance,
            new_balance
          ],
          transaction
        }
      );

      // 更新累计消费
      const currentConsumed = user.total_consumed || 0;
      await user.update({
        total_consumed: currentConsumed + Math.abs(change_amount)
      }, { transaction });
    }

    await transaction.commit();

    console.log(`✅ Webhook 处理成功: 用户 ${numericUserId}, 余额 ${oldBalanceLocal} -> ${new_balance}`);

    return res.json({
      success: true,
      message: '余额同步成功'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('❌ Webhook 处理失败:', error);

    return res.status(500).json({
      success: false,
      error: '处理失败',
      details: error.message
    });
  }
};
