/**
 * 财务统计控制器
 * 处理后台财务报表相关的数据查询
 */

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 获取财务统计数据
 * GET /api/admin/finance/stats
 */
export const getFinanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取日期范围参数
    const { startDate, endDate } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // 如果有日期范围，使用自定义范围查询
    let dateCondition = '';
    let replacements: any[] = [today, weekAgo, monthAgo];

    if (startDate && endDate) {
      dateCondition = ' AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      replacements = [today, weekAgo, monthAgo, startDate, endDate];
    }

    // 获取充值统计（状态为success表示成功）
    const [rechargeStats]: any = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount_paid ELSE 0 END), 0) as today_recharge,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount_paid ELSE 0 END), 0) as yesterday_recharge,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount_paid ELSE 0 END), 0) as week_recharge,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount_paid ELSE 0 END), 0) as last_week_recharge,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount_paid ELSE 0 END), 0) as month_recharge,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount_paid ELSE 0 END), 0) as last_month_recharge,
        COALESCE(SUM(amount_paid), 0) as total_recharge
      FROM recharge_records
      WHERE status = 'success'${dateCondition}
    `, {
      replacements: [today, yesterday, today, weekAgo, twoWeeksAgo, weekAgo, monthAgo, twoMonthsAgo, monthAgo],
      type: QueryTypes.SELECT
    });

    // 获取课程购买统计（包括completed和success状态）
    const [courseStats]: any = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as today_course,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount ELSE 0 END), 0) as yesterday_course,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as week_course,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount ELSE 0 END), 0) as last_week_course,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as month_course,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount ELSE 0 END), 0) as last_month_course,
        COALESCE(SUM(amount), 0) as total_course
      FROM course_orders
      WHERE status IN ('completed', 'success', 'paid')${dateCondition}
    `, {
      replacements: [today, yesterday, today, weekAgo, twoWeeksAgo, weekAgo, monthAgo, twoMonthsAgo, monthAgo],
      type: QueryTypes.SELECT
    });

    // 会员购买统计（暂无会员功能，预留）
    const membershipStats = {
      today_membership: 0,
      week_membership: 0,
      month_membership: 0,
      total_membership: 0
    };

    // 获取返佣统计（从commissions表）
    const [commissionStats]: any = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as today_commission,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as week_commission,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END), 0) as month_commission,
        COALESCE(SUM(amount), 0) as total_commission
      FROM commissions
      WHERE status = 'settled'${dateCondition}
    `, {
      replacements: replacements,
      type: QueryTypes.SELECT
    });

    // 计算趋势百分比
    const calcTrend = (current: number, previous: number): string => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    // 计算收入
    const todayIncome = parseFloat(rechargeStats?.today_recharge || 0) +
                       parseFloat(courseStats?.today_course || 0) +
                       membershipStats.today_membership;

    const yesterdayIncome = parseFloat(rechargeStats?.yesterday_recharge || 0) +
                           parseFloat(courseStats?.yesterday_course || 0);

    const weekIncome = parseFloat(rechargeStats?.week_recharge || 0) +
                      parseFloat(courseStats?.week_course || 0) +
                      membershipStats.week_membership;

    const lastWeekIncome = parseFloat(rechargeStats?.last_week_recharge || 0) +
                          parseFloat(courseStats?.last_week_course || 0);

    const monthIncome = parseFloat(rechargeStats?.month_recharge || 0) +
                       parseFloat(courseStats?.month_course || 0) +
                       membershipStats.month_membership;

    const lastMonthIncome = parseFloat(rechargeStats?.last_month_recharge || 0) +
                           parseFloat(courseStats?.last_month_course || 0);

    const totalIncome = parseFloat(rechargeStats?.total_recharge || 0) +
                       parseFloat(courseStats?.total_course || 0) +
                       membershipStats.total_membership;

    successResponse(res, {
      todayIncome,
      yesterdayIncome,
      weekIncome,
      lastWeekIncome,
      monthIncome,
      lastMonthIncome,
      totalIncome,
      // 趋势对比
      todayTrend: calcTrend(todayIncome, yesterdayIncome),
      weekTrend: calcTrend(weekIncome, lastWeekIncome),
      monthTrend: calcTrend(monthIncome, lastMonthIncome),
      // 今日明细
      todayRecharge: parseFloat(rechargeStats?.today_recharge || 0),
      todayCourse: parseFloat(courseStats?.today_course || 0),
      todayMembership: membershipStats.today_membership,
      todayCommission: parseFloat(commissionStats?.today_commission || 0),
      // 详细数据
      breakdown: {
        recharge: {
          today: parseFloat(rechargeStats?.today_recharge || 0),
          week: parseFloat(rechargeStats?.week_recharge || 0),
          month: parseFloat(rechargeStats?.month_recharge || 0),
          total: parseFloat(rechargeStats?.total_recharge || 0),
        },
        course: {
          today: parseFloat(courseStats?.today_course || 0),
          week: parseFloat(courseStats?.week_course || 0),
          month: parseFloat(courseStats?.month_course || 0),
          total: parseFloat(courseStats?.total_course || 0),
        },
        membership: {
          today: membershipStats.today_membership,
          week: membershipStats.week_membership,
          month: membershipStats.month_membership,
          total: membershipStats.total_membership,
        },
        commission: {
          today: parseFloat(commissionStats?.today_commission || 0),
          week: parseFloat(commissionStats?.week_commission || 0),
          month: parseFloat(commissionStats?.month_commission || 0),
          total: parseFloat(commissionStats?.total_commission || 0),
        },
      }
    }, '获取财务统计成功');
  } catch (error: any) {
    console.error('获取财务统计失败:', error);
    errorResponse(res, '获取财务统计失败', 500, error.message);
  }
};

/**
 * 获取最近交易记录
 * GET /api/admin/finance/recent-orders
 */
export const getRecentOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { startDate, endDate } = req.query;

    // 日期条件
    let dateConditionR = '';
    let dateConditionC = '';
    let dateReplacements: any[] = [];
    if (startDate && endDate) {
      dateConditionR = ' AND r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      dateConditionC = ' AND c.created_at >= ? AND c.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      dateReplacements = [startDate, endDate];
    }

    // 使用 UNION ALL 合并查询并分页
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult]: any = await sequelize.query(`
      SELECT COUNT(*) as total FROM (
        SELECT r.record_id as id FROM recharge_records r WHERE r.status = 'success'${dateConditionR}
        UNION ALL
        SELECT c.id FROM course_orders c WHERE c.status IN ('completed', 'success', 'paid')${dateConditionC}
      ) as combined
    `, {
      replacements: [...dateReplacements, ...dateReplacements],
      type: QueryTypes.SELECT
    });
    const total = parseInt(countResult?.total || 0);

    // 获取分页数据
    const orders: any[] = await sequelize.query(`
      SELECT * FROM (
        SELECT
          r.record_id as id,
          r.user_id,
          u.username,
          u.nickname,
          r.amount_paid as amount,
          'recharge' as type,
          r.created_at
        FROM recharge_records r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.status = 'success'${dateConditionR}
        UNION ALL
        SELECT
          c.id,
          c.user_id,
          u.username,
          u.nickname,
          c.amount,
          'course' as type,
          c.created_at
        FROM course_orders c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.status IN ('completed', 'success', 'paid')${dateConditionC}
      ) as combined
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, {
      replacements: [...dateReplacements, ...dateReplacements, pageSize, offset],
      type: QueryTypes.SELECT
    });

    successResponse(res, {
      list: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }, '获取订单列表成功');
  } catch (error: any) {
    console.error('获取最近订单失败:', error);
    errorResponse(res, '获取最近订单失败', 500, error.message);
  }
};

