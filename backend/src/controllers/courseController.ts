import { Request, Response } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import CourseSetting from '../models/CourseSetting';
import CourseLesson from '../models/CourseLesson';
import CourseOrder from '../models/CourseOrder';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 获取课程信息
 */
export const getCourseInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取第一条课程设置记录（系统只有一门课程）
    const courseSetting = await CourseSetting.findOne({
      order: [['id', 'ASC']]
    });

    if (!courseSetting) {
      errorResponse(res, 'Course not found', 404);
      return;
    }

    successResponse(res, courseSetting);
  } catch (error: any) {
    console.error('Get course info error:', error);
    errorResponse(res, error.message || 'Failed to get course info', 500);
  }
};

/**
 * 获取试听课列表
 */
export const getLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const lessons = await CourseLesson.findAll({
      attributes: ['id', 'title', 'duration', 'sort_order'],
      order: [['sort_order', 'ASC']]
    });

    successResponse(res, { lessons });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    errorResponse(res, error.message || 'Failed to get lessons', 500);
  }
};

/**
 * 获取视频流（支持断点续传）
 */
export const getVideoStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const lessonId = parseInt(req.params.id);

    // 查找课程
    const lesson = await CourseLesson.findByPk(lessonId);
    if (!lesson) {
      errorResponse(res, 'Lesson not found', 404);
      return;
    }

    // 构建视频文件绝对路径
    const videoPath = path.join(__dirname, '../../', lesson.video_path);

    // 检查文件是否存在
    if (!existsSync(videoPath)) {
      console.error('Video file not found:', videoPath);
      errorResponse(res, 'Video file not found', 404);
      return;
    }

    // 获取文件信息
    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // 支持断点续传
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const fileStream = createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });

      fileStream.pipe(res);
    } else {
      // 不支持断点续传，直接返回整个文件
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });

      const fileStream = createReadStream(videoPath);
      fileStream.pipe(res);
    }
  } catch (error: any) {
    console.error('Get video stream error:', error);
    errorResponse(res, error.message || 'Failed to get video stream', 500);
  }
};

/**
 * 创建订单
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    // 获取课程信息
    const courseSetting = await CourseSetting.findOne({
      order: [['id', 'ASC']]
    });

    if (!courseSetting) {
      errorResponse(res, 'Course not found', 404);
      return;
    }

    // 生成订单号（格式：ORDER-YYYYMMDD-随机6位数字）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderNo = `ORDER-${dateStr}-${randomNum}`;

    // 创建订单
    const order = await CourseOrder.create({
      order_no: orderNo,
      user_id: userId,
      course_title: courseSetting.title,
      amount: courseSetting.current_price,
      status: 'pending'
    });

    // 返回订单信息和二维码
    successResponse(res, {
      order_no: order.order_no,
      course_title: order.course_title,
      amount: order.amount,
      wechat_qr_image: courseSetting.wechat_qr_image,
      created_at: order.created_at
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

/**
 * 获取我的订单列表
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const orders = await CourseOrder.findAll({
      where: { user_id: userId },
      attributes: ['id', 'order_no', 'course_title', 'amount', 'status', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    successResponse(res, { orders });
  } catch (error: any) {
    console.error('Get my orders error:', error);
    errorResponse(res, error.message || 'Failed to get orders', 500);
  }
};

/**
 * 获取订单详情
 */
export const getOrderDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const orderNo = req.params.orderNo;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const order = await CourseOrder.findOne({
      where: {
        order_no: orderNo,
        user_id: userId
      }
    });

    if (!order) {
      errorResponse(res, 'Order not found', 404);
      return;
    }

    // 获取课程信息（获取二维码）
    const courseSetting = await CourseSetting.findOne({
      order: [['id', 'ASC']]
    });

    successResponse(res, {
      ...order.toJSON(),
      wechat_qr_image: courseSetting?.wechat_qr_image || null
    });
  } catch (error: any) {
    console.error('Get order detail error:', error);
    errorResponse(res, error.message || 'Failed to get order detail', 500);
  }
};
