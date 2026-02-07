import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  payByBalance,
  alipayNotify,
  alipayReturn,
  getAlipayStatus,
  wechatNotify,
  getWechatStatus,
  getUpgradePrice,
  upgradeToCourse
} from '../controllers/paymentController';

const router = Router();

// ===== 余额支付 =====
router.post('/pay-by-balance', authenticate, payByBalance);

// ===== 会员升级 =====
// 获取升级价格（公开接口）
router.get('/upgrade-price', getUpgradePrice);
// 升级为课程会员（需登录）
router.post('/upgrade-to-course', authenticate, upgradeToCourse);

// ===== 支付宝支付 =====
// 支付宝异步通知（无需登录，支付宝服务器调用）
router.post('/alipay/notify', alipayNotify);

// 支付宝同步返回（无需登录，用户浏览器跳转）
router.get('/alipay/return', alipayReturn);

// 检查支付宝服务状态
router.get('/alipay/status', getAlipayStatus);

// ===== 微信支付 =====
// 微信支付异步通知（无需登录，微信服务器调用）
router.post('/wechat/notify', wechatNotify);

// 检查微信支付服务状态
router.get('/wechat/status', getWechatStatus);

export default router;
