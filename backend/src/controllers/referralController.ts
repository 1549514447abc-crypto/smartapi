import { Request, Response } from 'express';
import { Op } from 'sequelize';
import UserReferral from '../models/UserReferral';
import Commission from '../models/Commission';
import User from '../models/User';

/**
 * 新的积分返利规则：
 * - 课程购买：10% 返积分
 * - 会员购买：10% 返积分
 * - 充值：不返积分
 * - 插件购买：不返积分
 */
const POINTS_COMMISSION_RATE = 10; // 固定10%返利比例

/**
 * 等级转佣金比例映射（旧系统，保留兼容）
 * @deprecated 使用 POINTS_COMMISSION_RATE 替代
 */
const getLevelCommissionRate = (level: number): number => {
  // 新规则：统一返10%积分
  return POINTS_COMMISSION_RATE;
};

/**
 * 检查并升级用户推广等级（只升不降）
 * @deprecated 新规则不再使用等级系统
 */
const checkAndUpgradeLevel = async (userId: number, totalReferrals: number): Promise<void> => {
  // 新规则下不再升级等级，但保留函数兼容性
  return;
};

/**
 * 获取推广统计数据
 */
export const getReferralStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    // 获取推广总人数
    const totalReferrals = await UserReferral.count({
      where: { referrer_id: userId }
    });

    // 获取已购课用户数（只统计课程和会员购买）
    const activeReferrals = await UserReferral.count({
      where: {
        referrer_id: userId,
        status: 'active'
      }
    });

    // 获取累计积分返利（只统计课程和会员购买）
    const totalPointsEarned = await Commission.sum('amount', {
      where: {
        referrer_id: userId,
        status: 'settled',
        source_type: ['course', 'membership']
      }
    });

    // 获取待结算积分
    const pendingPoints = await Commission.sum('amount', {
      where: {
        referrer_id: userId,
        status: 'pending',
        source_type: ['course', 'membership']
      }
    });

    // 新规则：固定10%返利比例
    const commission_rate = POINTS_COMMISSION_RATE;

    res.json({
      success: true,
      data: {
        total_referrals: totalReferrals,
        active_referrals: activeReferrals,
        total_commission: totalPointsEarned || 0, // 兼容前端字段名
        pending_commission: pendingPoints || 0,
        commission_rate: commission_rate,
        referral_level: 1, // 新规则不再使用等级
        // 新增字段
        total_points: user.points || 0,
        points_commission_rate: POINTS_COMMISSION_RATE
      }
    });
  } catch (error) {
    console.error('获取推广统计失败:', error);
    res.status(500).json({ success: false, message: '获取推广统计失败' });
  }
};

/**
 * 获取推广列表
 */
