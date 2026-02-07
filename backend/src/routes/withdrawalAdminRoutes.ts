/**
 * 提现管理路由（管理员）
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as withdrawalAdminController from '../controllers/withdrawalAdminController';

const router = Router();

// 所有路由都需要管理员权限
router.use(authenticate);
router.use(requireAdmin);

// 获取提现列表
router.get('/', withdrawalAdminController.getWithdrawals);

// 获取提现统计
router.get('/stats', withdrawalAdminController.getWithdrawalStats);

// 查询微信商户账户余额
router.get('/wechat-balance', withdrawalAdminController.getWechatBalance);

// 审核提现申请
router.post('/:id/review', withdrawalAdminController.reviewWithdrawal);

// 执行转账
router.post('/:id/transfer', withdrawalAdminController.executeTransfer);

// 获取转账明细
router.get('/:id/transfers', withdrawalAdminController.getTransferDetails);

// 重试失败的转账
router.post('/:id/retry', withdrawalAdminController.retryTransfer);

// 取消等待用户确认的转账
router.post('/:id/cancel', withdrawalAdminController.cancelTransfer);

export default router;
