/**
 * 交易记录路由
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRechargeRecords,
  getConsumptionRecords,
  getCourseOrders,
  getVideoExtractions,
  getPromptPurchases,
  getTransactionSummary,
  adminGetAllTransactions,
  adminGetTransactionSummary,
  adminGetRechargeRecords
} from '../controllers/transactionController';

const router = Router();

// 所有路由需要登录
router.use(authenticate);

// ===== 用户端路由 =====
// 交易汇总
router.get('/summary', getTransactionSummary);

// 充值记录
router.get('/recharge', getRechargeRecords);

// 消费记录（余额变动）
router.get('/consumption', getConsumptionRecords);

// 课程订单
router.get('/orders', getCourseOrders);

// 视频提取记录
router.get('/video-extractions', getVideoExtractions);

// 提示词购买记录
router.get('/prompts', getPromptPurchases);

// ===== 管理员路由 =====
// 管理员交易统计汇总
router.get('/admin/summary', adminGetTransactionSummary);

// 管理员获取所有余额变动记录
router.get('/admin/all', adminGetAllTransactions);

// 管理员获取所有充值记录
router.get('/admin/recharge', adminGetRechargeRecords);

export default router;
