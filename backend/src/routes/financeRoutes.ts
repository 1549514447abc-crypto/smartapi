/**
 * 财务报表路由
 */

import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getFinanceStats,
  getRecentOrders,
  getIncomeTrend
} from '../controllers/financeController';

const router = express.Router();

// 所有财务路由都需要管理员权限
router.use(authenticate);
router.use(requireAdmin);

// 获取财务统计
router.get('/stats', getFinanceStats as any);

// 获取最近订单
router.get('/recent-orders', getRecentOrders as any);

// 获取收入趋势
router.get('/trend', getIncomeTrend as any);

export default router;
