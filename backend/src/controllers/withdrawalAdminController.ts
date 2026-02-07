/**
 * 提现管理控制器 - 管理员审核提现申请
 */

import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import WithdrawalRequest from '../models/WithdrawalRequest';
import WithdrawalTransfer from '../models/WithdrawalTransfer';
import User from '../models/User';
import CommissionSetting from '../models/CommissionSetting';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import WechatTransferService from '../services/WechatTransferService';

/**
 * 获取提现申请列表
 * GET /api/admin/withdrawals
 */
export const getWithdrawals = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'phone', 'wechat_openid']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    successResponse(res, {
      list: rows,
      pagination: {
        page,
        limit,
        total: count
      }
    }, '获取成功');
  } catch (error: any) {
    console.error('获取提现列表失败:', error);
    errorResponse(res, '获取失败', 500, error.message);
  }
};

/**
 * 获取提现统计
 * GET /api/admin/withdrawals/stats
 */
export const getWithdrawalStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await WithdrawalRequest.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    }) as any[];

    const result: Record<string, { count: number; totalAmount: number }> = {};
    for (const s of stats) {
      result[s.status] = {
        count: parseInt(s.count),
        totalAmount: parseFloat(s.totalAmount || '0')
      };
    }

    successResponse(res, result, '获取成功');
  } catch (error: any) {
    console.error('获取提现统计失败:', error);
    errorResponse(res, '获取失败', 500, error.message);
  }
};

/**
 * 审核提现申请
 * POST /api/admin/withdrawals/:id/review
 */
export const reviewWithdrawal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, reject_reason } = req.body;
    const adminId = req.user?.userId;

    if (!['approve', 'reject'].includes(action)) {
      errorResponse(res, '无效的操作', 400);
      return;
    }

    const withdrawal = await WithdrawalRequest.findByPk(id);
    if (!withdrawal) {
      errorResponse(res, '提现申请不存在', 404);
      return;
    }

    // 检查状态：pending 可以批准或拒绝，approved 只能拒绝
    if (withdrawal.status === 'pending') {
      // 待审核状态，可以批准或拒绝
    } else if (withdrawal.status === 'approved') {
      // 已批准状态，只能拒绝（取消）
      if (action === 'approve') {
        errorResponse(res, '该申请已批准，无需重复批准', 400);
        return;
      }
    } else {
      // 其他状态（processing, success, failed, rejected）不允许修改
      errorResponse(res, '该申请已处理完成，无法修改', 400);
      return;
    }

    const transaction = await sequelize.transaction();

    try {
      if (action === 'reject') {
        // 拒绝提现，返还佣金余额
        await User.increment(
          { commission_balance: Number(withdrawal.amount) },
          { where: { id: withdrawal.user_id }, transaction }
        );

        await withdrawal.update({
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: new Date(),
          reject_reason: reject_reason || (withdrawal.status === 'approved' ? '已取消转账' : '审核未通过')
        }, { transaction });

        await transaction.commit();

        successResponse(res, { message: withdrawal.status === 'approved' ? '已取消提现申请' : '已拒绝提现申请' });
      } else {
        // 批准提现
        await withdrawal.update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date()
        }, { transaction });

        await transaction.commit();

        successResponse(res, { message: '已批准提现申请，请执行转账操作' });
      }
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('审核提现失败:', error);
    errorResponse(res, '审核失败', 500, error.message);
  }
};

/**
 * 执行转账（批准后）
 * POST /api/admin/withdrawals/:id/transfer
 */
