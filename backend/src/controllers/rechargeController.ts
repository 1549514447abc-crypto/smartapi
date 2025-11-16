/**
 * 充值控制器
 * 处理充值订单创建、模拟支付、订单查询等
 */

import { Request, Response } from 'express';
import User from '../models/User';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import supabaseService from '../services/SupabaseService';
import crypto from 'crypto';

/**
 * 从数据库获取充值赠送规则
 */
async function getBonusRules(): Promise<any[]> {
  const now = new Date();
  const rules: any[] = await sequelize.query(
    `SELECT id, min_amount, bonus_rate, bonus_type, bonus_fixed_amount, display_text, priority
     FROM recharge_bonus_rules
     WHERE is_active = 1
     AND (start_time IS NULL OR start_time <= ?)
     AND (end_time IS NULL OR end_time >= ?)
     ORDER BY priority DESC, min_amount DESC`,
    {
      replacements: [now, now],
      type: QueryTypes.SELECT
    }
  );
  return rules;
}

/**
 * 计算赠送金额（从数据库规则）
 */
async function calculateBonus(amount: number): Promise<number> {
  const rules = await getBonusRules();

  for (const rule of rules) {
    if (amount >= parseFloat(rule.min_amount)) {
      if (rule.bonus_type === 'fixed' && rule.bonus_fixed_amount) {
        // 固定金额赠送
        return Number(parseFloat(rule.bonus_fixed_amount).toFixed(4));
      } else {
        // 按比例赠送
        return Number((amount * parseFloat(rule.bonus_rate)).toFixed(4));
      }
    }
  }
  return 0;
}

/**
 * 生成订单号
 * 格式: RC{timestamp}{random}
 */
function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RC${timestamp}${random}`;
}

/**
 * 创建充值订单
 * POST /api/recharge/create
 */
export const createRechargeOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { amount, paymentMethod } = req.body;

    // 验证金额
    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        error: '充值金额最低为10元'
      });
    }

    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        error: '单次充值最高10000元'
      });
    }

    // 验证支付方式
    if (!['alipay', 'wechat'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: '无效的支付方式'
      });
    }

    const userId = req.user.userId;

    // 查询用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 计算赠送金额
    const bonusAmount = await calculateBonus(amount);
    const totalAmount = amount + bonusAmount;

    // 生成订单号
    const orderNo = generateOrderNo();

    // 创建充值记录（状态为pending）
    const currentBalance = user.balance || 0;

    await sequelize.query(
      `INSERT INTO recharge_records
       (user_id, order_no, amount_paid, amount_received, bonus_amount,
        payment_method, status, balance_before, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
      {
        replacements: [
          userId,
          orderNo,
          amount,
          totalAmount,
          bonusAmount,
          paymentMethod,
          currentBalance,
          currentBalance // 暂时不变，支付成功后更新
        ]
      }
    );

    // 生成模拟二维码URL（实际项目中这里应该是真实的支付二维码）
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      `smartapi://pay?order_no=${orderNo}&amount=${amount}&method=${paymentMethod}`
    )}`;

    console.log(`📝 创建充值订单: ${orderNo}, 用户: ${userId}, 金额: ¥${amount}, 赠送: ¥${bonusAmount}`);

    // 在开发环境下，自动完成模拟支付
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 开发环境：自动完成模拟支付...`);

      // 延迟1秒模拟支付过程
      setTimeout(async () => {
        try {
          const transaction = await sequelize.transaction();

          // 更新用户余额
          const oldBalance = parseFloat(user.balance?.toString() || '0');
          const newBalance = oldBalance + totalAmount;

          await user.update({
            balance: newBalance,
            total_recharged: parseFloat((user.total_recharged || 0).toString()) + amount
          }, { transaction });

          // 更新订单状态
          await sequelize.query(
            `UPDATE recharge_records
             SET status = 'success',
                 balance_after = ?,
                 completed_at = NOW()
             WHERE order_no = ?`,
            {
              replacements: [newBalance, orderNo],
              transaction
            }
          );

          // 记录余额日志
          await sequelize.query(
            `INSERT INTO balance_logs
             (user_id, change_type, change_amount, balance_before, balance_after,
              source, description)
             VALUES (?, 'recharge', ?, ?, ?, 'web', ?)`,
            {
              replacements: [
                userId,
                totalAmount,
                oldBalance,
                newBalance,
                `充值 ¥${amount} (赠送 ¥${bonusAmount})`
              ],
              transaction
            }
          );

          // 同步到Supabase
          try {
            await supabaseService.syncBalance(userId, newBalance);
          } catch (syncError) {
            console.error('Supabase同步失败:', syncError);
          }

          await transaction.commit();
          console.log(`✅ 模拟支付完成: ${orderNo}, 新余额: ¥${newBalance}`);
        } catch (error) {
          console.error('自动模拟支付失败:', error);
        }
      }, 1000);
    }

    return res.json({
      success: true,
      data: {
        orderNo,
        amount,
        bonusAmount,
        totalAmount,
        paymentMethod,
        qrCodeUrl,
        // 模拟支付链接（测试用）
        mockPayUrl: `/api/recharge/mock-pay/${orderNo}`,
        // 开发环境标识
        autoPayEnabled: process.env.NODE_ENV === 'development'
      },
      message: '订单创建成功'
    });
  } catch (error: any) {
    console.error('创建充值订单失败:', error);
    return res.status(500).json({
      success: false,
      error: '创建订单失败',
      details: error.message
    });
  }
};

