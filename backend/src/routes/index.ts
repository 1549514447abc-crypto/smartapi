import express from 'express';
import authRoutes from './authRoutes';
import videoRoutes from './videoRoutes';
import workflowRoutes from './workflowRoutes';
import pluginRoutes from './pluginRoutes';
import webhookRoutes from './webhookRoutes';
import rechargeRoutes from './rechargeRoutes';
import apiKeyRoutes from './apiKeyRoutes';
import workflowConfigRoutes from './workflowConfigRoutes';
import pluginCategoryRoutes from './pluginCategoryRoutes';
import courseRoutes from './courseRoutes';
import referralRoutes from './referral';
import appDownloadRoutes from './appDownloadRoutes';
import promptRoutes from './promptRoutes';
import userRoutes from './userRoutes';
import polymarketRoutes from './polymarketRoutes';
import paymentRoutes from './paymentRoutes';
import transactionRoutes from './transactionRoutes';
import systemConfigRoutes from './systemConfigRoutes';
import uploadRoutes from './uploadRoutes';
import financeRoutes from './financeRoutes';
import wechatRoutes from './wechatRoutes';
import pluginBalanceRoutes from './pluginBalanceRoutes';
import invoiceRoutes from './invoiceRoutes';
import commissionRoutes from './commissionRoutes';
import withdrawalAdminRoutes from './withdrawalAdminRoutes';
import thirdPartyConfigRoutes from './thirdPartyConfigRoutes';
import userCategoryRoutes from './userCategoryRoutes';
import systemRoutes from './systemRoutes';
import jianyingClientRoutes from './jianyingClientRoutes';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartAPI Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/video', videoRoutes);
router.use('/workflows', workflowRoutes);
router.use('/plugins', pluginRoutes);
router.use('/webhook', webhookRoutes);
router.use('/recharge', rechargeRoutes);
router.use('/apikey', apiKeyRoutes);
router.use('/workflow-config', workflowConfigRoutes);
router.use('/plugin-categories', pluginCategoryRoutes);
router.use('/course', courseRoutes);
router.use('/referral', referralRoutes);
router.use('/apps', appDownloadRoutes);
router.use('/prompts', promptRoutes);
router.use('/users', userRoutes);
router.use('/polymarket', polymarketRoutes);
router.use('/payment', paymentRoutes);
router.use('/transactions', transactionRoutes);
router.use('/system-config', systemConfigRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin/finance', financeRoutes);
router.use('/wechat', wechatRoutes);
router.use('/plugin', pluginBalanceRoutes);
router.use('/invoice', invoiceRoutes);
router.use('/commission', commissionRoutes);
router.use('/admin/withdrawals', withdrawalAdminRoutes);
router.use('/admin/third-party', thirdPartyConfigRoutes);
router.use('/admin/user-categories', userCategoryRoutes);
router.use('/admin', systemRoutes);
router.use('/jianying-client', jianyingClientRoutes);

export default router;
