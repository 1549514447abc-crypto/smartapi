import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllConfigs,
  getConfig,
  updateConfig,
  updateConfigs,
  initConfigs,
  getPublicPrices,
  getAgreements,
  getCourseQrCode,
  getBonusRules,
  updateBonusRule,
  updateBonusRules,
  deleteBonusRule
} from '../controllers/systemConfigController';

const router = Router();

// 公开接口（无需登录）
router.get('/prices', getPublicPrices);
router.get('/agreements', getAgreements);

// 需要登录但不需要管理员权限的接口
router.get('/course-qr-code', authenticate, getCourseQrCode);

// 以下路由需要管理员权限
router.use(authenticate, requireAdmin);

// 获取所有配置
router.get('/', getAllConfigs);

// 批量更新配置
router.put('/', updateConfigs);

// 初始化默认配置
router.post('/init', initConfigs);

// ========== 赠金规则管理 ==========
// 获取所有赠金规则
router.get('/bonus-rules', getBonusRules);

// 批量更新赠金规则
router.put('/bonus-rules', updateBonusRules);

// 更新单个赠金规则
router.put('/bonus-rules/:id', updateBonusRule);

// 删除赠金规则
router.delete('/bonus-rules/:id', deleteBonusRule);

// 获取单个配置 (放在最后，避免路径冲突)
router.get('/:key', getConfig);

// 更新单个配置
router.put('/:key', updateConfig);

export default router;
