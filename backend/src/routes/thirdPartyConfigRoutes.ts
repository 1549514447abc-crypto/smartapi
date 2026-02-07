import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAlipayConfig,
  getWechatPayConfig,
  getWechatMpConfig,
  getWechatTransferConfig,
  getSmsConfig,
  getConfigOverview,
  testAlipayConnection,
  testWechatPayConnection,
  testSmsService,
} from '../controllers/thirdPartyConfigController';

const router = Router();

// 所有路由需要管理员权限
router.use(authenticate, requireAdmin);

// 获取配置概览
router.get('/overview', getConfigOverview);

// 支付宝配置
router.get('/alipay', getAlipayConfig);
router.post('/alipay/test', testAlipayConnection);

// 微信支付配置
router.get('/wechat-pay', getWechatPayConfig);
router.post('/wechat-pay/test', testWechatPayConnection);

// 微信公众号配置
router.get('/wechat-mp', getWechatMpConfig);

// 微信转账配置
router.get('/wechat-transfer', getWechatTransferConfig);

// 短信配置
router.get('/sms', getSmsConfig);
router.post('/sms/test', testSmsService);

export default router;
