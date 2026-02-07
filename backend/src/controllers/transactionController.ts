/**
 * 交易记录控制器
 * 统一查询充值记录、消费记录、订单记录等
 */

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import CourseOrder from '../models/CourseOrder';
import VideoExtractionTask from '../models/VideoExtractionTask';
import UserPrompt from '../models/UserPrompt';
import Prompt from '../models/Prompt';

/**
 * 获取充值记录
 * GET /api/transactions/recharge
 */
export const getRechargeRecords = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 先更新该用户超时的 pending 订单为 timeout 状态（15分钟超时）
    await sequelize.query(
      `UPDATE recharge_records
       SET status = 'timeout'
       WHERE user_id = ?
       AND status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      { replacements: [userId] }
    );

    const [records]: any = await sequelize.query(
      `SELECT order_no, amount_paid, amount_received, bonus_amount,
              payment_method, status, balance_before, balance_after,
              created_at, completed_at
       FROM recharge_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [userId, Number(limit), offset] }
    );

    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM recharge_records WHERE user_id = ?`,
      { replacements: [userId] }
    );

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询充值记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 获取消费记录（余额变动日志）
 * GET /api/transactions/consumption
 */
export const getConsumptionRecords = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = ?';
    const replacements: any[] = [userId];

    // 可选过滤类型
    if (type && type !== 'all') {
      whereClause += ' AND change_type = ?';
      replacements.push(type);
    }

    const [records]: any = await sequelize.query(
      `SELECT log_id as id, change_type, change_amount, balance_before, balance_after,
              source, description, created_at
       FROM balance_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...replacements, Number(limit), offset] }
    );

    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM balance_logs ${whereClause}`,
      { replacements }
    );

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询消费记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 获取课程订单记录
 * GET /api/transactions/orders
 */
export const getCourseOrders = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await CourseOrder.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    return res.json({
      success: true,
      data: {
        orders: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询订单记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 获取视频提取记录
 * GET /api/transactions/video-extractions
 */
export const getVideoExtractions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await VideoExtractionTask.findAndCountAll({
      where: { user_id: userId },
      attributes: ['id', 'original_url', 'platform', 'video_title', 'status',
                   'used_seconds', 'cost', 'correction_cost', 'created_at', 'completed_at'],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    return res.json({
      success: true,
      data: {
        records: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询视频提取记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 获取提示词购买记录
 * GET /api/transactions/prompts
 */
export const getPromptPurchases = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 联表查询获取提示词详情
    const [records]: any = await sequelize.query(
      `SELECT up.id, up.prompt_id, up.purchase_type, up.price_paid, up.created_at,
              p.title as prompt_title, p.category
       FROM user_prompts up
       LEFT JOIN prompts p ON up.prompt_id = p.id
       WHERE up.user_id = ?
       ORDER BY up.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [userId, Number(limit), offset] }
    );

    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM user_prompts WHERE user_id = ?`,
      { replacements: [userId] }
    );

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('查询提示词购买记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 获取所有交易记录汇总
 * GET /api/transactions/summary
 */
export const getTransactionSummary = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    const userId = req.user.userId;

    // 并行查询各类统计
    const [rechargeStats, consumptionStats, orderStats, videoStats, promptStats] = await Promise.all([
      // 充值统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_received), 0) as total
         FROM recharge_records WHERE user_id = ? AND status = 'success'`,
        { replacements: [userId], type: QueryTypes.SELECT }
      ),
      // 消费统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(ABS(change_amount)), 0) as total
         FROM balance_logs WHERE user_id = ? AND change_amount < 0`,
        { replacements: [userId], type: QueryTypes.SELECT }
      ),
      // 订单统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
         FROM course_orders WHERE user_id = ? AND status = 'completed'`,
        { replacements: [userId], type: QueryTypes.SELECT }
      ),
      // 视频提取统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(used_seconds), 0) as total_seconds
         FROM video_extraction_tasks WHERE user_id = ? AND status = 'completed'`,
        { replacements: [userId], type: QueryTypes.SELECT }
      ),
      // 提示词购买统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(price_paid), 0) as total
         FROM user_prompts WHERE user_id = ?`,
        { replacements: [userId], type: QueryTypes.SELECT }
      )
    ]);

    return res.json({
      success: true,
      data: {
        recharge: rechargeStats[0],
        consumption: consumptionStats[0],
        orders: orderStats[0],
        videoExtraction: videoStats[0],
        prompts: promptStats[0]
      }
    });
  } catch (error: any) {
    console.error('查询交易汇总失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

// ============================================
// 管理员接口 - 查看所有用户的交易记录
// ============================================

/**
 * 管理员获取所有消费记录（余额变动日志）
 * GET /api/admin/transactions/all
 */
export const adminGetAllTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { page = 1, limit = 20, type, userId, keyword, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const replacements: any[] = [];

    // 按类型过滤
    if (type && type !== 'all') {
      whereClause += ' AND bl.change_type = ?';
      replacements.push(type);
    }

    // 按用户ID过滤
    if (userId) {
      whereClause += ' AND bl.user_id = ?';
      replacements.push(Number(userId));
    }

    // 按关键词搜索（用户名或描述）
    if (keyword) {
      whereClause += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR bl.description LIKE ?)';
      const kw = `%${keyword}%`;
      replacements.push(kw, kw, kw);
    }

    // 按日期范围过滤
    if (startDate) {
      whereClause += ' AND bl.created_at >= ?';
      replacements.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND bl.created_at <= ?';
      replacements.push(endDate + ' 23:59:59');
    }

    const [records]: any = await sequelize.query(
      `SELECT bl.log_id as id, bl.user_id, bl.change_type, bl.change_amount,
              bl.balance_before, bl.balance_after, bl.source, bl.service_name,
              bl.description, bl.created_at,
              u.username, u.nickname
       FROM balance_logs bl
       LEFT JOIN users u ON bl.user_id = u.id
       ${whereClause}
       ORDER BY bl.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...replacements, Number(limit), offset] }
    );

    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM balance_logs bl
       LEFT JOIN users u ON bl.user_id = u.id
       ${whereClause}`,
      { replacements }
    );

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('管理员查询交易记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 管理员获取交易统计汇总
 * GET /api/admin/transactions/summary
 */
export const adminGetTransactionSummary = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const replacements: any[] = [];

    if (startDate) {
      dateFilter += ' AND created_at >= ?';
      replacements.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND created_at <= ?';
      replacements.push(endDate + ' 23:59:59');
    }

    // 并行查询各类统计
    const [
      totalRecharge,
      totalConsumption,
      rechargeCount,
      consumptionCount,
      videoExtractStats,
      promptPurchaseStats,
      courseOrderStats,
      todayStats
    ] = await Promise.all([
      // 总充值金额
      sequelize.query(
        `SELECT COALESCE(SUM(amount_received), 0) as total
         FROM recharge_records WHERE status = 'success' ${dateFilter.replace(/created_at/g, 'completed_at')}`,
        { replacements: [...replacements], type: QueryTypes.SELECT }
      ),
      // 总消费金额
      sequelize.query(
        `SELECT COALESCE(SUM(ABS(change_amount)), 0) as total
         FROM balance_logs WHERE change_amount < 0 ${dateFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      // 充值笔数
      sequelize.query(
        `SELECT COUNT(*) as count FROM recharge_records WHERE status = 'success' ${dateFilter.replace(/created_at/g, 'completed_at')}`,
        { replacements: [...replacements], type: QueryTypes.SELECT }
      ),
      // 消费笔数
      sequelize.query(
        `SELECT COUNT(*) as count FROM balance_logs WHERE change_amount < 0 ${dateFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      // 视频提取统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(cost), 0) as total, COALESCE(SUM(used_seconds), 0) as total_seconds
         FROM video_extraction_tasks WHERE status = 'completed' ${dateFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      // 提示词购买统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(price_paid), 0) as total
         FROM user_prompts WHERE 1=1 ${dateFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      // 课程订单统计
      sequelize.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
         FROM course_orders WHERE status = 'completed' ${dateFilter}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      // 今日统计
      sequelize.query(
        `SELECT
          (SELECT COALESCE(SUM(amount_received), 0) FROM recharge_records WHERE status = 'success' AND DATE(completed_at) = CURDATE()) as today_recharge,
          (SELECT COALESCE(SUM(ABS(change_amount)), 0) FROM balance_logs WHERE change_amount < 0 AND DATE(created_at) = CURDATE()) as today_consumption,
          (SELECT COUNT(*) FROM balance_logs WHERE DATE(created_at) = CURDATE()) as today_transactions`,
        { type: QueryTypes.SELECT }
      )
    ]);

    return res.json({
      success: true,
      data: {
        totalRecharge: (totalRecharge[0] as any).total,
        totalConsumption: (totalConsumption[0] as any).total,
        rechargeCount: (rechargeCount[0] as any).count,
        consumptionCount: (consumptionCount[0] as any).count,
        videoExtraction: videoExtractStats[0],
        promptPurchase: promptPurchaseStats[0],
        courseOrder: courseOrderStats[0],
        today: todayStats[0]
      }
    });
  } catch (error: any) {
    console.error('管理员查询交易汇总失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};

/**
 * 管理员获取充值记录列表
 * GET /api/admin/transactions/recharge
 */
export const adminGetRechargeRecords = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { page = 1, limit = 20, status, keyword, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const replacements: any[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND rr.status = ?';
      replacements.push(status);
    }

    if (keyword) {
      whereClause += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR rr.order_no LIKE ?)';
      const kw = `%${keyword}%`;
      replacements.push(kw, kw, kw);
    }

    if (startDate) {
      whereClause += ' AND rr.created_at >= ?';
      replacements.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND rr.created_at <= ?';
      replacements.push(endDate + ' 23:59:59');
    }

    const [records]: any = await sequelize.query(
      `SELECT rr.record_id as id, rr.user_id, rr.order_no, rr.amount_paid, rr.amount_received,
              rr.bonus_amount, rr.payment_method, rr.status,
              rr.balance_before, rr.balance_after, rr.created_at, rr.completed_at,
              u.username, u.nickname
       FROM recharge_records rr
       LEFT JOIN users u ON rr.user_id = u.id
       ${whereClause}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...replacements, Number(limit), offset] }
    );

    const [countResult]: any = await sequelize.query(
      `SELECT COUNT(*) as total FROM recharge_records rr
       LEFT JOIN users u ON rr.user_id = u.id
       ${whereClause}`,
      { replacements }
    );

    return res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('管理员查询充值记录失败:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
};