/**
 * 获取收入趋势（近30天）
 * GET /api/admin/finance/trend
 */
export const getIncomeTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const { startDate, endDate } = req.query;

    // 日期条件
    let dateCondition = 'created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
    let replacements: any[] = [days];

    if (startDate && endDate) {
      dateCondition = 'created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      replacements = [startDate, endDate];
    }

    // 获取每日充值收入
    const dailyIncome: any[] = await sequelize.query(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount_paid), 0) as amount
      FROM recharge_records
      WHERE status = 'success'
        AND ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, {
      replacements: replacements,
      type: QueryTypes.SELECT
    });

    // 获取每日课程收入
    const dailyCourse: any[] = await sequelize.query(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM course_orders
      WHERE status IN ('completed', 'success', 'paid')
        AND ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, {
      replacements: replacements,
      type: QueryTypes.SELECT
    });

    // 合并数据
    const incomeMap = new Map<string, number>();

    // 初始化日期范围
    if (startDate && endDate) {
      // 使用指定的日期范围
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        incomeMap.set(d.toISOString().split('T')[0], 0);
      }
    } else {
      // 默认最近N天
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        incomeMap.set(date.toISOString().split('T')[0], 0);
      }
    }

    // 添加充值收入
    dailyIncome.forEach(item => {
      const dateStr = new Date(item.date).toISOString().split('T')[0];
      incomeMap.set(dateStr, (incomeMap.get(dateStr) || 0) + parseFloat(item.amount));
    });

    // 添加课程收入
    dailyCourse.forEach(item => {
      const dateStr = new Date(item.date).toISOString().split('T')[0];
      incomeMap.set(dateStr, (incomeMap.get(dateStr) || 0) + parseFloat(item.amount));
    });

    // 转换为数组
    const trend = Array.from(incomeMap.entries()).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2))
    }));

    successResponse(res, trend, '获取收入趋势成功');
  } catch (error: any) {
    console.error('获取收入趋势失败:', error);
    errorResponse(res, '获取收入趋势失败', 500, error.message);
  }
};
