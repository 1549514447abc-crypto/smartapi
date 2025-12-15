import express from 'express';
import {
  getPromptList,
  getPromptDetail,
  purchasePrompt,
  getMyPrompts,
  getCategories,
  getAdminPromptList,
  upsertPrompt,
  deletePrompt,
  getAdminCategories,
  upsertCategory,
  deleteCategory,
  batchImportPrompts
} from '../controllers/promptController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

// 公开接口（支持可选登录以判断是否已购买）
router.get('/list', optionalAuth, getPromptList);
router.get('/categories', getCategories);
router.get('/detail/:id', optionalAuth, getPromptDetail);

// 需要登录的接口
router.post('/purchase/:id', authenticate, purchasePrompt);
router.get('/my', authenticate, getMyPrompts);

// 管理接口（需要登录）
router.get('/admin/list', authenticate, getAdminPromptList);
router.post('/admin/upsert', authenticate, upsertPrompt);
router.delete('/admin/:id', authenticate, deletePrompt);

// 分类管理（需要登录）
router.get('/admin/categories', authenticate, getAdminCategories);
router.post('/admin/categories/upsert', authenticate, upsertCategory);
router.delete('/admin/categories/:id', authenticate, deleteCategory);

// 批量导入（需要登录）
router.post('/admin/batch-import', authenticate, batchImportPrompts);

export default router;
