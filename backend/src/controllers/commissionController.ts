/**
 * 佣金控制器 - 处理佣金相关的API请求
 */

import { Request, Response } from 'express';
import commissionService from '../services/CommissionService';
import { successResponse, errorResponse } from '../utils/response';
import User from '../models/User';
import WithdrawalRequest from '../models/WithdrawalRequest';
import WithdrawalTransfer from '../models/WithdrawalTransfer';
import CommissionSetting from '../models/CommissionSetting';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import sequelize from '../config/database';
import { Op } from 'sequelize';

/**
 * 获取用户的推荐码
 * GET /api/commission/referral-code
 */
export const getReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const code = await commissionService.ensureUserReferralCode(req.user.userId);

    successResponse(res, {
      referralCode: code,
      shareUrl: `${process.env.FRONTEND_URL || 'https://contentcube.cn'}/?ref=${code}`
    }, '获取成功');
  } catch (error: any) {
    console.error('获取推荐码失败:', error);
    errorResponse(res, '获取推荐码失败', 500, error.message);
  }
};

/**
 * 获取用户的推荐统计
 * GET /api/commission/stats
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const stats = await commissionService.getUserReferralStats(req.user.userId);

    successResponse(res, stats, '获取成功');
  } catch (error: any) {
    console.error('获取推荐统计失败:', error);
    errorResponse(res, '获取推荐统计失败', 500, error.message);
  }
};

/**
 * 获取用户的推荐列表
 * GET /api/commission/referrals
 */
export const getReferrals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await commissionService.getUserReferrals(req.user.userId, page, limit);

    successResponse(res, {
      list: result.list,
      pagination: {
        page,
        limit,
        total: result.total
      }
    }, '获取成功');
  } catch (error: any) {
    console.error('获取推荐列表失败:', error);
    errorResponse(res, '获取推荐列表失败', 500, error.message);
  }
};

/**
 * 获取用户的佣金记录
 * GET /api/commission/records
 */
export const getCommissionRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await commissionService.getUserCommissions(req.user.userId, page, limit);

    successResponse(res, {
      list: result.list,
      pagination: {
        page,
        limit,
        total: result.total
      }
    }, '获取成功');
  } catch (error: any) {
    console.error('获取佣金记录失败:', error);
    errorResponse(res, '获取佣金记录失败', 500, error.message);
  }
};

/**
 * 获取提现配置
 * GET /api/commission/withdrawal-config
 */
export const getWithdrawalConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const minAmount = await SystemConfig.getNumberConfig(ConfigKey.MIN_WITHDRAWAL_AMOUNT);
    const maxDaily = await SystemConfig.getNumberConfig(ConfigKey.MAX_DAILY_WITHDRAWAL);
    const maxSingle = await SystemConfig.getNumberConfig(ConfigKey.MAX_SINGLE_TRANSFER);

    successResponse(res, {
      minWithdrawalAmount: minAmount,
      maxDailyWithdrawal: maxDaily,
      maxSingleTransfer: maxSingle
    }, '获取成功');
  } catch (error: any) {
    console.error('获取提现配置失败:', error);
    errorResponse(res, '获取提现配置失败', 500, error.message);
  }
};

/**
 * 申请提现
 * POST /api/commission/withdraw
 */
