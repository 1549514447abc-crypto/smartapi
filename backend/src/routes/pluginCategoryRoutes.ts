/**
 * 插件分类路由
 */

import { Router } from 'express';
import {
  getPluginCategories,
  getPluginCategoryByKey,
  createPluginCategory,
  updatePluginCategory,
  deletePluginCategory
} from '../controllers/pluginCategoryController';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// 获取插件分类列表（支持管理员获取全部）
router.get('/', optionalAuth, getPluginCategories);

// 创建插件分类（管理员）
router.post('/', authenticate, requireAdmin, createPluginCategory);

// 更新插件分类（管理员）
router.put('/:id', authenticate, requireAdmin, updatePluginCategory);

// 删除插件分类（管理员）
router.delete('/:id', authenticate, requireAdmin, deletePluginCategory);

// 获取单个分类详情
router.get('/:categoryKey', getPluginCategoryByKey);

export default router;
