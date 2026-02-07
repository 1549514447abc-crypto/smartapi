import express from 'express';
import { authenticate } from '../middleware/auth';
import * as userCategoryController from '../controllers/userCategoryController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有用户分类
router.get('/', userCategoryController.getCategories);

// 获取单个分类详情
router.get('/:id', userCategoryController.getCategory);

// 创建用户分类
router.post('/', userCategoryController.createCategory);

// 更新用户分类
router.put('/:id', userCategoryController.updateCategory);

// 删除用户分类
router.delete('/:id', userCategoryController.deleteCategory);

export default router;
