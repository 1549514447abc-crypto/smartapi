/**
 * 用户分类管理控制器（管理员）
 */

import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import UserCategory from '../models/UserCategory';

/**
 * 获取所有用户分类
 * GET /api/admin/user-categories
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // 检查管理员权限
    if (user.userType !== 'admin') {
      errorResponse(res, '需要管理员权限', 403);
      return;
    }

    const categories = await UserCategory.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });

    successResponse(res, { categories }, '获取成功');
  } catch (error: any) {
    console.error('获取用户分类失败:', error);
    errorResponse(res, '获取失败', 500, error.message);
  }
};

/**
 * 获取单个分类详情
 * GET /api/admin/user-categories/:id
 */
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.userType !== 'admin') {
      errorResponse(res, '需要管理员权限', 403);
      return;
    }

    const { id } = req.params;

    const category = await UserCategory.findByPk(id);
    if (!category) {
      errorResponse(res, '分类不存在', 404);
      return;
    }

    successResponse(res, { category }, '获取成功');
  } catch (error: any) {
    console.error('获取分类详情失败:', error);
    errorResponse(res, '获取失败', 500, error.message);
  }
};

/**
 * 创建用户分类
 * POST /api/admin/user-categories
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.userType !== 'admin') {
      errorResponse(res, '需要管理员权限', 403);
      return;
    }

    const {
      category_key,
      category_name,
      default_course_rate,
      default_membership_rate,
      description,
      sort_order
    } = req.body;

    // 验证必填字段
    if (!category_key || !category_name) {
      errorResponse(res, '分类标识和名称不能为空', 400);
      return;
    }

    // 检查分类标识是否已存在
    const existing = await UserCategory.findOne({
      where: { category_key }
    });

    if (existing) {
      errorResponse(res, '分类标识已存在', 400);
      return;
    }

    const category = await UserCategory.create({
      category_key,
      category_name,
      default_course_rate: default_course_rate || 10,
      default_membership_rate: default_membership_rate || 10,
      description: description || null,
      sort_order: sort_order || 999
    });

    successResponse(res, { category }, '创建成功', 201);
  } catch (error: any) {
    console.error('创建用户分类失败:', error);
    errorResponse(res, '创建失败', 500, error.message);
  }
};

/**
 * 更新用户分类
 * PUT /api/admin/user-categories/:id
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.userType !== 'admin') {
      errorResponse(res, '需要管理员权限', 403);
      return;
    }

    const { id } = req.params;
    const {
      category_name,
      default_course_rate,
      default_membership_rate,
      description,
      is_active,
      sort_order
    } = req.body;

    const category = await UserCategory.findByPk(id);
    if (!category) {
      errorResponse(res, '分类不存在', 404);
      return;
    }

    await category.update({
      category_name: category_name ?? category.category_name,
      default_course_rate: default_course_rate ?? category.default_course_rate,
      default_membership_rate: default_membership_rate ?? category.default_membership_rate,
      description: description !== undefined ? description : category.description,
      is_active: is_active ?? category.is_active,
      sort_order: sort_order ?? category.sort_order
    });

    successResponse(res, { category }, '更新成功');
  } catch (error: any) {
    console.error('更新用户分类失败:', error);
    errorResponse(res, '更新失败', 500, error.message);
  }
};

/**
 * 删除用户分类
 * DELETE /api/admin/user-categories/:id
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.userType !== 'admin') {
      errorResponse(res, '需要管理员权限', 403);
      return;
    }

    const { id } = req.params;

    const category = await UserCategory.findByPk(id);
    if (!category) {
      errorResponse(res, '分类不存在', 404);
      return;
    }

    // 不允许删除normal分类
    if (category.category_key === 'normal') {
      errorResponse(res, '不能删除默认分类', 400);
      return;
    }

    await category.destroy();

    successResponse(res, null, '删除成功');
  } catch (error: any) {
    console.error('删除用户分类失败:', error);
    errorResponse(res, '删除失败', 500, error.message);
  }
};