export const requestWithdrawal = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      errorResponse(res, '请输入有效的提现金额', 400);
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 检查是否绑定了微信
    if (!user.wechat_openid) {
      errorResponse(res, '请先绑定微信账号', 400);
      return;
    }

    // 检查余额是否足够
    const availableBalance = parseFloat(String(user.commission_balance)) || 0;
    if (amount > availableBalance) {
      errorResponse(res, '余额不足', 400);
      return;
    }

    // 检查最低提现金额
    const minAmount = await SystemConfig.getNumberConfig(ConfigKey.MIN_WITHDRAWAL_AMOUNT);
    if (amount < minAmount) {
      errorResponse(res, `最低提现金额为${minAmount}元`, 400);
      return;
    }

    // 检查今日提现额度
    const maxDaily = await SystemConfig.getNumberConfig(ConfigKey.MAX_DAILY_WITHDRAWAL);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawn = await WithdrawalRequest.sum('amount', {
      where: {
        user_id: user.id,
        created_at: { [Op.gte]: today },
        status: { [Op.notIn]: ['rejected', 'failed'] }
      }
    }) || 0;

    if (todayWithdrawn + amount > maxDaily) {
      errorResponse(res, `今日提现额度剩余${maxDaily - todayWithdrawn}元`, 400);
      return;
    }

    // 检查是否有未完成的提现申请
    const pendingRequest = await WithdrawalRequest.findOne({
      where: {
        user_id: user.id,
        status: { [Op.in]: ['pending', 'approved', 'processing'] }
      }
    });

    if (pendingRequest) {
      errorResponse(res, '您有未完成的提现申请，请等待处理完成', 400);
      return;
    }

    // 开启事务
    const transaction = await sequelize.transaction();

    try {
      // 创建提现申请
      const withdrawal = await WithdrawalRequest.create({
        user_id: user.id,
        amount,
        openid: user.wechat_openid,
        status: 'pending'
      }, { transaction });

      // 扣减佣金余额（冻结）
      await User.decrement(
        { commission_balance: amount },
        {
          where: { id: user.id },
          transaction
        }
      );

      await transaction.commit();

      successResponse(res, {
        withdrawalId: withdrawal.id,
        amount,
        status: 'pending',
        message: '提现申请已提交，请等待审核'
      }, '申请成功');
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('申请提现失败:', error);
    errorResponse(res, '申请提现失败', 500, error.message);
  }
};

/**
 * 获取提现记录
 * GET /api/commission/withdrawals
 */
export const getWithdrawals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where: { user_id: req.user.userId },
      include: [
        {
          model: WithdrawalTransfer,
          as: 'transfers',
          attributes: ['id', 'package_info', 'batch_status', 'status', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    successResponse(res, {
      list: rows.map(w => {
        // 查找需要用户确认收款的转账记录
        const pendingTransfer = (w as any).transfers?.find(
          (t: any) => t.batch_status === 'WAIT_USER_CONFIRM' && t.package_info
        );

        return {
          id: w.id,
          amount: w.amount,
          status: w.status,
          rejectReason: w.reject_reason,
          successAmount: w.success_amount,
          failAmount: w.fail_amount,
          createdAt: w.created_at,
          reviewedAt: w.reviewed_at,
          // 新版本：如果需要用户确认收款，返回 package_info 和转账创建时间
          packageInfo: pendingTransfer?.package_info,
          transferCreatedAt: pendingTransfer?.created_at // 转账创建时间，用于计算过期倒计时
        };
      }),
      pagination: {
        page,
        limit,
        total: count
      },
      // 微信支付配置（用于确认收款JSAPI）
      wechatConfig: {
        mchId: process.env.WECHAT_MCH_ID || '',
        appId: process.env.WECHAT_APP_ID || ''
      }
    }, '获取成功');
  } catch (error: any) {
    console.error('获取提现记录失败:', error);
    errorResponse(res, '获取提现记录失败', 500, error.message);
  }
};

/**
 * 验证推荐码是否有效
 * GET /api/commission/validate-code/:code
 */
export const validateReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const referrer = await commissionService.validateReferralCode(code);

    if (!referrer) {
      successResponse(res, { valid: false }, '推荐码无效');
      return;
    }

    successResponse(res, {
      valid: true,
      referrer: {
        nickname: referrer.nickname || referrer.username,
        avatar: referrer.avatar_url
      }
    }, '推荐码有效');
  } catch (error: any) {
    console.error('验证推荐码失败:', error);
    errorResponse(res, '验证推荐码失败', 500, error.message);
  }
};

/**
 * 获取用户的推荐人信息
 * GET /api/commission/referrer
 */
export const getReferrer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const referrer = await commissionService.getUserReferrer(req.user.userId);

    successResponse(res, {
      hasReferrer: !!referrer,
      referrer
    }, '获取成功');
  } catch (error: any) {
    console.error('获取推荐人信息失败:', error);
    errorResponse(res, '获取推荐人信息失败', 500, error.message);
  }
};

/**
 * 绑定推荐人
 * POST /api/commission/bind-referrer
 */
export const bindReferrer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { referralCode } = req.body;

    if (!referralCode || typeof referralCode !== 'string') {
      errorResponse(res, '请输入推荐码', 400);
      return;
    }

    const result = await commissionService.bindReferrerForExistingUser(
      req.user.userId,
      referralCode.trim()
    );

    if (result.success) {
      successResponse(res, null, result.message);
    } else {
      errorResponse(res, result.message, 400);
    }
  } catch (error: any) {
    console.error('绑定推荐人失败:', error);
    errorResponse(res, '绑定推荐人失败', 500, error.message);
  }
};

