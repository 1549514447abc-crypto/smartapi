import { Request, Response } from 'express';
import User from '../models/User';
import CourseOrder from '../models/CourseOrder';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import { successResponse, errorResponse } from '../utils/response';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import AlipayService from '../services/AlipayService';
import WechatPayService from '../services/WechatPayService';
import supabaseService from '../services/SupabaseService';
import commissionService from '../services/CommissionService';

/**
 * 生成订单号
 */
const generateOrderNo = (prefix: string = 'PAY'): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${timeStr}${randomNum}`;
};

/**
 * 获取商品价格（从系统配置）
 */
const getProductPrice = async (productType: 'membership' | 'course'): Promise<number> => {
  if (productType === 'membership') {
    return await SystemConfig.getNumberConfig(ConfigKey.YEARLY_MEMBERSHIP_PRICE) || 299;
  } else if (productType === 'course') {
    return await SystemConfig.getNumberConfig(ConfigKey.COURSE_PRICE) || 799;
  }
  return 0;
};

/**
 * 处理充值订单支付成功（RC开头的订单）
 * 充值订单存储在 recharge_records 表中
 */
const handleRechargeOrderSuccess = async (orderNo: string, paymentMethod: string): Promise<boolean> => {
  const transaction = await sequelize.transaction();

  try {
    // 查询充值订单
    const rechargeOrders: any[] = await sequelize.query(
      `SELECT * FROM recharge_records WHERE order_no = ?`,
      {
        replacements: [orderNo],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!rechargeOrders || rechargeOrders.length === 0) {
      console.error(`❌ 充值订单不存在: ${orderNo}`);
      await transaction.rollback();
      return false;
    }

    const order = rechargeOrders[0];

    // 检查订单状态
    if (order.status !== 'pending') {
      console.log(`充值订单 ${orderNo} 状态为 ${order.status}，无需处理`);
      await transaction.rollback();
      return order.status === 'success'; // 如果已成功，返回true
    }

    // 查询用户
    const user = await User.findByPk(order.user_id, { transaction });
    if (!user) {
      console.error(`❌ 用户不存在: ${order.user_id}`);
      await transaction.rollback();
      return false;
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
           payment_method = ?,
           balance_after = ?,
           completed_at = NOW()
       WHERE order_no = ?`,
      {
        replacements: [paymentMethod, totalBalanceAfter, orderNo],
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

    // 4. 异步同步到 Supabase（不阻塞）
    supabaseService.syncBalance(order.user_id, totalBalanceAfter).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    console.log(`✅ 充值订单成功: 用户 ${order.user_id}, 订单 ${orderNo}, 充值金: ¥${newBalance}, 赠金: ¥${newBonusBalance}`);

    // 计算佣金（充值产生佣金）
    try {
      await commissionService.createCommission(
        order.user_id,
        amountPaid,
        'recharge'
      );
    } catch (commErr) {
      console.error('计算充值佣金失败:', commErr);
    }

    return true;

  } catch (error) {
    await transaction.rollback();
    console.error(`❌ 处理充值订单 ${orderNo} 失败:`, error);
    throw error;
  }
};

/**
 * 余额支付
 */
