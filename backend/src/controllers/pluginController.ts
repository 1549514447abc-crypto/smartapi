import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Plugin from '../models/Plugin';
import UserPlugin from '../models/UserPlugin';
import User from '../models/User';
import { successResponse, errorResponse } from '../utils/response';
import Joi from 'joi';

// Validation schema for plugin creation
const createPluginSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().allow(null, ''),
  category: Joi.string().max(50).allow(null),
  icon_url: Joi.string().uri().max(500).allow(null, ''),
  plugin_config: Joi.object().allow(null),
  version: Joi.string().max(20).default('1.0.0'),
  is_free: Joi.boolean().default(true)
});

// Validation schema for plugin update
const updatePluginSchema = Joi.object({
  name: Joi.string().max(200),
  description: Joi.string().allow(null, ''),
  category: Joi.string().max(50).allow(null),
  icon_url: Joi.string().uri().max(500).allow(null, ''),
  plugin_config: Joi.object().allow(null),
  version: Joi.string().max(20),
  is_free: Joi.boolean(),
  status: Joi.string().valid('approved', 'pending', 'rejected', 'offline')
});

/**
 * Get all plugins with filtering, sorting, and pagination
 * GET /api/plugins
 */
export const getPlugins = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Filters
    const category = req.query.category as string;
    const isFree = req.query.is_free as string; // 'true', 'false', or undefined
    const search = req.query.search as string;
    const sortBy = req.query.sort_by as string || 'latest'; // latest, popular, rating

    // Build where clause
    const where: any = {
      status: 'approved' // Only show approved plugins
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (isFree === 'true') {
      where.is_free = true;
    } else if (isFree === 'false') {
      where.is_free = false;
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
        order = [['install_count', 'DESC']];
        break;
      case 'rating':
        order = [['rating', 'DESC'], ['review_count', 'DESC']];
        break;
      default:
        order = [['created_at', 'DESC']];
    }

    // Query plugins
    const { count, rows } = await Plugin.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'developer',
          attributes: ['id', 'username', 'nickname', 'avatar_url']
        }
      ]
    });

    successResponse(res, {
      plugins: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    }, 'Plugins retrieved successfully');

  } catch (error: any) {
    console.error('Get plugins error:', error);
    errorResponse(res, 'Failed to get plugins', 500, error.message);
  }
};

/**
 * Get plugin by ID
 * GET /api/plugins/:id
 */
export const getPluginById = async (req: Request, res: Response): Promise<void> => {
  try {
    const pluginId = parseInt(req.params.id);

    const plugin = await Plugin.findByPk(pluginId, {
      include: [
        {
          model: User,
          as: 'developer',
          attributes: ['id', 'username', 'nickname', 'avatar_url']
        }
      ]
    });

    if (!plugin) {
      errorResponse(res, 'Plugin not found', 404);
      return;
    }

    // Check if user can access this plugin
    if (plugin.status !== 'approved') {
      const userId = req.user?.userId;
      const isDeveloper = userId === plugin.developer_id;
      const isAdmin = req.user?.userType === 'admin';

      if (!isDeveloper && !isAdmin) {
        errorResponse(res, 'Plugin not accessible', 403);
        return;
      }
    }

    // Check if current user has installed this plugin
    let isInstalled = false;
    if (req.user?.userId) {
      const installation = await UserPlugin.findOne({
        where: {
          user_id: req.user.userId,
          plugin_id: pluginId
        }
      });
      isInstalled = !!installation;
    }

    successResponse(res, {
      ...plugin.toJSON(),
      is_installed: isInstalled
    }, 'Plugin retrieved successfully');

  } catch (error: any) {
    console.error('Get plugin error:', error);
    errorResponse(res, 'Failed to get plugin', 500, error.message);
  }
};

/**
 * Create a new plugin
 * POST /api/plugins
 */
export const createPlugin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Validate request body
    const { error, value } = createPluginSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    // Create plugin
    const plugin = await Plugin.create({
      ...value,
      developer_id: userId,
      status: 'pending' // New plugins need approval
    });

    successResponse(res, plugin, 'Plugin created successfully and pending approval', 201);

  } catch (error: any) {
    console.error('Create plugin error:', error);
    errorResponse(res, 'Failed to create plugin', 500, error.message);
  }
};

/**
 * Update plugin
 * PUT /api/plugins/:id
 */
export const updatePlugin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.userType === 'admin';
    const pluginId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find plugin
    const plugin = await Plugin.findByPk(pluginId);

    if (!plugin) {
      errorResponse(res, 'Plugin not found', 404);
      return;
    }

    // Check permissions
    const isDeveloper = userId === plugin.developer_id;
    if (!isDeveloper && !isAdmin) {
      errorResponse(res, 'Permission denied', 403);
      return;
    }

    // Validate request body
    const { error, value } = updatePluginSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    // Only admins can change status
    if (value.status && !isAdmin) {
      delete value.status;
    }

    // Update plugin
    await plugin.update(value);

    successResponse(res, plugin, 'Plugin updated successfully');

  } catch (error: any) {
    console.error('Update plugin error:', error);
    errorResponse(res, 'Failed to update plugin', 500, error.message);
  }
};

