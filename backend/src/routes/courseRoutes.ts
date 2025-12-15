import { Router } from 'express';
import {
  getCourseInfo,
  getLessons,
  getExtras,
  getFullCourseData,
  getVideoStream,
  createOrder,
  getMyOrders,
  getOrderDetail
} from '../controllers/courseController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 公开接口
router.get('/info', getCourseInfo);                    // 获取课程信息
router.get('/lessons', getLessons);                    // 获取课程章节列表
router.get('/extras', getExtras);                      // 获取附赠内容
router.get('/full', getFullCourseData);                // 获取完整课程数据
router.get('/lessons/:id/video', getVideoStream);      // 获取视频流

// 需要登录的接口
router.post('/orders', authenticate, createOrder);      // 创建订单
router.get('/orders/my', authenticate, getMyOrders);    // 获取我的订单
router.get('/orders/:orderNo', authenticate, getOrderDetail); // 获取订单详情

export default router;
