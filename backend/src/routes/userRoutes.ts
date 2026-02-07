import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserList,
  getUserDetail,
  updateUserStatus,
  updateUserMembership,
  adjustUserBalance,
  getUserStats,
  resetUserPassword,
  updateUserCommission
} from '../controllers/userController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取用户统计
router.get('/stats', getUserStats);

// 获取用户列表
router.get('/list', getUserList);

// 获取用户详情
router.get('/:id', getUserDetail);

// 更新用户状态
router.put('/:id/status', updateUserStatus);

// 更新用户会员状态
router.put('/:id/membership', updateUserMembership);

// 调整用户余额
router.post('/:id/balance', adjustUserBalance);

// 重置用户密码
router.post('/:id/reset-password', resetUserPassword);

// 更新用户佣金设置
router.put('/:id/commission', updateUserCommission);

export default router;
