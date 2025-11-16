/**
 * 充值路由
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createRechargeOrder,
  mockPay,
  getOrderStatus,
  getRechargeHistory,
  getRechargeConfig
} from '../controllers/rechargeController';

const router = Router();

/**
 * GET /api/recharge/config
 * 获取充值配置（赠送规则等）
 * 公开接口
 */
router.get('/config', getRechargeConfig);

/**
 * POST /api/recharge/create
 * 创建充值订单
 * 需要登录
 */
router.post('/create', authenticate, createRechargeOrder);

/**
 * POST /api/recharge/mock-pay/:orderNo
 * 模拟支付（测试用）
 * 公开接口（方便测试）
 */
router.post('/mock-pay/:orderNo', mockPay);

/**
 * GET /api/recharge/order/:orderNo
 * 查询订单状态
 * 公开接口（用于轮询）
 */
router.get('/order/:orderNo', getOrderStatus);

/**
 * GET /api/recharge/history
 * 获取用户充值记录
 * 需要登录
 */
router.get('/history', authenticate, getRechargeHistory);

export default router;
