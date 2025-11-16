/**
 * 插件分类控制器
 * 处理插件分类查询
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
    const categories: any[] = await sequelize.query(
      `SELECT
        id, category_key, category_name, icon,
        description, plugin_count, sort_order
       FROM plugin_categories
       WHERE is_active = 1
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
