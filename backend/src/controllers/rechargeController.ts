/**
 * 充值控制器
 * 处理充值订单创建、真实支付、订单查询等
 */

import { Request, Response } from 'express';
import User from '../models/User';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import supabaseService from '../services/SupabaseService';
import crypto from 'crypto';
import AlipayService from '../services/AlipayService';
import WechatPayService from '../services/WechatPayService';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';

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
 * 支持三种微信支付方式：
 * - Native: PC端扫码支付（默认）
 * - JSAPI: 微信内浏览器支付（需要openid）
 * - H5: 手机浏览器支付（非微信）
 */
export const createRechargeOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未登录'
      });
    }

    const { amount, paymentMethod, payType } = req.body; // payType: 'native' | 'jsapi' | 'h5'

    console.log(`📱 充值请求: amount=${amount}, paymentMethod=${paymentMethod}, payType=${payType || 'native(default)'}`);

    // 从系统配置读取充值限额
    const minAmount = await SystemConfig.getNumberConfig(ConfigKey.RECHARGE_MIN_AMOUNT) || 10;
    const maxAmount = await SystemConfig.getNumberConfig(ConfigKey.RECHARGE_MAX_AMOUNT) || 10000;

    // 验证金额
    if (!amount || amount < minAmount) {
      return res.status(400).json({
        success: false,
        error: `充值金额最低为${minAmount}元`
      });
    }

    if (amount > maxAmount) {
      return res.status(400).json({
        success: false,
        error: `单次充值最高${maxAmount}元`
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

    // 获取真实支付链接
    let payUrl = '';
    let codeUrl = '';
    let jsapiParams: any = null;
    let h5Url = '';
    const subject = `创作魔方-余额充值 ¥${amount}`;

    try {
      if (paymentMethod === 'alipay') {
        // 检查支付宝服务是否可用
        const isAvailable = await AlipayService.isAvailable();
        if (isAvailable) {
          // 统一使用电脑网站支付（WAP支付需要额外开通权限）
          payUrl = await AlipayService.createPagePayment(orderNo, amount, subject);
          console.log(`✅ 支付宝订单创建成功: ${orderNo}`);
        } else {
          console.warn('⚠️ 支付宝服务不可用，返回模拟二维码');
        }
      } else if (paymentMethod === 'wechat') {
        // 检查微信支付服务是否可用
        const isAvailable = await WechatPayService.isAvailable();
        if (isAvailable) {
          // 根据支付类型选择不同的支付方式
          if (payType === 'jsapi') {
            // JSAPI支付（微信内浏览器），需要用户openid
            if (!user.wechat_openid) {
              return res.status(400).json({
                success: false,
                error: '微信内支付需要先绑定微信账号'
              });
            }
            jsapiParams = await WechatPayService.createJsapiPayment(
              orderNo,
              amount,
              subject,
              user.wechat_openid
            );
            console.log(`✅ 微信JSAPI支付订单创建成功: ${orderNo}`);
          } else if (payType === 'h5') {
            // H5支付（手机浏览器，非微信）
            const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
            const result = await WechatPayService.createH5Payment(orderNo, amount, subject, clientIp);
            h5Url = result.h5Url;
            console.log(`✅ 微信H5支付订单创建成功: ${orderNo}`);
          } else {
            // Native支付（PC端扫码，默认）
            const result = await WechatPayService.createNativePayment(orderNo, amount, subject);
            codeUrl = result.codeUrl;
            console.log(`✅ 微信Native支付订单创建成功: ${orderNo}`);
          }
        } else {
          console.warn('⚠️ 微信支付服务不可用，返回模拟二维码');
        }
      }
    } catch (payError) {
      console.error('获取支付链接失败:', payError);
      // 支付服务失败时，返回模拟二维码用于测试
    }

    // 创建充值记录（状态为pending），保存支付链接
    await sequelize.query(
      `INSERT INTO recharge_records
       (user_id, order_no, amount_paid, amount_received, bonus_amount,
        payment_method, status, balance_before, balance_after, code_url, pay_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
      {
        replacements: [
          userId,
          orderNo,
          amount,
          totalAmount,
          bonusAmount,
          paymentMethod,
          currentBalance,
          currentBalance, // 暂时不变，支付成功后更新
          codeUrl || null,
          payUrl || null
        ]
      }
    );

    console.log(`📝 创建充值订单: ${orderNo}, 用户: ${userId}, 金额: ¥${amount}, 赠送: ¥${bonusAmount}`)

    // 计算过期时间（15分钟后）
    const expireTime = new Date(Date.now() + 15 * 60 * 1000);

    const responseData = {
      orderNo,
      amount,
      bonusAmount,
      totalAmount,
      paymentMethod,
      payType: payType || 'native',
      // 支付宝返回支付链接
      payUrl: paymentMethod === 'alipay' ? payUrl : '',
      // 微信Native支付返回二维码URL
      codeUrl: paymentMethod === 'wechat' && !jsapiParams && !h5Url ? codeUrl : '',
      // 微信JSAPI支付返回调起支付参数
      jsapiParams: jsapiParams || null,
      // 微信H5支付返回跳转URL
      h5Url: h5Url || '',
      expireTime: expireTime.toISOString(),
      expireMinutes: 15
    };

    console.log(`📤 返回给前端的数据:`, JSON.stringify({
      ...responseData,
      jsapiParams: responseData.jsapiParams ? '有数据' : 'null',
      codeUrl: responseData.codeUrl ? '有数据' : '空'
    }));

    return res.json({
      success: true,
      data: responseData,
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

    const amountPaid = parseFloat(order.amount_paid.toString());
    const bonusAmount = parseFloat(order.bonus_amount?.toString() || '0');

    const oldBalance = parseFloat(user.balance?.toString() || '0');
    const oldBonusBalance = parseFloat(user.bonus_balance?.toString() || '0');
    const newBalance = oldBalance + amountPaid;  // 充值金
    const newBonusBalance = oldBonusBalance + bonusAmount;  // 赠金
    const totalBalanceAfter = newBalance + newBonusBalance;

    // 1. 更新用户余额（分开存储）
    await user.update({
      balance: newBalance,
      bonus_balance: newBonusBalance,
      total_recharged: parseFloat((user.total_recharged || 0).toString()) + amountPaid
    }, { transaction });

    // 2. 更新订单状态
    await sequelize.query(
      `UPDATE recharge_records
       SET status = 'success',
           balance_after = ?,
           completed_at = NOW()
       WHERE order_no = ?`,
      {
        replacements: [totalBalanceAfter, orderNo],
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
          amountPaid,
          oldBalance,
          newBalance,
          `充值订单: ${orderNo}` + (bonusAmount > 0 ? ` (赠送 ¥${bonusAmount} 到赠金账户)` : '')
        ],
        transaction
      }
    );

    await transaction.commit();

    // 4. 异步同步到 Supabase（不阻塞响应）
    supabaseService.syncBalance(order.user_id, totalBalanceAfter).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    console.log(`✅ 充值成功: 用户 ${order.user_id}, 订单 ${orderNo}, 充值金: ¥${newBalance}, 赠金: ¥${newBonusBalance}`);

    return res.json({
      success: true,
      data: {
        orderNo,
        oldBalance,
        newBalance,
        bonusBalance: newBonusBalance,
        totalBalance: totalBalanceAfter,
        rechargeAmount: amountPaid,
        bonusAmount
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

    // 从系统配置读取充值限额
    const minAmount = await SystemConfig.getNumberConfig(ConfigKey.RECHARGE_MIN_AMOUNT) || 10;
    const maxAmount = await SystemConfig.getNumberConfig(ConfigKey.RECHARGE_MAX_AMOUNT) || 10000;

    // 转换为前端友好的格式，并按金额去重
    const seenAmounts = new Set<number>();
    const bonusConfig = rules
      .map(rule => {
        const ruleMinAmount = parseFloat(rule.min_amount);
        const bonusRate = parseFloat(rule.bonus_rate);
        let bonusAmount = 0;

        if (rule.bonus_type === 'fixed' && rule.bonus_fixed_amount) {
          bonusAmount = parseFloat(rule.bonus_fixed_amount);
        } else {
          bonusAmount = ruleMinAmount * bonusRate;
        }

        return {
          amount: ruleMinAmount,
          bonusRate: bonusRate,
          bonusAmount: bonusAmount,
          displayText: rule.display_text || (bonusRate > 0
            ? `充${ruleMinAmount}送${bonusAmount.toFixed(0)}`
            : `充${ruleMinAmount}`)
        };
      })
      .filter(rule => {
        // 按金额去重，只保留第一个
        if (seenAmounts.has(rule.amount)) {
          return false;
        }
        seenAmounts.add(rule.amount);
        return true;
      });

    return res.json({
      success: true,
      data: {
        minAmount,
        maxAmount,
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

/**
 * 继续支付（获取待支付订单信息和支付链接）
 * GET /api/recharge/continue/:orderNo
 */
export const continuePayment = async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    // 查询订单
    const [rows]: any = await sequelize.query(
      `SELECT * FROM recharge_records WHERE order_no = ? AND user_id = ?`,
      { replacements: [orderNo, userId] }
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    const order = rows[0];

    // 检查订单状态
    if (order.status === 'success') {
      return res.status(400).json({
        success: false,
        error: '订单已支付完成'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '订单状态异常，无法继续支付'
      });
    }

    // 检查订单是否过期（超过15分钟）
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 15) {
      await sequelize.query(
        `UPDATE recharge_records SET status = 'expired' WHERE order_no = ?`,
        { replacements: [orderNo] }
      );
      return res.status(400).json({
        success: false,
        error: '订单已过期，请重新创建订单'
      });
    }

    const amount = parseFloat(order.amount_paid);
    const paymentMethod = order.payment_method;
    const remainingMinutes = Math.max(0, Math.floor(15 - diffMinutes));

    // 直接从数据库读取保存的支付链接，不需要重新创建
    const payUrl = order.pay_url || '';
    const codeUrl = order.code_url || '';

    console.log(`📌 读取订单支付链接: ${orderNo}, 微信codeUrl: ${codeUrl ? '有' : '无'}, 支付宝payUrl: ${payUrl ? '有' : '无'}`);

    // 返回订单信息和支付链接
    return res.json({
      success: true,
      data: {
        orderNo: order.order_no,
        amount: amount,
        bonusAmount: parseFloat(order.bonus_amount || 0),
        totalAmount: parseFloat(order.amount_received),
        paymentMethod: paymentMethod,
        status: order.status,
        createdAt: order.created_at,
        remainingMinutes: remainingMinutes,
        expireMinutes: remainingMinutes,
        payUrl: paymentMethod === 'alipay' ? payUrl : '',
        codeUrl: paymentMethod === 'wechat' ? codeUrl : ''
      }
    });
  } catch (error: any) {
    console.error('获取待支付订单失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取订单失败',
      details: error.message
    });
  }
};