export const payByBalance = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user?.userId;
    const { productType } = req.body;

    if (!userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    if (!productType || !['membership', 'course'].includes(productType)) {
      errorResponse(res, '参数错误', 400);
      return;
    }

    // 从系统配置获取正确价格（不信任前端传入的金额）
    const amount = await getProductPrice(productType);
    if (amount <= 0) {
      errorResponse(res, '商品价格配置错误', 500);
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 检查余额（充值金 + 赠金）
    const currentBalance = Number(user.balance) || 0;
    const currentBonusBalance = Number(user.bonus_balance) || 0;
    const totalBalance = currentBalance + currentBonusBalance;

    if (totalBalance < amount) {
      await transaction.rollback();
      errorResponse(res, `余额不足，当前余额: ¥${totalBalance.toFixed(2)}`, 400);
      return;
    }

    // 扣款逻辑：先扣充值金，不足时再扣赠金
    let remainingAmount = amount;
    let newBalance = currentBalance;
    let newBonusBalance = currentBonusBalance;

    if (currentBalance >= remainingAmount) {
      // 充值金足够，全部从充值金扣除
      newBalance = currentBalance - remainingAmount;
    } else {
      // 充值金不够，先扣完充值金，再扣赠金
      remainingAmount -= currentBalance;
      newBalance = 0;
      newBonusBalance = currentBonusBalance - remainingAmount;
    }

    // 扣除余额
    await user.update({
      balance: newBalance,
      bonus_balance: newBonusBalance,
      total_consumed: Number(user.total_consumed || 0) + amount
    }, { transaction });

    // 生成订单号
    const orderNo = generateOrderNo('BAL');

    // 获取商品名称
    const productName = productType === 'membership' ? '创作魔方-年度会员' : '创作魔方-AI自动化工作流实战课';

    // 记录余额变动日志
    const balanceDeduction = currentBalance - newBalance; // 充值金扣除金额
    const bonusDeduction = currentBonusBalance - newBonusBalance; // 赠金扣除金额
    const description = bonusDeduction > 0
      ? `余额支付: ${productName} (充值金 ¥${balanceDeduction.toFixed(2)} + 赠金 ¥${bonusDeduction.toFixed(2)})`
      : `余额支付: ${productName}`;

    await sequelize.query(
      `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
       VALUES (?, 'consumption', ?, ?, ?, 'balance_payment', ?, ?, NOW())`,
      {
        replacements: [
          userId,
          -amount,
          currentBalance,
          newBalance,
          productType,
          description
        ],
        transaction
      }
    );

    // 根据商品类型更新用户权益
    // 年度会员和课程学员是两个独立的身份，不互相覆盖
    if (productType === 'membership') {
      // 购买年度会员：只更新 membership_type 和 membership_expiry
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      // 如果当前会员到期时间更晚，保留当前的
      const currentExpiry = user.membership_expiry ? new Date(user.membership_expiry) : new Date(0);
      const finalExpiry = currentExpiry > newExpiryDate ? currentExpiry : newExpiryDate;

      await user.update({
        membership_type: 'yearly',
        membership_expiry: finalExpiry
      }, { transaction });
    } else if (productType === 'course') {
      // 购买课程：只设置 is_course_student = true
      // 不改变年度会员状态（membership_type 和 membership_expiry）
      await user.update({
        is_course_student: true
      }, { transaction });

      // 创建课程订单记录
      await CourseOrder.create({
        order_no: orderNo,
        user_id: userId,
        course_title: 'AI自动化工作流实战课',
        amount: amount,
        status: 'completed'
      }, { transaction });
    }

    await transaction.commit();

    // 同步余额到 Supabase（异步，不阻塞）
    const totalBalanceAfter = newBalance + newBonusBalance;
    supabaseService.syncBalance(userId, totalBalanceAfter).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    // 计算佣金（余额支付产生佣金）
    try {
      await commissionService.createCommission(
        userId,
        amount,
        productType as 'course' | 'membership'
      );
    } catch (commErr) {
      console.error('计算余额支付佣金失败:', commErr);
    }

    successResponse(res, {
      orderNo,
      message: '支付成功'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Balance payment error:', error);
    errorResponse(res, error.message || '支付失败', 500);
  }
};

/**
 * 支付宝异步通知回调
 * POST /api/payment/alipay/notify
 * 只处理充值订单（RC开头）
 */
export const alipayNotify = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.body;
    console.log('📨 收到支付宝异步通知:', JSON.stringify(params));

    // 验证签名
    const isValid = await AlipayService.verifyNotify(params);
    if (!isValid) {
      console.error('❌ 支付宝通知验签失败');
      res.send('fail');
      return;
    }

    const { out_trade_no, trade_status } = params;

    // 处理支付结果
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      // 只处理充值订单（RC开头）
      if (out_trade_no.startsWith('RC')) {
        try {
          const success = await handleRechargeOrderSuccess(out_trade_no, 'alipay');
          if (success) {
            console.log(`✅ 充值订单 ${out_trade_no} 支付成功`);
            res.send('success');
          } else {
            console.error(`❌ 充值订单 ${out_trade_no} 处理失败`);
            res.send('fail');
          }
        } catch (error) {
          console.error(`❌ 处理充值订单 ${out_trade_no} 异常:`, error);
          res.send('fail');
        }
        return;
      }

      // 非 RC 开头的订单，记录日志但返回成功（避免支付宝重试）
      console.log(`⚠️ 收到非充值订单通知: ${out_trade_no}，忽略处理`);
      res.send('success');
    } else {
      console.log(`订单 ${out_trade_no} 状态: ${trade_status}`);
      res.send('success');
    }
  } catch (error: any) {
    console.error('Alipay notify error:', error);
    res.send('fail');
  }
};

/**
 * 支付宝同步返回
 * GET /api/payment/alipay/return
 */