export const executeTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const withdrawal = await WithdrawalRequest.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!withdrawal) {
      errorResponse(res, '提现申请不存在', 404);
      return;
    }

    if (withdrawal.status !== 'approved') {
      errorResponse(res, '只能对已批准的申请执行转账', 400);
      return;
    }

    // 获取单笔转账上限
    const maxSingleTransfer = await SystemConfig.getNumberConfig(ConfigKey.MAX_SINGLE_TRANSFER);

    // 计算需要拆分成几笔
    const amount = Number(withdrawal.amount);
    const transferCount = Math.ceil(amount / maxSingleTransfer);
    const transfers: { no: number; amount: number }[] = [];

    let remaining = amount;
    for (let i = 1; i <= transferCount; i++) {
      const transferAmount = Math.min(remaining, maxSingleTransfer);
      transfers.push({ no: i, amount: transferAmount });
      remaining -= transferAmount;
    }

    // 更新状态为处理中
    await withdrawal.update({
      status: 'processing',
      transfer_count: transferCount
    });

    // 创建转账记录
    const user = (withdrawal as any).user as User;
    const timestamp = Date.now();

    for (const t of transfers) {
      const outBatchNo = `WD${withdrawal.id}B${t.no}T${timestamp}`;
      const outDetailNo = `WD${withdrawal.id}D${t.no}T${timestamp}`;

      await WithdrawalTransfer.create({
        withdrawal_id: withdrawal.id,
        transfer_no: t.no,
        amount: t.amount,
        out_batch_no: outBatchNo,
        out_detail_no: outDetailNo,
        status: 'pending'
      });
    }

    // 异步执行转账
    processTransfers(withdrawal.id).catch(err => {
      console.error(`处理提现 ${withdrawal.id} 转账失败:`, err);
    });

    successResponse(res, {
      message: '转账已开始执行',
      transferCount,
      transfers
    });
  } catch (error: any) {
    console.error('执行转账失败:', error);
    errorResponse(res, '执行转账失败', 500, error.message);
  }
};

/**
 * 处理转账（内部函数）
 */
async function processTransfers(withdrawalId: number): Promise<void> {
  const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, {
    include: [{ model: User, as: 'user' }]
  });

  if (!withdrawal) return;

  const transfers = await WithdrawalTransfer.findAll({
    where: { withdrawal_id: withdrawalId, status: 'pending' },
    order: [['transfer_no', 'ASC']]
  });

  const user = (withdrawal as any).user as User;
  let successAmount = 0;
  let failAmount = 0;
  let successCount = 0;
  let pendingConfirmCount = 0; // 等待用户确认收款的笔数
  let pendingConfirmAmount = 0; // 等待用户确认收款的金额

  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i];
    try {
      await transfer.update({ status: 'processing' });

      // 调用微信转账服务
      const result = await WechatTransferService.transfer({
        outBatchNo: transfer.out_batch_no,
        outDetailNo: transfer.out_detail_no,
        openid: user.wechat_openid!,
        amount: Number(transfer.amount),
        userName: user.nickname || user.username,
        remark: `佣金提现第${transfer.transfer_no}笔`
      });

      if (result.success) {
        // 2025年新版本：如果状态是 WAIT_USER_CONFIRM，需要保存 package_info
        if (result.batchStatus === 'WAIT_USER_CONFIRM') {
          await transfer.update({
            status: 'processing', // 等待用户确认收款
            wechat_batch_id: result.batchId,
            wechat_detail_id: result.detailId,
            batch_status: result.batchStatus,
            package_info: result.packageInfo
          });
          console.log(`转账需要用户确认收款，批次号: ${result.batchId}`);
          // 计入等待确认，不计入成功（用户确认后才算成功）
          pendingConfirmCount++;
          pendingConfirmAmount += Number(transfer.amount);
        } else {
          // 直接成功
          await transfer.update({
            status: 'success',
            wechat_batch_id: result.batchId,
            wechat_detail_id: result.detailId,
            batch_status: result.batchStatus,
            transferred_at: new Date()
          });
          successAmount += Number(transfer.amount);
          successCount++;
        }
      } else {
        await transfer.update({
          status: 'failed',
          fail_reason: result.errorMessage
        });
        failAmount += Number(transfer.amount);
      }
    } catch (error: any) {
      await transfer.update({
        status: 'failed',
        fail_reason: error.message || '转账异常'
      });
      failAmount += Number(transfer.amount);
    }

    // 间隔1.5秒，避免触发微信风控（最后一笔不需要延迟）
    if (i < transfers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`[转账延迟] 等待1.5秒后处理下一笔转账...`);
    }
  }

  // 更新提现申请状态
  let finalStatus: 'processing' | 'success' | 'partial' | 'failed';

  // 有等待用户确认的转账，保持 processing 状态
  if (pendingConfirmCount > 0) {
    finalStatus = 'processing';
    // 如果有失败的，返还失败部分的佣金
    if (failAmount > 0) {
      await User.increment(
        { commission_balance: failAmount },
        { where: { id: withdrawal.user_id } }
      );
    }
    // 已成功的部分更新累计提现
    if (successAmount > 0) {
      await User.increment(
        { total_commission_withdrawn: successAmount },
        { where: { id: withdrawal.user_id } }
      );
    }
  } else if (successCount === transfers.length) {
    finalStatus = 'success';
    // 全部成功，更新累计提现金额
    await User.increment(
      { total_commission_withdrawn: successAmount },
      { where: { id: withdrawal.user_id } }
    );
  } else if (successCount > 0) {
    finalStatus = 'partial';
    // 部分成功，返还失败部分的佣金，并更新累计提现金额
    await User.increment(
      {
        commission_balance: failAmount,  // 返还失败部分
        total_commission_withdrawn: successAmount  // 记录成功提现
      },
      { where: { id: withdrawal.user_id } }
    );
  } else {
    finalStatus = 'failed';
    // 转账全部失败，返还佣金
    await User.increment(
      { commission_balance: Number(withdrawal.amount) },
      { where: { id: withdrawal.user_id } }
    );
  }

  await withdrawal.update({
    status: finalStatus,
    success_amount: successAmount,
    fail_amount: failAmount,
    success_count: successCount
  });

  console.log(`提现 ${withdrawalId} 处理完成: ${finalStatus}, 成功 ${successAmount}元, 等待确认 ${pendingConfirmAmount}元, 失败 ${failAmount}元`);
}

