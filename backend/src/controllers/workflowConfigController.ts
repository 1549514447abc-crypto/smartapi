/**
 * 工作流配置控制器
 * 处理工作流平台、分类、会员套餐的查询
 */

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * 获取工作流平台列表
 * GET /api/workflow-config/platforms
 */
export const getPlatforms = async (req: Request, res: Response) => {
  try {
    const platforms: any[] = await sequelize.query(
      `SELECT
        id, platform_key, platform_name, description,
        yearly_price, features, icon_url, is_hot, sort_order
       FROM workflow_platforms
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      {
        type: QueryTypes.SELECT
      }
    );

    // 解析 JSON 字段
    const formattedPlatforms = platforms.map(platform => ({
      ...platform,
      features: typeof platform.features === 'string'
        ? JSON.parse(platform.features)
        : platform.features
    }));

    return res.json({
      success: true,
      data: formattedPlatforms
    });
  } catch (error: any) {
    console.error('获取工作流平台列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取平台列表失败',
      details: error.message
    });
  }
};

/**
 * 获取工作流分类列表
 * GET /api/workflow-config/categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories: any[] = await sequelize.query(
      `SELECT
        id, category_key, category_name, icon,
        description, workflow_count, sort_order
       FROM workflow_categories
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
    console.error('获取工作流分类列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取分类列表失败',
      details: error.message
    });
  }
};

/**
 * 获取会员套餐列表
 * GET /api/workflow-config/packages
 */
export const getPackages = async (req: Request, res: Response) => {
  try {
    const packages: any[] = await sequelize.query(
      `SELECT
        p.id, p.package_key, p.package_name, p.package_type,
        p.platform_key, p.description, p.original_price, p.current_price,
        p.discount_rate, p.features, p.savings_text, p.is_popular, p.sort_order,
        w.platform_name
       FROM membership_packages p
       LEFT JOIN workflow_platforms w ON p.platform_key = w.platform_key
       WHERE p.is_active = 1
       ORDER BY p.sort_order ASC, p.id ASC`,
      {
        type: QueryTypes.SELECT
      }
    );

    // 解析 JSON 字段
    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      features: typeof pkg.features === 'string'
        ? JSON.parse(pkg.features)
        : pkg.features
    }));

    return res.json({
      success: true,
      data: formattedPackages
    });
  } catch (error: any) {
    console.error('获取会员套餐列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取套餐列表失败',
      details: error.message
    });
  }
};

/**
 * 获取单个平台详情
 * GET /api/workflow-config/platforms/:platformKey
 */
export const getPlatformByKey = async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;

    const platforms: any[] = await sequelize.query(
      `SELECT
        id, platform_key, platform_name, description,
        yearly_price, features, icon_url, is_hot
       FROM workflow_platforms
       WHERE platform_key = ? AND is_active = 1`,
      {
        replacements: [platformKey],
        type: QueryTypes.SELECT
      }
    );

    if (!platforms || platforms.length === 0) {
      return res.status(404).json({
        success: false,
        error: '平台不存在'
      });
    }

    const platform = platforms[0];
    platform.features = typeof platform.features === 'string'
      ? JSON.parse(platform.features)
      : platform.features;

    return res.json({
      success: true,
      data: platform
    });
  } catch (error: any) {
    console.error('获取平台详情失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取平台详情失败',
      details: error.message
    });
  }
};

/**
 * 获取单个套餐详情
 * GET /api/workflow-config/packages/:packageKey
 */
export const getPackageByKey = async (req: Request, res: Response) => {
  try {
    const { packageKey } = req.params;

    const packages: any[] = await sequelize.query(
      `SELECT
        p.id, p.package_key, p.package_name, p.package_type,
        p.platform_key, p.description, p.original_price, p.current_price,
        p.discount_rate, p.features, p.savings_text, p.is_popular,
        w.platform_name
       FROM membership_packages p
       LEFT JOIN workflow_platforms w ON p.platform_key = w.platform_key
       WHERE p.package_key = ? AND p.is_active = 1`,
      {
        replacements: [packageKey],
        type: QueryTypes.SELECT
      }
    );

    if (!packages || packages.length === 0) {
      return res.status(404).json({
        success: false,
        error: '套餐不存在'
      });
    }

    const pkg = packages[0];
    pkg.features = typeof pkg.features === 'string'
      ? JSON.parse(pkg.features)
      : pkg.features;

    return res.json({
      success: true,
      data: pkg
    });
  } catch (error: any) {
    console.error('获取套餐详情失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取套餐详情失败',
      details: error.message
    });
  }
};