export const getReferralList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await UserReferral.findAndCountAll({
      where: { referrer_id: userId },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'username', 'nickname', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        referrals: rows,
        pagination: {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取推广列表失败:', error);
    res.status(500).json({ success: false, message: '获取推广列表失败' });
  }
};

/**
 * 获取佣金记录
 */
export const getCommissionList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Commission.findAndCountAll({
      where: { referrer_id: userId },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        commissions: rows,
        pagination: {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取佣金记录失败:', error);
    res.status(500).json({ success: false, message: '获取佣金记录失败' });
  }
};

/**
 * 处理注册时的推广码
 */
export const handleReferralRegistration = async (refereeId: number, referralCode: string): Promise<void> => {
  try {
    // 解码推广码获取推广人ID
    const decoded = atob(referralCode);
    const referrerId = parseInt(decoded.replace('ref_', ''));

    if (!referrerId || isNaN(referrerId)) {
      console.log('无效的推广码');
      return;
    }

    // 检查推广人是否存在
    const referrer = await User.findByPk(referrerId);
    if (!referrer) {
      console.log('推广人不存在');
      return;
    }

    // 检查是否已经存在推广关系
    const existing = await UserReferral.findOne({
      where: { referee_id: refereeId }
    });

    if (existing) {
      console.log('用户已有推广关系');
      return;
    }

    // 创建推广关系
    await UserReferral.create({
      referrer_id: referrerId,
      referee_id: refereeId,
      referral_code: referralCode,
      status: 'pending'
    });

    console.log(`推广关系创建成功: ${referrerId} -> ${refereeId}`);
  } catch (error) {
    console.error('处理推广码失败:', error);
  }
};

/**
 * 处理充值后的佣金结算
 */
export const handleRechargeCommission = async (userId: number, amount: number): Promise<Commission | undefined> => {
  try {
    // 查找推广关系
    const referral = await UserReferral.findOne({
      where: { referee_id: userId }
    });

    if (!referral) {
      return; // 没有推广关系
    }

    // 更新首次消费时间和状态
    if (!referral.first_purchase_at) {
      await referral.update({
        first_purchase_at: new Date(),
        status: 'active'
      });
    }

    // 更新总贡献金额
    await referral.increment('total_contribution', { by: amount });

    // 获取推广人信息
    const referrer = await User.findByPk(referral.referrer_id);
    if (!referrer) {
      console.error('推广人不存在');
      return undefined;
    }

    // 检查并升级推广人等级
    const totalReferrals = await UserReferral.count({
      where: { referrer_id: referral.referrer_id }
    });
    await checkAndUpgradeLevel(referral.referrer_id, totalReferrals);

    // 重新加载推广人信息（可能已升级）
    await referrer.reload();

    // 从用户表获取当前佣金比例
    const commissionRate = getLevelCommissionRate(referrer.referral_level);

    // 计算佣金金额
    const commissionAmount = (amount * commissionRate) / 100;

    // 创建佣金记录
    const commission = await Commission.create({
      referrer_id: referral.referrer_id,
      referee_id: userId,
      referral_id: referral.id,
      amount: commissionAmount,
      commission_rate: commissionRate,
      source_amount: amount,
      source_type: 'recharge',
      status: 'settled',
      settled_at: new Date()
    });

    // 更新推广人余额
    await User.increment('balance', {
      by: commissionAmount,
      where: { id: referral.referrer_id }
    });

    console.log(`佣金结算成功: ${commissionAmount} 元，等级: ${referrer.referral_level}, 比例: ${commissionRate}%`);
    return commission;
  } catch (error) {
    console.error('处理充值佣金失败:', error);
    return undefined;
  }
};

/**
 * 处理课程/会员购买后的积分返利（新规则）
 * 仅对课程和会员购买返10%积分
 * @param userId 购买用户ID
 * @param amount 购买金额
 * @param sourceType 来源类型 'course' | 'membership'
 * @param sourceId 来源记录ID（订单ID等）
 */
export const handlePurchasePointsCommission = async (
  userId: number,
  amount: number,
  sourceType: 'course' | 'membership',
  sourceId?: number
): Promise<Commission | undefined> => {
  try {
    // 查找推广关系
    const referral = await UserReferral.findOne({
      where: { referee_id: userId }
    });

    if (!referral) {
      console.log(`用户 ${userId} 没有推广关系，不返积分`);
      return undefined;
    }

    // 更新首次消费时间和状态
    if (!referral.first_purchase_at) {
      await referral.update({
        first_purchase_at: new Date(),
        status: 'active'
      });
    }

    // 更新总贡献金额
    await referral.increment('total_contribution', { by: amount });

    // 获取推广人信息
    const referrer = await User.findByPk(referral.referrer_id);
    if (!referrer) {
      console.error('推广人不存在');
      return undefined;
    }

    // 计算积分（固定10%）
    const pointsAmount = Math.floor((amount * POINTS_COMMISSION_RATE) / 100);

    // 创建佣金记录
    const commission = await Commission.create({
      referrer_id: referral.referrer_id,
      referee_id: userId,
      referral_id: referral.id,
      amount: pointsAmount,
      commission_rate: POINTS_COMMISSION_RATE,
      source_amount: amount,
      source_type: sourceType,
      source_id: sourceId || null,
      status: 'settled',
      settled_at: new Date(),
      notes: `${sourceType === 'course' ? '课程购买' : '会员购买'}返积分`
    });

    // 更新推广人积分（而不是余额）
    await User.increment('points', {
      by: pointsAmount,
      where: { id: referral.referrer_id }
    });

    console.log(`✅ 积分返利成功: 推广人 ${referral.referrer_id} 获得 ${pointsAmount} 积分 (来源: ${sourceType}, 金额: ¥${amount})`);
    return commission;
  } catch (error) {
    console.error('处理购买积分返利失败:', error);
    return undefined;
  }
};