/**
 * 获取转账明细
 * GET /api/admin/withdrawals/:id/transfers
 */
export const getTransferDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transfers = await WithdrawalTransfer.findAll({
      where: { withdrawal_id: id },
      order: [['transfer_no', 'ASC']]
    });

    successResponse(res, { transfers }, '获取成功');
  } catch (error: any) {
    console.error('获取转账明细失败:', error);
    errorResponse(res, '获取失败', 500, error.message);
  }
};

/**
 * 重试失败的转账
 * POST /api/admin/withdrawals/:id/retry
 */
export const retryTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const withdrawal = await WithdrawalRequest.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!withdrawal) {
      errorResponse(res, '提现申请不存在', 404);
      return;
    }

    // 只有 failed 或 partial 状态才能重试
    if (!['failed', 'partial'].includes(withdrawal.status)) {
      errorResponse(res, '只能重试失败或部分成功的提现申请', 400);
      return;
    }

    // 查找失败的转账记录
    const failedTransfers = await WithdrawalTransfer.findAll({
      where: {
        withdrawal_id: id,
        status: 'failed'
      },
      order: [['transfer_no', 'ASC']]
    });

    if (failedTransfers.length === 0) {
      errorResponse(res, '没有失败的转账记录需要重试', 400);
      return;
    }

    console.log(`开始重试提现 ${id}，失败笔数: ${failedTransfers.length}`);

    // 更新提现状态为处理中
    await withdrawal.update({ status: 'processing' });

    // 异步执行重试
    retryFailedTransfers(withdrawal.id).catch(err => {
      console.error(`重试提现 ${withdrawal.id} 失败:`, err);
    });

    successResponse(res, {
      message: '已开始重试转账',
      retryCount: failedTransfers.length
    });
  } catch (error: any) {
    console.error('重试转账失败:', error);
    errorResponse(res, '重试失败', 500, error.message);
  }
};

/**
 * 重试失败的转账（内部函数）
 */