export const alipayReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.query as Record<string, string>;
    console.log('📨 收到支付宝同步返回:', params);

    const { out_trade_no } = params;

    // 重定向到前端结果页
    const returnUrl = AlipayService.getConfig()?.returnUrl || 'https://contentcube.cn/smartapi/payment/result';

    res.redirect(`${returnUrl}?orderNo=${out_trade_no}&status=pending`);
  } catch (error: any) {
    console.error('Alipay return error:', error);
    res.redirect('https://contentcube.cn/smartapi/payment/result?status=error');
  }
};

/**
 * 检查支付宝服务状态
 * GET /api/payment/alipay/status
 */
export const getAlipayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAvailable = await AlipayService.isAvailable();

    successResponse(res, {
      available: isAvailable,
      channel: 'alipay',
      enabled: isAvailable
    });
  } catch (error: any) {
    errorResponse(res, error.message || '检查失败', 500);
  }
};

/**
 * 微信支付异步通知回调
 * POST /api/payment/wechat/notify
 * 只处理充值订单（RC开头）
 */
export const wechatNotify = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['wechatpay-signature'] as string;
    const serial = req.headers['wechatpay-serial'] as string;
    const timestamp = req.headers['wechatpay-timestamp'] as string;
    const nonce = req.headers['wechatpay-nonce'] as string;

    console.log('📨 收到微信支付异步通知');

    // 解密通知内容
    const decrypted = await WechatPayService.verifyAndDecryptNotify(
      signature,
      serial,
      timestamp,
      nonce,
      req.body
    );

    console.log('📨 微信通知解密结果:', JSON.stringify(decrypted));

    const { out_trade_no, trade_state } = decrypted;

    // 处理支付结果
    if (trade_state === 'SUCCESS') {
      // 只处理充值订单（RC开头）
      if (out_trade_no.startsWith('RC')) {
        try {
          const success = await handleRechargeOrderSuccess(out_trade_no, 'wechat');
          if (success) {
            console.log(`✅ 微信充值订单 ${out_trade_no} 支付成功`);
            res.status(200).json({ code: 'SUCCESS', message: '成功' });
          } else {
            console.error(`❌ 微信充值订单 ${out_trade_no} 处理失败`);
            res.status(500).json({ code: 'FAIL', message: '处理失败' });
          }
        } catch (error) {
          console.error(`❌ 处理微信充值订单 ${out_trade_no} 异常:`, error);
          res.status(500).json({ code: 'FAIL', message: '处理失败' });
        }
        return;
      }

      // 非 RC 开头的订单，记录日志但返回成功（避免微信重试）
      console.log(`⚠️ 收到非充值订单通知: ${out_trade_no}，忽略处理`);
      res.status(200).json({ code: 'SUCCESS', message: '成功' });
    } else {
      console.log(`订单 ${out_trade_no} 状态: ${trade_state}`);
      res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }
  } catch (error: any) {
    console.error('WeChat notify error:', error);
    res.status(500).json({ code: 'FAIL', message: error.message || '处理失败' });
  }
};

/**
 * 检查微信支付服务状态
 * GET /api/payment/wechat/status
 */
export const getWechatStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAvailable = await WechatPayService.isAvailable();

    successResponse(res, {
      available: isAvailable,
      channel: 'wechat',
      enabled: isAvailable
    });
  } catch (error: any) {
    errorResponse(res, error.message || '检查失败', 500);
  }
};

/**
 * 获取会员升级价格（年度会员升级为课程会员）
 * GET /api/payment/upgrade-price
 * 公开接口，无需登录
 */
export const getUpgradePrice = async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取当前价格配置
    const yearlyPrice = await SystemConfig.getNumberConfig(ConfigKey.YEARLY_MEMBERSHIP_PRICE) || 299;
    const coursePrice = await SystemConfig.getNumberConfig(ConfigKey.COURSE_PRICE) || 799;
    const courseOriginalPrice = await SystemConfig.getNumberConfig(ConfigKey.COURSE_ORIGINAL_PRICE) || 1299;

    // 计算升级差价
    const upgradePrice = Math.max(0, coursePrice - yearlyPrice);

    // 计算节省金额（相比直接购买课程会员）
    const savedAmount = coursePrice - upgradePrice;

    successResponse(res, {
      yearlyMembershipPrice: yearlyPrice,      // 年度会员价格
      coursePrice: coursePrice,                 // 课程会员价格
      courseOriginalPrice: courseOriginalPrice, // 课程原价
      upgradePrice: upgradePrice,               // 升级差价
      savedAmount: savedAmount,                 // 节省金额
      description: `年度会员补差价 ¥${upgradePrice} 即可升级为课程会员`
    });
  } catch (error: any) {
    console.error('Get upgrade price error:', error);
    errorResponse(res, '获取升级价格失败', 500);
  }
};

