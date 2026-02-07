/**
 * 佣金服务 - 处理推荐码、佣金计算、结算等
 */

import User from '../models/User';
import UserReferral from '../models/UserReferral';
import Commission from '../models/Commission';
import SystemConfig from '../models/SystemConfig';
import UserCategory from '../models/UserCategory';
import sequelize from '../config/database';
import { Op, Transaction } from 'sequelize';

class CommissionService {
  /**
   * 生成唯一的6位推荐码
   */
  async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
    let code: string;
    let exists = true;

    // 尝试生成唯一码
    while (exists) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // 检查是否已存在
      const existing = await User.findOne({ where: { referral_code: code } });
      exists = !!existing;
    }

    return code!;
  }

  /**
   * 为用户生成推荐码（如果还没有）
   */
  async ensureUserReferralCode(userId: number): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.referral_code) {
      return user.referral_code;
    }

    const code = await this.generateReferralCode();
    await user.update({ referral_code: code });
    return code;
  }

  /**
   * 验证推荐码并返回推荐人信息
   */
  async validateReferralCode(code: string): Promise<User | null> {
    if (!code || code.length !== 6) {
      return null;
    }

    const referrer = await User.findOne({
      where: { referral_code: code.toUpperCase() }
    });

    return referrer;
  }

  /**
   * 在注册时绑定推荐关系
   */
  async bindReferral(
    newUserId: number,
    referralCode: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const referrer = await this.validateReferralCode(referralCode);
    if (!referrer) {
      return false;
    }

    // 不能自己推荐自己
    if (referrer.id === newUserId) {
      return false;
    }

    try {
      // 更新新用户的推荐人信息
      await User.update(
        {
          referred_by_user_id: referrer.id,
          referred_at: new Date()
        },
        {
          where: { id: newUserId },
          transaction
        }
      );

      // 创建推荐关系记录
      await UserReferral.create(
        {
          referrer_id: referrer.id,
          referee_id: newUserId,
          referral_code: referralCode.toUpperCase(),
          status: 'pending'
        },
        { transaction }
      );

      return true;
    } catch (error) {
      console.error('绑定推荐关系失败:', error);
      return false;
    }
  }

  /**
   * 老用户绑定推荐人
   * 限制条件：注册7天内 且 未消费过 且 尚未绑定推荐人
   */
  async bindReferrerForExistingUser(
    userId: number,
    referralCode: string
  ): Promise<{ success: boolean; message: string }> {
    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 检查是否已绑定推荐人
    if (user.referred_by_user_id) {
      return { success: false, message: '您已绑定推荐人，无法重复绑定' };
    }

    // 检查注册时间（7天内）
    const registerDate = new Date(user.created_at);
    const now = new Date();
    const daysSinceRegister = Math.floor((now.getTime() - registerDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceRegister > 7) {
      return { success: false, message: '仅支持注册7天内绑定推荐人' };
    }

    // 检查是否有消费记录
    const totalConsumed = Number(user.total_consumed || 0);
    if (totalConsumed > 0) {
      return { success: false, message: '已有消费记录，无法绑定推荐人' };
    }

    // 验证推荐码
    const referrer = await this.validateReferralCode(referralCode);
    if (!referrer) {
      return { success: false, message: '推荐码无效' };
    }

    // 不能自己推荐自己
    if (referrer.id === userId) {
      return { success: false, message: '不能填写自己的推荐码' };
    }

    // 开始绑定
    const transaction = await sequelize.transaction();
    try {
      // 更新用户的推荐人信息
      await User.update(
        {
          referred_by_user_id: referrer.id,
          referred_at: new Date()
        },
        {
          where: { id: userId },
          transaction
        }
      );

      // 创建推荐关系记录
      await UserReferral.create(
        {
          referrer_id: referrer.id,
          referee_id: userId,
          referral_code: referralCode.toUpperCase(),
          status: 'pending'
        },
        { transaction }
      );

      await transaction.commit();
      return { success: true, message: '绑定推荐人成功' };
    } catch (error) {
      await transaction.rollback();
      console.error('绑定推荐人失败:', error);
      return { success: false, message: '绑定失败，请稍后重试' };
    }
  }

  /**
   * 获取用户的推荐人信息
   */
  async getUserReferrer(userId: number): Promise<{ nickname: string; avatar?: string } | null> {
    const user = await User.findByPk(userId);
    if (!user || !user.referred_by_user_id) {
      return null;
    }

    const referrer = await User.findByPk(user.referred_by_user_id);
    if (!referrer) {
      return null;
    }

    return {
      nickname: referrer.nickname || referrer.username,
      avatar: referrer.avatar_url || undefined
    };
  }

  /**
   * 根据推荐人和订单类型获取佣金比例
   * 简化后的逻辑：用户分类 → user_categories 表（唯一来源）
   */
  async getCommissionRateForUser(
    referrer: User,
    orderType: 'course' | 'membership'
  ): Promise<number> {
    // 获取用户分类（默认 normal）
    const categoryKey = referrer.user_category || 'normal';

    // 查询分类的佣金比例
    const category = await UserCategory.findOne({
      where: {
        category_key: categoryKey,
        is_active: true
      }
    });

    if (!category) {
      // 如果分类不存在，尝试获取 normal 分类
      const normalCategory = await UserCategory.findOne({
        where: {
          category_key: 'normal',
          is_active: true
        }
      });

      if (!normalCategory) {
        console.error(`用户分类 ${categoryKey} 和默认分类 normal 都不存在，请运行 init-user-categories.js 初始化`);
        // 返回默认值 10%，避免系统崩溃
        return 0.10;
      }

      return orderType === 'course'
        ? Number(normalCategory.default_course_rate) / 100
        : Number(normalCategory.default_membership_rate) / 100;
    }

    // 返回对应比例
    return orderType === 'course'
      ? Number(category.default_course_rate) / 100
      : Number(category.default_membership_rate) / 100;
  }

  /**
   * 订单支付成功后计算并记录佣金
   * @param userId 付款用户ID
   * @param orderAmount 订单金额
   * @param orderType 订单类型
   * @param orderId 订单ID（可选）
   * @param transaction 事务（可选）
   */
  async createCommission(
    userId: number,
    orderAmount: number,
    orderType: 'recharge' | 'consume' | 'course' | 'membership',
    orderId?: number,
    transaction?: Transaction
  ): Promise<Commission | null> {
    // 获取用户的推荐人
    const user = await User.findByPk(userId);
    if (!user || !user.referred_by_user_id) {
      return null; // 没有推荐人，不计算佣金
    }

    // 获取推荐人信息
    const referrer = await User.findByPk(user.referred_by_user_id);
    if (!referrer) {
      return null;
    }

    // 获取推荐关系
    const referral = await UserReferral.findOne({
      where: {
        referrer_id: user.referred_by_user_id,
        referee_id: userId
      }
    });

    if (!referral) {
      return null;
    }

    // 获取佣金比例（统一从 user_categories 表获取）
    let commissionRate: number;
    if (orderType === 'course' || orderType === 'membership') {
      commissionRate = await this.getCommissionRateForUser(referrer, orderType);
    } else {
      // recharge 和 consume 类型也使用课程佣金比例
      commissionRate = await this.getCommissionRateForUser(referrer, 'course');
    }

    const commissionAmount = Number((orderAmount * commissionRate).toFixed(4));

    if (commissionAmount <= 0) {
      return null;
    }

    try {
      // 创建佣金记录（待结算状态，15天后自动转为可提现）
      const commission = await Commission.create(
        {
          referrer_id: user.referred_by_user_id,
          referee_id: userId,
          referral_id: referral.id,
          amount: commissionAmount,
          commission_rate: commissionRate * 100, // 存储为百分比
          source_amount: orderAmount,
          source_type: orderType,
          source_id: orderId || null,
          status: 'pending', // 待结算（15天后自动转为settled）
          settled_at: null
        },
        { transaction }
      );

      // 注意：佣金不会立即到账，需要等待15天结算周期
      // 更新推荐人的待结算佣金余额和累计获得佣金
      await User.increment(
        {
          pending_commission_balance: commissionAmount,  // 待结算余额增加
          total_commission_earned: commissionAmount       // 累计获得增加
        },
        {
          where: { id: user.referred_by_user_id },
          transaction
        }
      );

      // 更新推荐关系的贡献金额
      await UserReferral.increment(
        { total_contribution: orderAmount },
        {
          where: { id: referral.id },
          transaction
        }
      );

      // 如果是首次消费，更新推荐关系状态
      if (referral.status === 'pending') {
        await referral.update(
          {
            status: 'active',
            first_purchase_at: new Date()
          },
          { transaction }
        );
      }

      console.log(`佣金已计算: 用户${userId}消费${orderAmount}元, 推荐人${user.referred_by_user_id}获得佣金${commissionAmount}元`);

      return commission;
    } catch (error) {
      console.error('创建佣金记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的推荐统计
   */
  async getUserReferralStats(userId: number): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalCommission: number;
    pendingCommission: number;
    availableBalance: number;
    pendingBalance: number;  // 待结算余额
    totalEarned: number;     // 累计获得佣金
    totalWithdrawn: number;  // 累计提现佣金
    commissionRate: number;
    commissionRateCourse: number;
    commissionRateMembership: number;
    settleMinutes: number;   // 结算周期（分钟）
  }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 统计推荐人数
    const totalReferrals = await UserReferral.count({
      where: { referrer_id: userId }
    });

    const activeReferrals = await UserReferral.count({
      where: {
        referrer_id: userId,
        status: 'active'
      }
    });

    // 统计佣金
    const commissions = await Commission.findAll({
      where: { referrer_id: userId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('SUM',
          sequelize.literal("CASE WHEN status = 'pending' THEN amount ELSE 0 END")
        ), 'pending']
      ],
      raw: true
    }) as any;

    // 获取用户的实际佣金比例（基于用户分类和自定义设置）
    const courseRateDecimal = await this.getCommissionRateForUser(user, 'course');
    const membershipRateDecimal = await this.getCommissionRateForUser(user, 'membership');
    const courseRate = courseRateDecimal * 100; // 转换为百分比
    const membershipRate = membershipRateDecimal * 100; // 转换为百分比

    // 获取结算周期配置（分钟）
    let settleMinutes = 15 * 24 * 60; // 默认15天
    try {
      const config = await SystemConfig.findOne({
        where: { config_key: 'commission_settle_minutes' }
      });
      if (config && config.config_value) {
        const minutes = parseInt(config.config_value);
        if (!isNaN(minutes) && minutes >= 0) {
          settleMinutes = minutes;
        }
      }
    } catch (error) {
      console.error('获取结算周期配置失败:', error);
    }

    return {
      totalReferrals,
      activeReferrals,
      totalCommission: parseFloat(commissions[0]?.total || '0'),
      pendingCommission: parseFloat(commissions[0]?.pending || '0'),
      availableBalance: parseFloat(String(user.commission_balance)) || 0,  // 可提现余额
      pendingBalance: parseFloat(String(user.pending_commission_balance)) || 0,  // 待结算余额
      totalEarned: parseFloat(String(user.total_commission_earned)) || 0,  // 累计获得
      totalWithdrawn: parseFloat(String(user.total_commission_withdrawn)) || 0,  // 累计提现
      commissionRate: courseRate, // 使用课程佣金作为通用佣金
      commissionRateCourse: courseRate,
      commissionRateMembership: membershipRate,
      settleMinutes
    };
  }

  /**
   * 获取用户的推荐列表
   */
  async getUserReferrals(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    list: any[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await UserReferral.findAndCountAll({
      where: { referrer_id: userId },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'username', 'nickname', 'avatar_url', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    return {
      list: rows.map(r => ({
        id: r.id,
        user: r.referee,
        status: r.status,
        totalContribution: r.total_contribution,
        firstPurchaseAt: r.first_purchase_at,
        createdAt: r.created_at
      })),
      total: count
    };
  }

  /**
   * 获取用户的佣金记录
   */
  async getUserCommissions(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    list: any[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Commission.findAndCountAll({
      where: { referrer_id: userId },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'username', 'nickname', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    return {
      list: rows.map(c => ({
        id: c.id,
        user: c.referee,
        amount: c.amount,
        sourceAmount: c.source_amount,
        sourceType: c.source_type,
        commissionRate: c.commission_rate,
        status: c.status,
        settledAt: c.settled_at,
        createdAt: c.created_at
      })),
      total: count
    };
  }
}

export default new CommissionService();
