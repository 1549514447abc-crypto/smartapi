/**
 * 佣金结算服务 - 处理佣金结算定时任务
 * 结算周期可通过后台 system_configs 表的 commission_settle_days 配置
 */

import Commission from '../models/Commission';
import User from '../models/User';
import SystemConfig from '../models/SystemConfig';
import sequelize from '../config/database';
import { Op } from 'sequelize';

class CommissionSettleService {
  /**
   * 从数据库获取结算分钟数配置
   * 默认15天 = 21600分钟
   */
  private async getSettleMinutes(): Promise<number> {
    try {
      const config = await SystemConfig.findOne({
        where: { config_key: 'commission_settle_minutes' }
      });
      if (config && config.config_value) {
        const minutes = parseInt(config.config_value);
        if (!isNaN(minutes) && minutes >= 0) {
          return minutes;
        }
      }
    } catch (error) {
      console.error('[佣金结算] 读取结算分钟数配置失败:', error);
    }
    return 15 * 24 * 60; // 默认15天 = 21600分钟
  }

  /**
   * 结算超过配置时间的待结算佣金
   * 定时任务：每分钟执行一次
   */
  async settlePendingCommissions(): Promise<{
    settled: number;
    totalAmount: number;
  }> {
    // 从数据库读取结算分钟数
    const settleMinutes = await this.getSettleMinutes();
    console.log(`[佣金结算] 开始执行佣金结算任务（结算周期: ${settleMinutes}分钟）...`);

    // 计算结算时间点
    const settleTime = new Date();
    settleTime.setMinutes(settleTime.getMinutes() - settleMinutes);

    const transaction = await sequelize.transaction();

    try {
      // 查找创建超过结算周期的pending佣金
      const pendingCommissions = await Commission.findAll({
        where: {
          status: 'pending',
          created_at: {
            [Op.lte]: settleTime
          }
        },
        transaction
      });

      if (pendingCommissions.length === 0) {
        console.log('[佣金结算] 没有需要结算的佣金');
        await transaction.commit();
        return { settled: 0, totalAmount: 0 };
      }

      console.log(`[佣金结算] 找到 ${pendingCommissions.length} 条待结算佣金`);

      let totalAmount = 0;
      const settledCount = pendingCommissions.length;

      // 按推荐人分组，批量更新余额
      const referrerBalanceUpdates = new Map<number, number>();

      for (const commission of pendingCommissions) {
        const referrerId = commission.referrer_id;
        const amount = Number(commission.amount);

        if (!referrerBalanceUpdates.has(referrerId)) {
          referrerBalanceUpdates.set(referrerId, 0);
        }
        referrerBalanceUpdates.set(
          referrerId,
          referrerBalanceUpdates.get(referrerId)! + amount
        );

        totalAmount += amount;

        // 更新佣金状态为已结算（15天后确认）
        const now = new Date();
        await commission.update(
          {
            status: 'settled',
            confirmed_at: now,  // 记录15天确认时间
            settled_at: now      // 记录转为可提现时间
          },
          { transaction }
        );
      }

      // 批量更新推荐人的可提现余额和待结算余额
      for (const [referrerId, amount] of referrerBalanceUpdates) {
        // 从待结算余额转到可提现余额
        await sequelize.query(
          `UPDATE users
           SET commission_balance = commission_balance + ?,
               pending_commission_balance = pending_commission_balance - ?
           WHERE id = ?`,
          {
            replacements: [amount, amount, referrerId],
            transaction
          }
        );

        console.log(`[佣金结算] 用户 ${referrerId} 结算佣金 ¥${amount.toFixed(2)} (待结算→可提现)`);
      }

      await transaction.commit();

      console.log(`[佣金结算] 成功结算 ${settledCount} 条佣金，总金额 ¥${totalAmount.toFixed(2)}`);

      return {
        settled: settledCount,
        totalAmount: Number(totalAmount.toFixed(2))
      };
    } catch (error) {
      await transaction.rollback();
      console.error('[佣金结算] 执行失败:', error);
      throw error;
    }
  }

  /**
   * 获取待结算佣金统计
   */
  async getPendingStats(): Promise<{
    totalCount: number;
    totalAmount: number;
    readyToSettle: number; // 已满结算周期的数量
    settleMinutes: number; // 当前结算周期分钟数
  }> {
    const settleMinutes = await this.getSettleMinutes();
    const settleTime = new Date();
    settleTime.setMinutes(settleTime.getMinutes() - settleMinutes);

    // 所有待结算佣金
    const allPending = await Commission.findAll({
      where: { status: 'pending' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      raw: true
    }) as any;

    // 已满结算周期的待结算佣金
    const readyToSettle = await Commission.count({
      where: {
        status: 'pending',
        created_at: {
          [Op.lte]: settleTime
        }
      }
    });

    return {
      totalCount: parseInt(allPending[0]?.count || '0'),
      totalAmount: parseFloat(allPending[0]?.total || '0'),
      readyToSettle,
      settleMinutes
    };
  }

  /**
   * 启动定时任务（每分钟执行一次）
   */
  startScheduledTask(): void {
    // 每分钟执行一次结算检查
    const intervalMs = 60 * 1000; // 1分钟

    const runTask = async () => {
      try {
        await this.settlePendingCommissions();
      } catch (error) {
        console.error('[佣金结算定时任务] 执行失败:', error);
      }
    };

    // 立即执行一次
    runTask();

    // 然后每分钟执行
    setInterval(runTask, intervalMs);

    console.log('[佣金结算定时任务] 已启动，每分钟执行一次');
  }
}

export default new CommissionSettleService();