async function retryFailedTransfers(withdrawalId: number): Promise<void> {
  const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, {
    include: [{ model: User, as: 'user' }]
  });

  if (!withdrawal) return;

  const failedTransfers = await WithdrawalTransfer.findAll({
    where: { withdrawal_id: withdrawalId, status: 'failed' },
    order: [['transfer_no', 'ASC']]
  });

  const user = (withdrawal as any).user as User;
  let newSuccessAmount = Number(withdrawal.success_amount || 0);
  let newFailAmount = Number(withdrawal.fail_amount || 0);
  let newSuccessCount = Number(withdrawal.success_count || 0);
  let pendingConfirmCount = 0; // 等待用户确认收款的笔数

  for (let i = 0; i < failedTransfers.length; i++) {
    const transfer = failedTransfers[i];
    try {
      console.log(`[重试] 开始重试转账 ${transfer.id}，金额 ${transfer.amount} 元`);

      await transfer.update({ status: 'processing', fail_reason: null });

      // 调用微信转账服务
      const result = await WechatTransferService.transfer({
        outBatchNo: transfer.out_batch_no,
        outDetailNo: transfer.out_detail_no,
        openid: user.wechat_openid!,
        amount: Number(transfer.amount),
        userName: user.nickname || user.username,
        remark: `佣金提现第${transfer.transfer_no}笔（重试）`
      });

      if (result.success) {
        // 2025年新版本：如果状态是 WAIT_USER_CONFIRM，需要保存 package_info
        if (result.batchStatus === 'WAIT_USER_CONFIRM') {
          await transfer.update({
            status: 'processing',
            wechat_batch_id: result.batchId,
            wechat_detail_id: result.detailId,
            batch_status: result.batchStatus,
            package_info: result.packageInfo
          });
          console.log(`[重试] 转账需要用户确认收款，批次号: ${result.batchId}`);
          // 从失败金额中移除，但不计入成功（等待用户确认）
          newFailAmount -= Number(transfer.amount);
          pendingConfirmCount++;
        } else {
          // 直接成功
          await transfer.update({
            status: 'success',
            wechat_batch_id: result.batchId,
            wechat_detail_id: result.detailId,
            batch_status: result.batchStatus,
            transferred_at: new Date()
          });
          console.log(`[重试] 转账成功: ${transfer.id}`);
          newSuccessAmount += Number(transfer.amount);
          newFailAmount -= Number(transfer.amount);
          newSuccessCount++;
        }
      } else {
        await transfer.update({
          status: 'failed',
          fail_reason: result.errorMessage
        });
        console.log(`[重试] 转账失败: ${result.errorMessage}`);
      }
    } catch (error: any) {
      await transfer.update({
        status: 'failed',
        fail_reason: error.message || '重试转账异常'
      });
      console.error(`[重试] 转账异常:`, error);
    }

    // 间隔1.5秒
    if (i < failedTransfers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // 更新提现申请状态
  const totalTransfers = await WithdrawalTransfer.count({
    where: { withdrawal_id: withdrawalId }
  });

  // 检查是否有等待用户确认的转账
  const pendingConfirmTransfers = await WithdrawalTransfer.count({
    where: { withdrawal_id: withdrawalId, batch_status: 'WAIT_USER_CONFIRM' }
  });

  let finalStatus: 'processing' | 'success' | 'partial' | 'failed';

  // 有等待用户确认的转账，保持 processing 状态
  if (pendingConfirmTransfers > 0) {
    finalStatus = 'processing';
    // 更新累计提现（如果有新增成功的）
    const incrementAmount = newSuccessAmount - Number(withdrawal.success_amount || 0);
    const oldFailAmount = Number(withdrawal.fail_amount || 0);
    const returnAmount = oldFailAmount - newFailAmount; // 返还减少的失败金额

    if (incrementAmount > 0 || returnAmount > 0) {
      await User.increment(
        {
          commission_balance: returnAmount,
          total_commission_withdrawn: incrementAmount
        },
        { where: { id: withdrawal.user_id } }
      );
    }
  } else if (newSuccessCount === totalTransfers) {
    finalStatus = 'success';
    // 全部成功，更新累计提现金额
    const incrementAmount = newSuccessAmount - Number(withdrawal.success_amount || 0);
    await User.increment(
      { total_commission_withdrawn: incrementAmount },
      { where: { id: withdrawal.user_id } }
    );
  } else if (newSuccessCount > 0) {
    finalStatus = 'partial';
    // 部分成功，返还新的失败金额，更新累计提现
    const incrementAmount = newSuccessAmount - Number(withdrawal.success_amount || 0);
    const oldFailAmount = Number(withdrawal.fail_amount || 0);
    const returnAmount = oldFailAmount - newFailAmount; // 返还减少的失败金额

    if (incrementAmount > 0 || returnAmount > 0) {
      await User.increment(
        {
          commission_balance: returnAmount,  // 返还减少的失败部分
          total_commission_withdrawn: incrementAmount  // 增加的成功提现
        },
        { where: { id: withdrawal.user_id } }
      );
    }
  } else {
    finalStatus = 'failed';
  }

  await withdrawal.update({
    status: finalStatus,
    success_amount: newSuccessAmount,
    fail_amount: newFailAmount,
    success_count: newSuccessCount
  });

  console.log(`[重试] 提现 ${withdrawalId} 处理完成: ${finalStatus}, 成功 ${newSuccessAmount}元, 等待确认 ${pendingConfirmCount}笔, 失败 ${newFailAmount}元`);
}

/**
 * 取消等待用户确认的转账
 * POST /api/admin/withdrawals/:id/cancel
 *
 * 当转账状态为 processing（等待用户确认收款）时，管理员可以取消转账
 * 取消后会返还用户的佣金余额
 */
export const cancelTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId;

    const withdrawal = await WithdrawalRequest.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!withdrawal) {
      errorResponse(res, '提现申请不存在', 404);
      return;
    }

    // 只能取消 processing 状态的提现
    if (withdrawal.status !== 'processing') {
      errorResponse(res, '只能取消转账中的提现申请', 400);
      return;
    }

    // 查找等待用户确认的转账记录
    const pendingTransfers = await WithdrawalTransfer.findAll({
      where: {
        withdrawal_id: id,
        batch_status: 'WAIT_USER_CONFIRM'
      }
    });

    if (pendingTransfers.length === 0) {
      errorResponse(res, '没有等待确认的转账记录', 400);
      return;
    }

    // 先调用微信撤销API
    const cancelResults: { outBillNo: string; success: boolean; message?: string }[] = [];
    for (const transfer of pendingTransfers) {
      const result = await WechatTransferService.cancelTransfer(transfer.out_batch_no);
      cancelResults.push({
        outBillNo: transfer.out_batch_no,
        success: result.success,
        message: result.message
      });
      console.log(`[取消转账] 微信撤销 ${transfer.out_batch_no}: ${result.success ? '成功' : '失败'} - ${result.message}`);
    }

    // 检查是否有撤销失败的（但继续处理，因为可能是单号不存在等原因）
    const failedCancels = cancelResults.filter(r => !r.success);
    if (failedCancels.length > 0) {
      console.warn(`[取消转账] 部分微信撤销失败:`, failedCancels);
    }

    const transaction = await sequelize.transaction();

    try {
      // 计算需要返还的金额（等待确认的转账金额）
      let refundAmount = 0;
      for (const transfer of pendingTransfers) {
        refundAmount += Number(transfer.amount);

        // 更新转账记录状态为取消
        await transfer.update({
          status: 'failed',
          batch_status: 'CANCELLED',
          fail_reason: reason || '管理员取消转账'
        }, { transaction });
      }

      // 返还用户佣金余额
      await User.increment(
        { commission_balance: refundAmount },
        { where: { id: withdrawal.user_id }, transaction }
      );

      // 计算更新后的失败金额
      const newFailAmount = Number(withdrawal.fail_amount || 0) + refundAmount;

      // 检查是否还有成功的转账
      const successTransfers = await WithdrawalTransfer.findAll({
        where: {
          withdrawal_id: id,
          status: 'success'
        },
        transaction
      });

      let finalStatus: 'success' | 'partial' | 'failed' | 'rejected';
      const successAmount = Number(withdrawal.success_amount || 0);

      if (successTransfers.length > 0 && successAmount > 0) {
        // 有成功的转账，标记为部分成功
        finalStatus = 'partial';
      } else {
        // 没有成功的转账，标记为已拒绝（取消）
        finalStatus = 'rejected';
      }

      // 更新提现申请状态
      await withdrawal.update({
        status: finalStatus,
        fail_amount: newFailAmount,
        reject_reason: reason || '管理员取消待确认的转账',
        reviewed_by: adminId,
        reviewed_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`[取消转账] 提现 ${id} 已取消，返还金额 ${refundAmount} 元，最终状态 ${finalStatus}`);

      successResponse(res, {
        message: '已取消待确认的转账',
        refundAmount,
        finalStatus,
        cancelledCount: pendingTransfers.length
      });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('取消转账失败:', error);
    errorResponse(res, '取消转账失败', 500, error.message);
  }
};

/**
 * 查询微信商户账户余额
 * GET /api/admin/withdrawals/wechat-balance
 */
export const getWechatBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    // 查询运营账户余额（用于转账）
    const operationBalance = await WechatTransferService.queryBalance('OPERATION');

    // 同时查询基本账户余额
    const basicBalance = await WechatTransferService.queryBalance('BASIC');

    if (operationBalance.available_amount !== undefined && basicBalance.available_amount !== undefined) {
      successResponse(res, {
        operation: {
          available: Number(operationBalance.available_amount) / 100, // 转换为元
          pending: Number(operationBalance.pending_amount || 0) / 100,
          total: (Number(operationBalance.available_amount) + Number(operationBalance.pending_amount || 0)) / 100
        },
        basic: {
          available: Number(basicBalance.available_amount) / 100,
          pending: Number(basicBalance.pending_amount || 0) / 100,
          total: (Number(basicBalance.available_amount) + Number(basicBalance.pending_amount || 0)) / 100
        }
      }, '查询成功');
    } else {
      errorResponse(res, '查询失败', 500, operationBalance.message || '未知错误');
    }
  } catch (error: any) {
    console.error('查询微信账户余额失败:', error);
    errorResponse(res, '查询失败', 500, error.message);
  }
};
