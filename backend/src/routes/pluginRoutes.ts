import express from 'express';
import {
  getPlugins,
  getPluginById,
  createPlugin,
  updatePlugin,
  deletePlugin,
  installPlugin,
  uninstallPlugin,
  getMyInstalledPlugins,
  getPluginStatistics
} from '../controllers/pluginController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/plugins
 * @desc    Get all plugins with filtering and pagination
 * @access  Public
 * @query   page, limit, category, is_free, search, sort_by
 */
router.get('/', getPlugins);

/**
 * @route   GET /api/plugins/my/installed
 * @desc    Get user's installed plugins
 * @access  Private (requires authentication)
 */
router.get('/my/installed', authenticate, getMyInstalledPlugins);

/**
 * @route   GET /api/plugins/:id
 * @desc    Get plugin by ID
 * @access  Public
 */
router.get('/:id', getPluginById);

/**
 * @route   POST /api/plugins
 * @desc    Create a new plugin
 * @access  Private (requires authentication)
 */
router.post('/', authenticate, createPlugin);

/**
 * @route   PUT /api/plugins/:id
 * @desc    Update plugin
 * @access  Private (developer or admin)
 */
router.put('/:id', authenticate, updatePlugin);

/**
 * @route   DELETE /api/plugins/:id
 * @desc    Delete plugin
 * @access  Private (developer or admin)
 */
router.delete('/:id', authenticate, deletePlugin);

/**
 * @route   POST /api/plugins/:id/install
 * @desc    Install plugin
 * @access  Private (requires authentication)
 */
router.post('/:id/install', authenticate, installPlugin);

/**
 * @route   POST /api/plugins/:id/uninstall
 * @desc    Uninstall plugin
 * @access  Private (requires authentication)
 */
router.post('/:id/uninstall', authenticate, uninstallPlugin);

/**
 * Admin routes
 */

/**
 * @route   GET /api/plugins/admin/statistics
 * @desc    Get plugin statistics (admin only)
 * @access  Private + Admin
 */
router.get('/admin/statistics', authenticate, requireAdmin, getPluginStatistics);

export default router;
