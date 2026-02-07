/**
 * 工作流配置路由
 */

import { Router } from 'express';
import {
  getPlatforms,
  getCategories,
  getPackages,
  getPlatformByKey,
  getPackageByKey,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/workflowConfigController';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// 获取工作流平台列表
router.get('/platforms', getPlatforms);

// 获取工作流分类列表（支持管理员获取全部）
router.get('/categories', optionalAuth, getCategories);

// 创建工作流分类（管理员）
router.post('/categories', authenticate, requireAdmin, createCategory);

// 更新工作流分类（管理员）
router.put('/categories/:id', authenticate, requireAdmin, updateCategory);

// 删除工作流分类（管理员）
router.delete('/categories/:id', authenticate, requireAdmin, deleteCategory);

// 获取会员套餐列表
router.get('/packages', getPackages);

// 获取单个平台详情
router.get('/platforms/:platformKey', getPlatformByKey);

// 获取单个套餐详情
router.get('/packages/:packageKey', getPackageByKey);

export default router;
