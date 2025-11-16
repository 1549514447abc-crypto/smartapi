import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Workflow from '../models/Workflow';
import User from '../models/User';
import { successResponse, errorResponse } from '../utils/response';
import Joi from 'joi';

// Validation schema for workflow creation
const createWorkflowSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().allow(null, ''),
  category: Joi.string().valid('video', 'scraping', 'image', 'content', 'automation', 'social', 'analysis', 'other').allow(null),
  platform: Joi.string().valid('coze', 'make', 'n8n', 'comfyui').allow(null),
  cover_url: Joi.string().uri().max(500).allow(null, ''),
  workflow_config: Joi.object().allow(null),
  price: Joi.number().min(0).default(0),
  is_svip_free: Joi.boolean().default(true),
  is_public: Joi.boolean().default(true)
});

// Validation schema for workflow update
const updateWorkflowSchema = Joi.object({
  name: Joi.string().max(200),
  description: Joi.string().allow(null, ''),
  category: Joi.string().valid('video', 'scraping', 'image', 'content', 'automation', 'social', 'analysis', 'other').allow(null),
  platform: Joi.string().valid('coze', 'make', 'n8n', 'comfyui').allow(null),
  cover_url: Joi.string().uri().max(500).allow(null, ''),
  workflow_config: Joi.object().allow(null),
  price: Joi.number().min(0),
  is_svip_free: Joi.boolean(),
  is_public: Joi.boolean(),
  status: Joi.string().valid('published', 'draft', 'offline')
});

/**
 * Get all workflows with filtering, sorting, and pagination
 * GET /api/workflows
 */
export const getWorkflows = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Filters
    const category = req.query.category as string;
    const platform = req.query.platform as string;
    const priceFilter = req.query.price_filter as string; // 'free', 'paid', 'svip'
    const search = req.query.search as string;
    const sortBy = req.query.sort_by as string || 'latest'; // latest, popular, rating, price_low, price_high

    // Build where clause
    const where: any = {
      status: 'published',
      is_public: true
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (platform && platform !== 'all') {
      where.platform = platform;
    }

    if (priceFilter) {
      switch (priceFilter) {
        case 'free':
          where.price = 0;
          break;
        case 'paid':
          where.price = { [Op.gt]: 0 };
          break;
        case 'svip':
          where.is_svip_free = true;
          break;
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build order clause
    let order: any[] = [];
    switch (sortBy) {
      case 'latest':
        order = [['created_at', 'DESC']];
        break;
      case 'popular':
        order = [['use_count', 'DESC'], ['view_count', 'DESC']];
        break;
      case 'rating':
        order = [['rating', 'DESC']];
        break;
      case 'price_low':
        order = [['price', 'ASC']];
        break;
      case 'price_high':
        order = [['price', 'DESC']];
        break;
      default:
        order = [['created_at', 'DESC']];
    }

    // Query workflows
    const { count, rows } = await Workflow.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar_url']
        }
      ]
    });

    successResponse(res, {
      workflows: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    }, 'Workflows retrieved successfully');

  } catch (error: any) {
    console.error('Get workflows error:', error);
    errorResponse(res, 'Failed to get workflows', 500, error.message);
  }
};

/**
 * Get workflow by ID
 * GET /api/workflows/:id
 */
export const getWorkflowById = async (req: Request, res: Response): Promise<void> => {
  try {
    const workflowId = parseInt(req.params.id);

    const workflow = await Workflow.findByPk(workflowId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar_url']
        }
      ]
    });

    if (!workflow) {
      errorResponse(res, 'Workflow not found', 404);
      return;
    }

    // Check if user can access this workflow
    if (workflow.status !== 'published' || !workflow.is_public) {
      const userId = req.user?.userId;
      const isCreator = userId === workflow.creator_id;
      const isAdmin = req.user?.userType === 'admin';

      if (!isCreator && !isAdmin) {
        errorResponse(res, 'Workflow not accessible', 403);
        return;
      }
    }

    // Increment view count
    await workflow.increment('view_count');

    successResponse(res, workflow, 'Workflow retrieved successfully');

  } catch (error: any) {
    console.error('Get workflow error:', error);
    errorResponse(res, 'Failed to get workflow', 500, error.message);
  }
};

