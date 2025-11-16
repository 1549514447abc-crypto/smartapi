import express from 'express';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  useWorkflow,
  getWorkflowStatistics
} from '../controllers/workflowController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/workflows
 * @desc    Get all workflows with filtering and pagination
 * @access  Public
 * @query   page, limit, category, platform, price_filter, search, sort_by
 */
router.get('/', getWorkflows);

/**
 * @route   GET /api/workflows/:id
 * @desc    Get workflow by ID
 * @access  Public (increments view count)
 */
router.get('/:id', getWorkflowById);

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Private (requires authentication)
 */
router.post('/', authenticate, createWorkflow);

/**
 * @route   PUT /api/workflows/:id
 * @desc    Update workflow
 * @access  Private (creator or admin)
 */
router.put('/:id', authenticate, updateWorkflow);

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete workflow
 * @access  Private (creator or admin)
 */
router.delete('/:id', authenticate, deleteWorkflow);

/**
 * @route   POST /api/workflows/:id/use
 * @desc    Use workflow (increment use count)
 * @access  Public
 */
router.post('/:id/use', useWorkflow);

/**
 * Admin routes
 */

/**
 * @route   GET /api/workflows/admin/statistics
 * @desc    Get workflow statistics (admin only)
 * @access  Private + Admin
 */
router.get('/admin/statistics', authenticate, requireAdmin, getWorkflowStatistics);

export default router;
