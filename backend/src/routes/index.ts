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

export default router;
