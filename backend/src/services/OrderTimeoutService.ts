/**
 * 订单超时处理服务
 * 自动取消超时的充值订单，防止僵尸订单
 */

import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

class OrderTimeoutService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_MINUTES = 15; // 订单超时时间（分钟）
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // 检查间隔（1分钟）

  /**
   * 启动定时任务
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  订单超时检查服务已在运行');
      return;
    }

    console.log(`🕐 启动订单超时检查服务 (超时时间: ${this.TIMEOUT_MINUTES}分钟, 检查间隔: ${this.CHECK_INTERVAL_MS / 1000}秒)`);

    this.isRunning = true;

    // 立即执行一次
    this.checkAndCancelTimeoutOrders();

    // 定时执行
    this.intervalId = setInterval(() => {
      this.checkAndCancelTimeoutOrders();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 订单超时检查服务已停止');
  }

  /**
   * 检查并取消超时订单
   */
  private async checkAndCancelTimeoutOrders(): Promise<void> {
    try {
      // 查询超时的pending订单
      const timeoutOrders: any[] = await sequelize.query(
        `SELECT order_no, user_id, amount_paid, created_at
         FROM recharge_records
         WHERE status = 'pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        {
          replacements: [this.TIMEOUT_MINUTES],
          type: QueryTypes.SELECT
        }
      );

      if (timeoutOrders.length === 0) {
        // 没有超时订单（静默，不输出日志）
        return;
      }

      console.log(`⏰ 发现 ${timeoutOrders.length} 个超时订单，开始处理...`);

      // 逐个取消订单
      for (const order of timeoutOrders) {
        await this.cancelOrder(order);
      }

      console.log(`✅ 已处理 ${timeoutOrders.length} 个超时订单`);
    } catch (error: any) {
      console.error('❌ 检查超时订单失败:', error.message);
    }
  }

  /**
   * 取消单个订单
   */
  private async cancelOrder(order: any): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { order_no, user_id, amount_paid, created_at } = order;

      // 计算超时时长（分钟）
      const timeoutMinutes = Math.floor(
        (new Date().getTime() - new Date(created_at).getTime()) / (1000 * 60)
      );

      // 更新订单状态为 failed
      await sequelize.query(
        `UPDATE recharge_records
         SET status = 'failed',
             completed_at = NOW()
         WHERE order_no = ?`,
        {
          replacements: [order_no],
          transaction
        }
      );

      // 记录余额日志（虽然余额没有变动，但记录一下取消事件）
      await sequelize.query(
        `INSERT INTO balance_logs
         (user_id, change_type, change_amount, balance_before, balance_after,
          source, description)
         SELECT id, 'adjust', 0, balance, balance, 'system',
                CONCAT('订单超时自动取消: ', ?, ', 超时时长: ', ?, '分钟')
         FROM users
         WHERE id = ?`,
        {
          replacements: [order_no, timeoutMinutes, user_id],
          transaction
        }
      );

      await transaction.commit();

      console.log(`   ✓ 订单 ${order_no} 已取消 (用户: ${user_id}, 金额: ¥${amount_paid}, 超时: ${timeoutMinutes}分钟)`);
    } catch (error: any) {
      await transaction.rollback();
      console.error(`   ✗ 取消订单 ${order.order_no} 失败:`, error.message);
    }
  }

  /**
   * 手动触发检查（用于测试或管理接口）
   */
  async manualCheck(): Promise<{ canceledCount: number; message: string }> {
    const beforeQuery: any[] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM recharge_records
       WHERE status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      {
        replacements: [this.TIMEOUT_MINUTES],
        type: QueryTypes.SELECT
      }
    );

    const timeoutCount = beforeQuery[0]?.count || 0;

    if (timeoutCount === 0) {
      return {
        canceledCount: 0,
        message: '没有超时订单'
      };
    }

    await this.checkAndCancelTimeoutOrders();

    return {
      canceledCount: timeoutCount,
      message: `已取消 ${timeoutCount} 个超时订单`
    };
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isRunning: boolean;
    timeoutMinutes: number;
    checkIntervalSeconds: number;
  } {
    return {
      isRunning: this.isRunning,
      timeoutMinutes: this.TIMEOUT_MINUTES,
      checkIntervalSeconds: this.CHECK_INTERVAL_MS / 1000
    };
  }
}

// 导出单例
export default new OrderTimeoutService();
