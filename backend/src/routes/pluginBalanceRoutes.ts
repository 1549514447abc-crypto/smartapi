/**
 * 插件余额API路由
 * 需要服务商密钥验证 + API Key 验证
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getBalance, deductBalance } from '../controllers/pluginBalanceController';
import rateLimit from 'express-rate-limit';
import { getPluginSecretKey, PLUGIN_SECRET_HEADER } from '../config/pluginSecret';

const router = Router();

// 限流：每分钟最多 60 次请求（防止滥用）
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 服务商密钥验证中间件
const verifyPluginSecret = (req: Request, res: Response, next: NextFunction): void => {
  const secret = req.headers[PLUGIN_SECRET_HEADER.toLowerCase()] as string;

  if (!secret) {
    res.status(401).json({
      success: false,
      message: '缺少服务商密钥'
    });
    return;
  }

  if (secret !== getPluginSecretKey()) {
    res.status(401).json({
      success: false,
      message: '服务商密钥无效'
    });
    return;
  }

  next();
};

router.use(limiter);
router.use(verifyPluginSecret);

/**
 * @route   GET /api/plugin/balance
 * @desc    获取用户余额
 * @access  Public (API Key 验证)
 * @query   api_key - 用户的 API Key
 */
router.get('/balance', getBalance);

/**
 * @route   POST /api/plugin/balance/deduct
 * @desc    扣减用户余额
 * @access  Public (API Key 验证)
 * @body    api_key - 用户的 API Key
 * @body    amount - 扣减金额
 * @body    service_name - 服务名称（可选）
 * @body    description - 扣费描述（可选）
 */
router.post('/balance/deduct', deductBalance);

export default router;
