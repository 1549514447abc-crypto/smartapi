import express from 'express';
import { getSystemStatus } from '../controllers/systemController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/admin/system-status
 * @desc    Get system status (admin only)
 * @access  Private + Admin
 */
router.get('/system-status', authenticate, requireAdmin, getSystemStatus);

export default router;
