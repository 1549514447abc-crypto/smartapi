/**
 * 佣金相关路由
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as commissionController from '../controllers/commissionController';

const router = Router();

// 公开接口
router.get('/validate-code/:code', commissionController.validateReferralCode);
router.get('/withdrawal-config', commissionController.getWithdrawalConfig);

// 需要登录的接口
router.get('/referral-code', authenticate, commissionController.getReferralCode);
router.get('/referrer', authenticate, commissionController.getReferrer);
router.post('/bind-referrer', authenticate, commissionController.bindReferrer);
router.get('/stats', authenticate, commissionController.getStats);
router.get('/referrals', authenticate, commissionController.getReferrals);
router.get('/records', authenticate, commissionController.getCommissionRecords);
router.post('/withdraw', authenticate, commissionController.requestWithdrawal);
router.get('/withdrawals', authenticate, commissionController.getWithdrawals);
router.post('/withdrawals/:id/refresh', authenticate, commissionController.refreshWithdrawalStatus);

export default router;
