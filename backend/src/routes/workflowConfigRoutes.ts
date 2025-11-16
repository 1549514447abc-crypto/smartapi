/**
 * 工作流配置路由
 */

import { Router } from 'express';
import {
  getPlatforms,
  getCategories,
  getPackages,
  getPlatformByKey,
  getPackageByKey
} from '../controllers/workflowConfigController';

const router = Router();

// 获取工作流平台列表
router.get('/platforms', getPlatforms);

// 获取工作流分类列表
router.get('/categories', getCategories);

// 获取会员套餐列表
router.get('/packages', getPackages);

// 获取单个平台详情
router.get('/platforms/:platformKey', getPlatformByKey);

// 获取单个套餐详情
router.get('/packages/:packageKey', getPackageByKey);

export default router;
