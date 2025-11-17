import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getReferralStats,
  getReferralList,
  getCommissionList
} from '../controllers/referralController';

const router = express.Router();

// 获取推广统计
router.get('/stats', authenticate, getReferralStats);

// 获取推广列表
router.get('/list', authenticate, getReferralList);

// 获取佣金记录
router.get('/commissions', authenticate, getCommissionList);

export default router;
