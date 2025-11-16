/**
 * 插件分类路由
 */

import { Router } from 'express';
import {
  getPluginCategories,
  getPluginCategoryByKey
} from '../controllers/pluginCategoryController';

const router = Router();

// 获取插件分类列表
router.get('/', getPluginCategories);

// 获取单个分类详情
router.get('/:categoryKey', getPluginCategoryByKey);

export default router;