/**
 * Create a new workflow
 * POST /api/workflows
 */
export const createWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Validate request body
    const { error, value } = createWorkflowSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    // Create workflow
    const workflow = await Workflow.create({
      ...value,
      creator_id: userId,
      status: 'draft' // New workflows start as draft
    });

    successResponse(res, workflow, 'Workflow created successfully', 201);

  } catch (error: any) {
    console.error('Create workflow error:', error);
    errorResponse(res, 'Failed to create workflow', 500, error.message);
  }
};

/**
 * Update workflow
 * PUT /api/workflows/:id
 */
export const updateWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.userType === 'admin';
    const workflowId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find workflow
    const workflow = await Workflow.findByPk(workflowId);

    if (!workflow) {
      errorResponse(res, 'Workflow not found', 404);
      return;
    }

    // Check permissions
    const isCreator = userId === workflow.creator_id;
    if (!isCreator && !isAdmin) {
      errorResponse(res, 'Permission denied', 403);
      return;
    }

    // Validate request body
    const { error, value } = updateWorkflowSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    // Update workflow
    await workflow.update(value);

    successResponse(res, workflow, 'Workflow updated successfully');

  } catch (error: any) {
    console.error('Update workflow error:', error);
    errorResponse(res, 'Failed to update workflow', 500, error.message);
  }
};

/**
 * Delete workflow
 * DELETE /api/workflows/:id
 */
export const deleteWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.userType === 'admin';
    const workflowId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find workflow
    const workflow = await Workflow.findByPk(workflowId);

    if (!workflow) {
      errorResponse(res, 'Workflow not found', 404);
      return;
    }

    // Check permissions
    const isCreator = userId === workflow.creator_id;
    if (!isCreator && !isAdmin) {
      errorResponse(res, 'Permission denied', 403);
      return;
    }

    // Delete workflow
    await workflow.destroy();

    successResponse(res, null, 'Workflow deleted successfully');

  } catch (error: any) {
    console.error('Delete workflow error:', error);
    errorResponse(res, 'Failed to delete workflow', 500, error.message);
  }
};

/**
 * Use workflow (increment use count)
 * POST /api/workflows/:id/use
 */
export const useWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const workflowId = parseInt(req.params.id);

    const workflow = await Workflow.findByPk(workflowId);

    if (!workflow) {
      errorResponse(res, 'Workflow not found', 404);
      return;
    }

    if (workflow.status !== 'published' || !workflow.is_public) {
      errorResponse(res, 'Workflow not accessible', 403);
      return;
    }

    // Increment use count
    await workflow.increment('use_count');

    successResponse(res, {
      workflow_id: workflow.id,
      use_count: workflow.use_count + 1
    }, 'Workflow use count incremented');

  } catch (error: any) {
    console.error('Use workflow error:', error);
    errorResponse(res, 'Failed to use workflow', 500, error.message);
  }
};

/**
 * Get workflow statistics (admin only)
 * GET /api/workflows/admin/statistics
 */
export const getWorkflowStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalWorkflows = await Workflow.count();
    const publishedWorkflows = await Workflow.count({ where: { status: 'published' } });
    const draftWorkflows = await Workflow.count({ where: { status: 'draft' } });

    // Get category distribution
    const categoryStats = await Workflow.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    // Get platform distribution
    const platformStats = await Workflow.findAll({
      attributes: [
        'platform',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['platform'],
      raw: true
    });

    successResponse(res, {
      total_workflows: totalWorkflows,
      published_workflows: publishedWorkflows,
      draft_workflows: draftWorkflows,
      category_distribution: categoryStats,
      platform_distribution: platformStats
    }, 'Workflow statistics retrieved successfully');

  } catch (error: any) {
    console.error('Get workflow statistics error:', error);
    errorResponse(res, 'Failed to get statistics', 500, error.message);
  }
};
