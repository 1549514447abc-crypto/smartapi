import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  checkAccess,
  authorize,
  getUserInfo
} from '../controllers/jianyingClientController';

const router = Router();

// 所有接口都需要登录
router.use(authenticate);

// 检查客户端访问权限
router.get('/check-access', checkAccess);

// 授权客户端使用
router.post('/authorize', authorize);

// 获取用户信息
router.get('/user-info', getUserInfo);

export default router;