/**
 * 刷新提现转账状态
 * POST /api/commission/withdrawals/:id/refresh
 *
 * 用户确认收款后，前端调用此接口主动查询微信转账状态并更新
 */
export const refreshWithdrawalStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { id } = req.params;

    // 查找提现记录
    const withdrawal = await WithdrawalRequest.findOne({
      where: { id, user_id: req.user.userId }
    });

    if (!withdrawal) {
      errorResponse(res, '提现记录不存在', 404);
      return;
    }

    // 只有 processing 状态才需要刷新
    if (withdrawal.status !== 'processing') {
      successResponse(res, { status: withdrawal.status }, '状态无需刷新');
      return;
    }

    // 查找等待确认的转账记录
    const pendingTransfers = await WithdrawalTransfer.findAll({
      where: {
        withdrawal_id: id,
        batch_status: 'WAIT_USER_CONFIRM'
      }
    });

    if (pendingTransfers.length === 0) {
      successResponse(res, { status: withdrawal.status }, '没有待确认的转账');
      return;
    }

    // 导入微信转账服务
    const WechatTransferService = (await import('../services/WechatTransferService')).default;

    let updatedCount = 0;
    let successAmount = Number(withdrawal.success_amount) || 0;
    let successCount = Number(withdrawal.success_count) || 0;

    for (const transfer of pendingTransfers) {
      try {
        // 查询微信转账状态
        const result = await WechatTransferService.queryTransfer(transfer.out_batch_no);
        console.log(`[刷新状态] 转账 ${transfer.out_batch_no} 状态:`, result.state);

        if (result.state === 'SUCCESS') {
          // 转账成功
          await transfer.update({
            status: 'success',
            batch_status: 'SUCCESS',
            transferred_at: new Date()
          });
          successAmount += Number(transfer.amount);
          successCount++;
          updatedCount++;
        } else if (result.state === 'FAIL' || result.state === 'CANCELLED') {
          // 转账失败或已撤销，返还佣金
          await transfer.update({
            status: 'failed',
            batch_status: result.state,
            fail_reason: result.fail_reason || '转账失败'
          });
          // 返还佣金
          await User.increment(
            { commission_balance: Number(transfer.amount) },
            { where: { id: withdrawal.user_id } }
          );
          updatedCount++;
        }
        // 其他状态（WAIT_USER_CONFIRM, TRANSFERING 等）保持不变
      } catch (queryError: any) {
        console.error(`[刷新状态] 查询转账 ${transfer.out_batch_no} 失败:`, queryError.message);
      }
    }

    // 重新统计状态
    const allTransfers = await WithdrawalTransfer.findAll({
      where: { withdrawal_id: id }
    });

    const successTransfers = allTransfers.filter(t => t.status === 'success');
    const failedTransfers = allTransfers.filter(t => t.status === 'failed');
    const pendingCount = allTransfers.filter(t =>
      t.status === 'processing' || t.batch_status === 'WAIT_USER_CONFIRM'
    ).length;

    // 计算最终状态
    let finalStatus: string = withdrawal.status;
    const totalSuccessAmount = successTransfers.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalFailAmount = failedTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

    if (pendingCount === 0) {
      // 没有待处理的转账了
      if (successTransfers.length === allTransfers.length) {
        finalStatus = 'success';
        // 更新累计提现
        await User.increment(
          { total_commission_withdrawn: totalSuccessAmount - (Number(withdrawal.success_amount) || 0) },
          { where: { id: withdrawal.user_id } }
        );
      } else if (successTransfers.length > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'failed';
      }
    }

    // 更新提现记录
    await withdrawal.update({
      status: finalStatus as 'pending' | 'approved' | 'processing' | 'success' | 'partial' | 'failed' | 'rejected',
      success_amount: totalSuccessAmount,
      fail_amount: totalFailAmount,
      success_count: successTransfers.length
    });

    successResponse(res, {
      status: finalStatus,
      updatedCount,
      successAmount: totalSuccessAmount,
      failAmount: totalFailAmount
    }, '状态已刷新');

  } catch (error: any) {
    console.error('刷新提现状态失败:', error);
    errorResponse(res, '刷新状态失败', 500, error.message);
  }
};
