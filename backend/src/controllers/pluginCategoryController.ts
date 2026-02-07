/**
 * 插件分类控制器
 * 处理插件分类增删改查
 */

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * 获取插件分类列表
 * GET /api/plugin-categories
 */
export const getPluginCategories = async (req: Request, res: Response) => {
  try {
    // 管理后台获取所有分类（包括禁用的）
    const isAdmin = req.user?.userType === 'admin';
    const whereClause = isAdmin ? '' : 'WHERE is_active = 1';

    const categories: any[] = await sequelize.query(
      `SELECT
        id, category_key, category_name, icon,
        description, plugin_count, sort_order, is_active,
        created_at, updated_at
       FROM plugin_categories
       ${whereClause}
       ORDER BY sort_order ASC, id ASC`,
      {
        type: QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('获取插件分类列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取分类列表失败',
      details: error.message
    });
  }
};

/**
 * 获取单个分类详情
 * GET /api/plugin-categories/:categoryKey
 */
export const getPluginCategoryByKey = async (req: Request, res: Response) => {
  try {
    const { categoryKey } = req.params;

    const categories: any[] = await sequelize.query(
      `SELECT
        id, category_key, category_name, icon,
        description, plugin_count, sort_order
       FROM plugin_categories
       WHERE category_key = ? AND is_active = 1`,
      {
        replacements: [categoryKey],
        type: QueryTypes.SELECT
      }
    );

    if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        error: '分类不存在'
      });
    }

    return res.json({
      success: true,
      data: categories[0]
    });
  } catch (error: any) {
    console.error('获取插件分类详情失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取分类详情失败',
      details: error.message
    });
  }
};

/**
 * 创建插件分类
 * POST /api/plugin-categories
 */
export const createPluginCategory = async (req: Request, res: Response) => {
  try {
    const { category_key, category_name, icon, description, sort_order, is_active } = req.body;

    if (!category_key || !category_name || !icon) {
      return res.status(400).json({
        success: false,
        error: '分类标识、名称和图标不能为空'
      });
    }

    // 检查分类标识是否已存在
    const existing: any[] = await sequelize.query(
      'SELECT id FROM plugin_categories WHERE category_key = ?',
      {
        replacements: [category_key],
        type: QueryTypes.SELECT
      }
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: '分类标识已存在'
      });
    }

    await sequelize.query(
      `INSERT INTO plugin_categories
       (category_key, category_name, icon, description, sort_order, is_active, plugin_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      {
        replacements: [
          category_key,
          category_name,
          icon,
          description || null,
          sort_order || 0,
          is_active === undefined ? 1 : (is_active ? 1 : 0)
        ],
        type: QueryTypes.INSERT
      }
    );

    return res.json({
      success: true,
      message: '创建成功'
    });
  } catch (error: any) {
    console.error('创建插件分类失败:', error);
    return res.status(500).json({
      success: false,
      error: '创建分类失败',
      details: error.message
    });
  }
};

/**
 * 更新插件分类
 * PUT /api/plugin-categories/:id
 */
export const updatePluginCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_name, icon, description, sort_order, is_active } = req.body;

    if (!category_name || !icon) {
      return res.status(400).json({
        success: false,
        error: '分类名称和图标不能为空'
      });
    }

    await sequelize.query(
      `UPDATE plugin_categories
       SET category_name = ?, icon = ?, description = ?,
           sort_order = ?, is_active = ?
       WHERE id = ?`,
      {
        replacements: [
          category_name,
          icon,
          description || null,
          sort_order || 0,
          is_active ? 1 : 0,
          id
        ],
        type: QueryTypes.UPDATE
      }
    );

    return res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    console.error('更新插件分类失败:', error);
    return res.status(500).json({
      success: false,
      error: '更新分类失败',
      details: error.message
    });
  }
};

/**
 * 删除插件分类
 * DELETE /api/plugin-categories/:id
 */
export const deletePluginCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否有插件使用该分类
    const plugins: any[] = await sequelize.query(
      'SELECT COUNT(*) as count FROM plugins WHERE category = (SELECT category_key FROM plugin_categories WHERE id = ?)',
      {
        replacements: [id],
        type: QueryTypes.SELECT
      }
    );

    if (plugins[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: '该分类下还有插件，无法删除'
      });
    }

    await sequelize.query(
      'DELETE FROM plugin_categories WHERE id = ?',
      {
        replacements: [id],
        type: QueryTypes.DELETE
      }
    );

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('删除插件分类失败:', error);
    return res.status(500).json({
      success: false,
      error: '删除分类失败',
      details: error.message
    });
  }
};