/**
 * Delete plugin
 * DELETE /api/plugins/:id
 */
export const deletePlugin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.userType === 'admin';
    const pluginId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find plugin
    const plugin = await Plugin.findByPk(pluginId);

    if (!plugin) {
      errorResponse(res, 'Plugin not found', 404);
      return;
    }

    // Check permissions
    const isDeveloper = userId === plugin.developer_id;
    if (!isDeveloper && !isAdmin) {
      errorResponse(res, 'Permission denied', 403);
      return;
    }

    // Delete plugin (also deletes related user_plugins records due to CASCADE)
    await plugin.destroy();

    successResponse(res, null, 'Plugin deleted successfully');

  } catch (error: any) {
    console.error('Delete plugin error:', error);
    errorResponse(res, 'Failed to delete plugin', 500, error.message);
  }
};

/**
 * Install plugin
 * POST /api/plugins/:id/install
 */
export const installPlugin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const pluginId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Check if plugin exists and is approved
    const plugin = await Plugin.findByPk(pluginId);

    if (!plugin) {
      errorResponse(res, 'Plugin not found', 404);
      return;
    }

    if (plugin.status !== 'approved') {
      errorResponse(res, 'Plugin is not available for installation', 403);
      return;
    }

    // Check if already installed
    const existingInstallation = await UserPlugin.findOne({
      where: {
        user_id: userId,
        plugin_id: pluginId
      }
    });

    if (existingInstallation) {
      errorResponse(res, 'Plugin already installed', 400);
      return;
    }

    // Install plugin
    await UserPlugin.create({
      user_id: userId,
      plugin_id: pluginId
    });

    // Increment install count
    await plugin.increment('install_count');

    successResponse(res, {
      plugin_id: pluginId,
      install_count: plugin.install_count + 1
    }, 'Plugin installed successfully');

  } catch (error: any) {
    console.error('Install plugin error:', error);
    errorResponse(res, 'Failed to install plugin', 500, error.message);
  }
};

/**
 * Uninstall plugin
 * POST /api/plugins/:id/uninstall
 */
export const uninstallPlugin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const pluginId = parseInt(req.params.id);

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    // Find installation
    const installation = await UserPlugin.findOne({
      where: {
        user_id: userId,
        plugin_id: pluginId
      }
    });

    if (!installation) {
      errorResponse(res, 'Plugin not installed', 400);
      return;
    }

    // Uninstall plugin
    await installation.destroy();

    // Decrement install count
    const plugin = await Plugin.findByPk(pluginId);
    if (plugin && plugin.install_count > 0) {
      await plugin.decrement('install_count');
    }

    successResponse(res, null, 'Plugin uninstalled successfully');

  } catch (error: any) {
    console.error('Uninstall plugin error:', error);
    errorResponse(res, 'Failed to uninstall plugin', 500, error.message);
  }
};

/**
 * Get user's installed plugins
 * GET /api/plugins/my/installed
 */
export const getMyInstalledPlugins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      errorResponse(res, 'User authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get user's installed plugins
    const { count, rows } = await UserPlugin.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['installed_at', 'DESC']],
      include: [
        {
          model: Plugin,
          as: 'plugin',
          include: [
            {
              model: User,
              as: 'developer',
              attributes: ['id', 'username', 'nickname', 'avatar_url']
            }
          ]
        }
      ]
    });

    successResponse(res, {
      plugins: rows.map(up => ({
        ...up.plugin?.toJSON(),
        installed_at: up.installed_at,
        last_used_at: up.last_used_at
      })),
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    }, 'Installed plugins retrieved successfully');

  } catch (error: any) {
    console.error('Get installed plugins error:', error);
    errorResponse(res, 'Failed to get installed plugins', 500, error.message);
  }
};

/**
 * Get plugin statistics (admin only)
 * GET /api/plugins/admin/statistics
 */
export const getPluginStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalPlugins = await Plugin.count();
    const approvedPlugins = await Plugin.count({ where: { status: 'approved' } });
    const pendingPlugins = await Plugin.count({ where: { status: 'pending' } });
    const rejectedPlugins = await Plugin.count({ where: { status: 'rejected' } });

    // Get category distribution
    const categoryStats = await Plugin.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    // Get installation statistics
    const totalInstallations = await UserPlugin.count();

    successResponse(res, {
      total_plugins: totalPlugins,
      approved_plugins: approvedPlugins,
      pending_plugins: pendingPlugins,
      rejected_plugins: rejectedPlugins,
      total_installations: totalInstallations,
      category_distribution: categoryStats
    }, 'Plugin statistics retrieved successfully');

  } catch (error: any) {
    console.error('Get plugin statistics error:', error);
    errorResponse(res, 'Failed to get statistics', 500, error.message);
  }
};
