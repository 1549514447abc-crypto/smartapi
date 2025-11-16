import express from 'express';
import {
  extractVideo,
  getTasks,
  getTaskById,
  deleteTask,
  getStatistics,
  getTokenConfig,
  updateTokenConfig
} from '../controllers/videoController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/video/extract
 * @desc    Extract video information from URL
 * @access  Private (requires authentication)
 */
router.post('/extract', authenticate, extractVideo);

/**
 * @route   GET /api/video/tasks
 * @desc    Get user's extraction tasks
 * @access  Private (requires authentication)
 */
router.get('/tasks', authenticate, getTasks);

/**
 * @route   GET /api/video/tasks/:id
 * @desc    Get task by ID
 * @access  Private (requires authentication)
 */
router.get('/tasks/:id', authenticate, getTaskById);

/**
 * @route   DELETE /api/video/tasks/:id
 * @desc    Delete task by ID
 * @access  Private (requires authentication)
 */
router.delete('/tasks/:id', authenticate, deleteTask);

/**
 * @route   GET /api/video/statistics
 * @desc    Get API statistics
 * @access  Private (requires authentication)
 */
router.get('/statistics', authenticate, getStatistics);

/**
 * Admin routes
 */

/**
 * @route   GET /api/video/admin/token-config
 * @desc    Get token configuration (admin only)
 * @access  Private + Admin
 */
router.get('/admin/token-config', authenticate, requireAdmin, getTokenConfig);

/**
 * @route   PUT /api/video/admin/token-config
 * @desc    Update token configuration (admin only)
 * @access  Private + Admin
 */
router.put('/admin/token-config', authenticate, requireAdmin, updateTokenConfig);

export default router;