/**
 * 年度会员升级为课程会员（余额支付）
 * POST /api/payment/upgrade-to-course
 * 需要登录
 */
export const upgradeToCourse = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 检查是否已是课程会员
    if (user.is_course_student) {
      await transaction.rollback();
      errorResponse(res, '您已经是课程会员，无需升级', 400);
      return;
    }

    // 检查是否是有效的年度会员
    const isYearlyMember = user.membership_type === 'yearly';
    const membershipExpiry = user.membership_expiry ? new Date(user.membership_expiry) : null;
    const isExpired = !membershipExpiry || membershipExpiry < new Date();

    if (!isYearlyMember || isExpired) {
      await transaction.rollback();
      errorResponse(res, '仅限有效期内的年度会员可升级，请先购买年度会员', 400);
      return;
    }

    // 获取价格配置并计算升级差价
    const yearlyPrice = await SystemConfig.getNumberConfig(ConfigKey.YEARLY_MEMBERSHIP_PRICE) || 299;
    const coursePrice = await SystemConfig.getNumberConfig(ConfigKey.COURSE_PRICE) || 799;
    const upgradePrice = Math.max(0, coursePrice - yearlyPrice);

    // 检查余额（充值金 + 赠金）
    const currentBalance = Number(user.balance) || 0;
    const currentBonusBalance = Number(user.bonus_balance) || 0;
    const totalBalance = currentBalance + currentBonusBalance;

    if (totalBalance < upgradePrice) {
      await transaction.rollback();
      errorResponse(res, `余额不足，升级需要 ¥${upgradePrice.toFixed(2)}，当前余额 ¥${totalBalance.toFixed(2)}`, 400);
      return;
    }

    // 扣款逻辑：先扣充值金，不足时再扣赠金
    let remainingAmount = upgradePrice;
    let newBalance = currentBalance;
    let newBonusBalance = currentBonusBalance;

    if (currentBalance >= remainingAmount) {
      newBalance = currentBalance - remainingAmount;
    } else {
      remainingAmount -= currentBalance;
      newBalance = 0;
      newBonusBalance = currentBonusBalance - remainingAmount;
    }

    // 生成订单号
    const orderNo = generateOrderNo('UPG');

    // 扣除余额并升级会员
    await user.update({
      balance: newBalance,
      bonus_balance: newBonusBalance,
      total_consumed: Number(user.total_consumed || 0) + upgradePrice,
      is_course_student: true,
      membership_type: 'course'  // 升级后会员类型变为 course
    }, { transaction });

    // 记录余额变动日志
    const balanceDeduction = currentBalance - newBalance;
    const bonusDeduction = currentBonusBalance - newBonusBalance;
    const description = bonusDeduction > 0
      ? `会员升级: 年度会员升级为课程会员 (充值金 ¥${balanceDeduction.toFixed(2)} + 赠金 ¥${bonusDeduction.toFixed(2)})`
      : `会员升级: 年度会员升级为课程会员`;

    await sequelize.query(
      `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
       VALUES (?, 'consumption', ?, ?, ?, 'balance_payment', 'upgrade', ?, NOW())`,
      {
        replacements: [
          userId,
          -upgradePrice,
          currentBalance,
          newBalance,
          description
        ],
        transaction
      }
    );

    // 创建课程订单记录
    await CourseOrder.create({
      order_no: orderNo,
      user_id: userId,
      course_title: 'AI自动化工作流实战课（升级）',
      amount: upgradePrice,
      status: 'completed'
    }, { transaction });

    await transaction.commit();

    // 同步余额到 Supabase（异步，不阻塞）
    const totalBalanceAfter = newBalance + newBonusBalance;
    supabaseService.syncBalance(userId, totalBalanceAfter).catch(err => {
      console.error('Supabase 同步余额失败:', err);
    });

    // 计算佣金
    try {
      await commissionService.createCommission(
        userId,
        upgradePrice,
        'course'
      );
    } catch (commErr) {
      console.error('计算升级佣金失败:', commErr);
    }

    console.log(`✅ 会员升级成功: 用户 ${userId}, 订单 ${orderNo}, 升级费用 ¥${upgradePrice}`);

    successResponse(res, {
      orderNo,
      upgradePrice,
      message: '升级成功，您已成为课程会员'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Upgrade to course error:', error);
    errorResponse(res, error.message || '升级失败', 500);
  }
};
