/**
 * Webhook 路由
 * 处理来自 Supabase 的 Webhook 回调
 */

import { Router } from 'express';
import { receiveBalanceUpdate } from '../controllers/webhookController';

const router = Router();

/**
 * POST /api/webhook/supabase-balance-update
 * 接收 Supabase 余额变动通知
 */
router.post('/supabase-balance-update', receiveBalanceUpdate);

export default router;
