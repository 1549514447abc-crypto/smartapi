/**
 * 视频提取任务超时服务
 * 自动将卡住超过10分钟的任务标记为失败
 */

import sequelize from '../config/database';

class VideoTaskTimeoutService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // 每分钟检查一次
  private readonly TIMEOUT_MINUTES = 10; // 超时时间：10分钟

  /**
   * 启动超时检查服务
   */
  start() {
    console.log('🎬 视频任务超时检查服务已启动');

    // 启动时立即执行一次检查
    this.checkTimeoutTasks();

    // 定期检查
    this.intervalId = setInterval(() => {
      this.checkTimeoutTasks();
    }, this.CHECK_INTERVAL);
  }

  /**
   * 停止超时检查服务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🎬 视频任务超时检查服务已停止');
    }
  }

  /**
   * 检查并处理超时任务
   */
  private async checkTimeoutTasks() {
    try {
      const [results]: any = await sequelize.query(
        `UPDATE video_extraction_tasks
         SET status = 'failed',
             error_message = '任务超时(超过${this.TIMEOUT_MINUTES}分钟未完成)',
             completed_at = NOW()
         WHERE status IN ('pending', 'step1_parsing', 'step2_transcribing', 'step3_correcting')
         AND created_at < DATE_SUB(NOW(), INTERVAL ${this.TIMEOUT_MINUTES} MINUTE)`
      );

      const affectedRows = (results as any)?.affectedRows || 0;

      if (affectedRows > 0) {
        console.log(`🎬 已将 ${affectedRows} 个超时任务标记为失败`);
      }
    } catch (error) {
      console.error('检查视频任务超时失败:', error);
    }
  }
}

export default new VideoTaskTimeoutService();