/**
 * 模拟支付（测试用）
 * POST /api/recharge/mock-pay/:orderNo
 */
export const mockPay = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { orderNo } = req.params;

    console.log(`💳 模拟支付: ${orderNo}`);

    // 查询订单
    const [orders]: any = await sequelize.query(
      `SELECT * FROM recharge_records WHERE order_no = ?`,
      {
        replacements: [orderNo],
        transaction
      }
    );

    if (!orders || orders.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    const order = orders[0];

    if (order.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: '订单状态异常',
        status: order.status
      });
    }

    // 查询用户
    const user = await User.findByPk(order.user_id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    const oldBalance = parseFloat(user.balance?.toString() || '0');
    const newBalance = oldBalance + parseFloat(order.amount_received.toString());

    // 1. 更新用户余额
    await user.update({
      balance: newBalance,
      total_recharged: parseFloat((user.total_recharged || 0).toString()) + parseFloat(order.amount_paid.toString())
    }, { transaction });

    // 2. 更新订单状态
    await sequelize.query(
      `UPDATE recharge_records
       SET status = 'success',
           balance_after = ?,
           completed_at = NOW()
       WHERE order_no = ?`,
      {
        replacements: [newBalance, orderNo],
        transaction
      }
    );

    // 3. 记录余额日志
    await sequelize.query(
      `INSERT INTO balance_logs
       (user_id, change_type, change_amount, balance_before, balance_after,
        source, description)
       VALUES (?, 'recharge', ?, ?, ?, 'web', ?)`,
      {
        replacements: [
          order.user_id,
          order.amount_received,
          oldBalance,
          newBalance,
          `充值订单: ${orderNo}${order.bonus_amount > 0 ? `, 赠送: ¥${order.bonus_amount}` : ''}`
        ],
        transaction
      }
    );

    await transaction.commit();

    // 4. 异步同步到 Supabase（不阻塞响应）
    supabaseService.syncBalance(order.user_id, newBalance).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    console.log(`✅ 充值成功: 用户 ${order.user_id}, 订单 ${orderNo}, 余额 ${oldBalance} -> ${newBalance}`);

    return res.json({
      success: true,
      data: {
        orderNo,
        oldBalance,
        newBalance,
        rechargeAmount: order.amount_received
      },
      message: '支付成功'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('模拟支付失败:', error);
    return res.status(500).json({
      success: false,
      error: '支付失败',
      details: error.message
    });
  }
};

/**
 * 查询订单状态
 * GET /api/recharge/order/:orderNo
 */
export const getOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;

    const [orders]: any = await sequelize.query(
      `SELECT order_no, amount_paid, amount_received, bonus_amount,
              payment_method, status, created_at, completed_at
       FROM recharge_records
       WHERE order_no = ?`,
      {
        replacements: [orderNo]
      }
    );

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    return res.json({
      success: true,
      data: orders[0]
    });
  } catch (error: any) {
    console.error('查询订单失败:', error);
    return res.status(500).json({
      success: false,
      error: '查询失败',
      details: error.message
    });
  }
};

/**
 * 获取用户充值记录
 * GET /api/recharge/history
 */
export const getRechargeHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 查询充值记录
    const [records]: any = await sequelize.query(
      `SELECT order_no, amount_paid, amount_received, bonus_amount,
              payment_method, status, balance_before, balance_after,
              created_at, completed_at
       FROM recharge_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [userId, Number(limit), offset]
      }
    );

    // 查询总数
    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM recharge_records WHERE user_id = ?`,
      {
        replacements: [userId]
      }
    );

    const total = countResult[0].total;

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询充值记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '查询失败',
      details: error.message
    });
  }
};

/**
 * 获取充值配置（赠送规则）
 * GET /api/recharge/config
 */
export const getRechargeConfig = async (req: Request, res: Response) => {
  try {
    // 从数据库获取赠送规则
    const rules = await getBonusRules();

    // 转换为前端友好的格式
    const bonusConfig = rules.map(rule => {
      const minAmount = parseFloat(rule.min_amount);
      const bonusRate = parseFloat(rule.bonus_rate);
      let bonusAmount = 0;

      if (rule.bonus_type === 'fixed' && rule.bonus_fixed_amount) {
        bonusAmount = parseFloat(rule.bonus_fixed_amount);
      } else {
        bonusAmount = minAmount * bonusRate;
      }

      return {
        amount: minAmount,
        bonusRate: bonusRate,
        bonusAmount: bonusAmount,
        displayText: rule.display_text || (bonusRate > 0
          ? `充${minAmount}送${bonusAmount.toFixed(0)}`
          : `充${minAmount}`)
      };
    });

    return res.json({
      success: true,
      data: {
        minAmount: 10,
        maxAmount: 10000,
        bonusRules: bonusConfig,
        paymentMethods: [
          { value: 'alipay', label: '支付宝', icon: '💳' },
          { value: 'wechat', label: '微信支付', icon: '💚' }
        ]
      }
    });
  } catch (error: any) {
    console.error('获取充值配置失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取配置失败',
      details: error.message
    });
  }
};
