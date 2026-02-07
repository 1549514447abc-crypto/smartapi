import { Request, Response } from 'express';
import InvoiceApplication from '../models/InvoiceApplication';
import User from '../models/User';
import { successResponse, errorResponse } from '../utils/response';
import Joi from 'joi';
import { Op } from 'sequelize';
import sequelize from '../config/database';

/**
 * 计算用户已开票金额（已完成的申请）
 */
async function calculateTotalInvoiced(userId: number): Promise<number> {
  const result = await InvoiceApplication.findAll({
    where: {
      user_id: userId,
      status: 'completed'
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as any[];

  return Number(result[0]?.total || 0);
}

/**
 * Get user's invoice quota
 * GET /api/invoice/quota
 */
export const getInvoiceQuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const totalConsumed = Number(user.total_consumed || 0);
    const totalInvoiced = await calculateTotalInvoiced(userId);
    const availableAmount = Math.max(0, totalConsumed - totalInvoiced);

    successResponse(res, {
      total_consumed: totalConsumed,
      total_invoiced: totalInvoiced,
      available_amount: availableAmount
    });
  } catch (error: any) {
    console.error('Get invoice quota error:', error);
    errorResponse(res, '获取开票额度失败', 500, error.message);
  }
};

// Validation schema for invoice application
const applySchema = Joi.object({
  invoice_type: Joi.string().valid('normal', 'special').required(),
  title: Joi.string().max(200).required(),
  tax_number: Joi.string().max(30).allow('', null),
  amount: Joi.number().positive().required(),
  email: Joi.string().email().required(),
  remark: Joi.string().max(500).allow('', null)
});

// Validation schema for status update
const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'rejected').required(),
  admin_remark: Joi.string().max(500).allow('', null)
});

/**
 * Submit invoice application (user)
 * POST /api/invoice/apply
 */
export const applyInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = applySchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Check if special invoice requires tax_number
    if (value.invoice_type === 'special' && !value.tax_number) {
      errorResponse(res, '专用发票需要填写税号', 400);
      return;
    }

    // Get user info to verify consumed amount
    const user = await User.findByPk(userId);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    // 计算可开票余额
    const totalConsumed = Number(user.total_consumed || 0);
    const totalInvoiced = await calculateTotalInvoiced(userId);
    const availableAmount = Math.max(0, totalConsumed - totalInvoiced);

    // Check if amount exceeds available amount
    if (value.amount > availableAmount) {
      errorResponse(
        res,
        `开票金额与消费金额不符，请重新填写开票金额。您的累计消费 ¥${totalConsumed.toFixed(2)}，已开票 ¥${totalInvoiced.toFixed(2)}，可开票金额为 ¥${availableAmount.toFixed(2)}`,
        400
      );
      return;
    }

    // Create invoice application
    const application = await InvoiceApplication.create({
      user_id: userId,
      invoice_type: value.invoice_type,
      title: value.title,
      tax_number: value.tax_number || null,
      amount: value.amount,
      email: value.email,
      remark: value.remark || null,
      status: 'pending'
    });

    successResponse(res, application, '开票申请提交成功', 201);
  } catch (error: any) {
    console.error('Apply invoice error:', error);
    errorResponse(res, '提交开票申请失败', 500, error.message);
  }
};

/**
 * Get user's invoice applications
 * GET /api/invoice/my
 */
export const getMyApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await InvoiceApplication.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    successResponse(res, {
      list: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    });
  } catch (error: any) {
    console.error('Get my applications error:', error);
    errorResponse(res, '获取开票记录失败', 500, error.message);
  }
};

/**
 * Get all invoice applications (admin)
 * GET /api/admin/invoice
 */
export const getAllApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Build filters
    const where: any = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.invoice_type) {
      where.invoice_type = req.query.invoice_type;
    }

    if (req.query.keyword) {
      const keyword = req.query.keyword as string;
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } },
        { tax_number: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await InvoiceApplication.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phone']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    successResponse(res, {
      list: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    });
  } catch (error: any) {
    console.error('Get all applications error:', error);
    errorResponse(res, '获取开票申请列表失败', 500, error.message);
  }
};

/**
 * Update invoice application status (admin)
 * PUT /api/admin/invoice/:id/status
 */
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const applicationId = parseInt(req.params.id);
    const adminId = req.user?.userId;

    const application = await InvoiceApplication.findByPk(applicationId);
    if (!application) {
      errorResponse(res, '开票申请不存在', 404);
      return;
    }

    await application.update({
      status: value.status,
      admin_remark: value.admin_remark || application.admin_remark,
      processed_at: ['completed', 'rejected'].includes(value.status) ? new Date() : null,
      processed_by: adminId
    });

    successResponse(res, application, '状态更新成功');
  } catch (error: any) {
    console.error('Update application status error:', error);
    errorResponse(res, '更新状态失败', 500, error.message);
  }
};

/**
 * Get invoice statistics (admin)
 * GET /api/admin/invoice/stats
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [pending, processing, completed, rejected] = await Promise.all([
      InvoiceApplication.count({ where: { status: 'pending' } }),
      InvoiceApplication.count({ where: { status: 'processing' } }),
      InvoiceApplication.count({ where: { status: 'completed' } }),
      InvoiceApplication.count({ where: { status: 'rejected' } })
    ]);

    successResponse(res, {
      pending,
      processing,
      completed,
      rejected,
      total: pending + processing + completed + rejected
    });
  } catch (error: any) {
    console.error('Get invoice stats error:', error);
    errorResponse(res, '获取统计数据失败', 500, error.message);
  }
};

/**
 * Get user's invoice statistics (admin)
 * GET /api/invoice/admin/user/:userId/stats
 */
export const getUserInvoiceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId || isNaN(userId)) {
      errorResponse(res, '无效的用户ID', 400);
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'phone', 'email', 'total_consumed']
    });

    if (!user) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 计算开票统计
    const totalConsumed = Number(user.total_consumed || 0);
    const totalInvoiced = await calculateTotalInvoiced(userId);
    const availableAmount = Math.max(0, totalConsumed - totalInvoiced);

    // 获取用户开票历史
    const invoiceHistory = await InvoiceApplication.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 20,
      attributes: ['id', 'amount', 'status', 'invoice_type', 'title', 'created_at', 'processed_at']
    });

    successResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email
      },
      total_consumed: totalConsumed,
      total_invoiced: totalInvoiced,
      available_amount: availableAmount,
      invoice_history: invoiceHistory
    });
  } catch (error: any) {
    console.error('Get user invoice stats error:', error);
    errorResponse(res, '获取用户开票统计失败', 500, error.message);
  }
};
