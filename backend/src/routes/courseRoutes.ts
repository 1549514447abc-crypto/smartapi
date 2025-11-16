import { Router } from 'express';
import {
  getCourseInfo,
  getLessons,
  getVideoStream,
  createOrder,
  getMyOrders,
  getOrderDetail
} from '../controllers/courseController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 公开接口
router.get('/info', getCourseInfo);                    // 获取课程信息
router.get('/lessons', getLessons);                    // 获取试听课列表
router.get('/lessons/:id/video', getVideoStream);      // 获取视频流

// 需要登录的接口
router.post('/orders', authenticate, createOrder);      // 创建订单
router.get('/orders/my', authenticate, getMyOrders);    // 获取我的订单
router.get('/orders/:orderNo', authenticate, getOrderDetail); // 获取订单详情

export default router;
