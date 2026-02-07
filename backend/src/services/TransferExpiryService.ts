/**
 * 转账过期检查服务
 * 定时检查待确认收款的转账，处理过期情况
 */

import { Op } from 'sequelize';
import WithdrawalRequest from '../models/WithdrawalRequest';
import WithdrawalTransfer from '../models/WithdrawalTransfer';
import User from '../models/User';
import WechatTransferService from './WechatTransferService';

class TransferExpiryService {
  private checkInterval: NodeJS.Timeout | null = null;

  // 转账有效期（毫秒）- 微信限制24小时
  private readonly TRANSFER_EXPIRE_MS = 24 * 60 * 60 * 1000;

  // 检查间隔（毫秒）- 每小时检查一次
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000;

  /**
   * 启动定时检查
   */
  start(): void {
    console.log('✅ 转账过期检查服务已启动，检查间隔: 1小时');

    // 启动后立即执行一次
    this.checkExpiredTransfers();

    // 设置定时任务
    this.checkInterval = setInterval(() => {
      this.checkExpiredTransfers();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * 停止定时检查
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('转账过期检查服务已停止');
    }
  }

  /**
   * 检查过期转账
   */
  async checkExpiredTransfers(): Promise<void> {
    console.log('[TransferExpiryService] 开始检查过期转账...');

    try {
      // 查找超过23小时的待确认转账（提前1小时处理，确保不遗漏）
      const cutoffTime = new Date(Date.now() - 23 * 60 * 60 * 1000);

      const pendingTransfers = await WithdrawalTransfer.findAll({
        where: {
          status: 'processing',
          batch_status: 'WAIT_USER_CONFIRM',
          created_at: {
            [Op.lt]: cutoffTime
          }
        },
        include: [{
          model: WithdrawalRequest,
          as: 'withdrawal'
        }]
      });

      console.log(`[TransferExpiryService] 找到 ${pendingTransfers.length} 条待检查转账`);

      for (const transfer of pendingTransfers) {
        await this.checkAndUpdateTransfer(transfer);
      }

      console.log('[TransferExpiryService] 检查完成');
    } catch (error) {
      console.error('[TransferExpiryService] 检查过期转账失败:', error);
    }
  }

  /**
   * 检查并更新单笔转账状态
   */
  private async checkAndUpdateTransfer(transfer: any): Promise<void> {
    try {
      console.log(`[TransferExpiryService] 查询转账 ${transfer.out_batch_no} 状态...`);

      // 调用微信API查询真实状态
      const result = await WechatTransferService.queryTransfer(transfer.out_batch_no);
      console.log(`[TransferExpiryService] 微信返回状态: ${result.state}`);

      if (result.state === 'SUCCESS') {
        // 转账成功（用户已确认但我们没收到）
        await this.handleTransferSuccess(transfer);
      } else if (result.state === 'FAIL' || result.state === 'CANCELLED') {
        // 转账失败或已取消（过期）
        await this.handleTransferFailed(transfer, result.fail_reason || '转账已过期');
      }
      // 其他状态（WAIT_USER_CONFIRM, TRANSFERING）保持不变，等下次检查

    } catch (error: any) {
      console.error(`[TransferExpiryService] 检查转账 ${transfer.out_batch_no} 失败:`, error.message);
    }
  }

  /**
   * 处理转账成功
   */
  private async handleTransferSuccess(transfer: any): Promise<void> {
    console.log(`[TransferExpiryService] 处理转账成功: ${transfer.out_batch_no}`);

    // 更新转账记录
    await transfer.update({
      status: 'success',
      batch_status: 'SUCCESS',
      transferred_at: new Date()
    });

    // 更新提现记录
    const withdrawal = transfer.withdrawal;
    if (withdrawal) {
      const allTransfers = await WithdrawalTransfer.findAll({
        where: { withdrawal_id: withdrawal.id }
      });

      const successTransfers = allTransfers.filter(t => t.status === 'success');
      const totalSuccessAmount = successTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

      const allDone = allTransfers.every(t => t.status === 'success' || t.status === 'failed');

      if (allDone) {
        const finalStatus = successTransfers.length === allTransfers.length ? 'success' : 'partial';
        await withdrawal.update({
          status: finalStatus,
          success_amount: totalSuccessAmount,
          success_count: successTransfers.length
        });

        // 更新用户累计提现
        await User.increment(
          { total_commission_withdrawn: totalSuccessAmount },
          { where: { id: withdrawal.user_id } }
        );
      }
    }
  }

  /**
   * 处理转账失败/过期
   */
  private async handleTransferFailed(transfer: any, reason: string): Promise<void> {
    console.log(`[TransferExpiryService] 处理转账失败: ${transfer.out_batch_no}, 原因: ${reason}`);

    // 更新转账记录
    await transfer.update({
      status: 'failed',
      batch_status: 'CANCELLED',
      fail_reason: reason
    });

    // 退回佣金
    const withdrawal = transfer.withdrawal;
    if (withdrawal) {
      await User.increment(
        { commission_balance: Number(transfer.amount) },
        { where: { id: withdrawal.user_id } }
      );
      console.log(`[TransferExpiryService] 已退回佣金 ${transfer.amount} 元到用户 ${withdrawal.user_id}`);

      // 检查提现记录所有转账状态
      const allTransfers = await WithdrawalTransfer.findAll({
        where: { withdrawal_id: withdrawal.id }
      });

      const successTransfers = allTransfers.filter(t => t.status === 'success');
      const failedTransfers = allTransfers.filter(t => t.status === 'failed');
      const pendingCount = allTransfers.filter(t =>
        t.status === 'processing' || t.batch_status === 'WAIT_USER_CONFIRM'
      ).length;

      // 如果没有待处理的转账了，更新提现记录状态
      if (pendingCount === 0) {
        const totalSuccessAmount = successTransfers.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalFailAmount = failedTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

        let finalStatus: string;
        if (successTransfers.length === allTransfers.length) {
          finalStatus = 'success';
        } else if (successTransfers.length > 0) {
          finalStatus = 'partial';
        } else {
          finalStatus = 'failed';
        }

        await withdrawal.update({
          status: finalStatus,
          success_amount: totalSuccessAmount,
          fail_amount: totalFailAmount,
          success_count: successTransfers.length
        });

        console.log(`[TransferExpiryService] 提现 ${withdrawal.id} 状态更新为: ${finalStatus}`);
      }
    }
  }
}

// 导出单例
export default new TransferExpiryService();
