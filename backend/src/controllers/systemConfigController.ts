import { Request, Response } from 'express';
import SystemConfig, { ConfigKey, DEFAULT_CONFIG } from '../models/SystemConfig';
import { successResponse, errorResponse } from '../utils/response';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

// 获取所有系统配置
export const getAllConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await SystemConfig.getAllConfigs();

    // 转换为前端友好的格式
    const configList = Object.entries(configs).map(([key, { value, description }]) => ({
      key,
      value,
      description,
      type: getConfigType(key as ConfigKey)
    }));

    return successResponse(res, configList);
  } catch (error) {
    console.error('获取系统配置失败:', error);
    return errorResponse(res, '获取系统配置失败');
  }
};

// 获取单个配置
export const getConfig = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await SystemConfig.getConfig(key as ConfigKey);
    const description = DEFAULT_CONFIG[key as ConfigKey]?.description || key;

    return successResponse(res, {
      key,
      value,
      description,
      type: getConfigType(key as ConfigKey)
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

// 更新单个配置
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return errorResponse(res, '配置值不能为空', 400);
    }

    // 验证配置值
    const validation = validateConfigValue(key as ConfigKey, value);
    if (!validation.valid) {
      return errorResponse(res, validation.message, 400);
    }

    await SystemConfig.setConfig(key, String(value));

    return successResponse(res, { key, value: String(value) }, '配置更新成功');
  } catch (error) {
    console.error('更新配置失败:', error);
    return errorResponse(res, '更新配置失败');
  }
};

// 批量更新配置
export const updateConfigs = async (req: Request, res: Response) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return errorResponse(res, '参数格式错误', 400);
    }

    // 验证所有配置值
    for (const { key, value } of configs) {
      const validation = validateConfigValue(key as ConfigKey, value);
      if (!validation.valid) {
        return errorResponse(res, `${key}: ${validation.message}`, 400);
      }
    }

    await SystemConfig.setConfigs(configs.map(c => ({ key: c.key, value: String(c.value) })));

    return successResponse(res, null, '配置批量更新成功');
  } catch (error) {
    console.error('批量更新配置失败:', error);
    return errorResponse(res, '批量更新配置失败');
  }
};

// 初始化默认配置
export const initConfigs = async (req: Request, res: Response) => {
  try {
    await SystemConfig.initDefaults();
    return successResponse(res, null, '默认配置初始化成功');
  } catch (error) {
    console.error('初始化配置失败:', error);
    return errorResponse(res, '初始化配置失败');
  }
};

// 获取公开价格配置（无需登录）
export const getPublicPrices = async (req: Request, res: Response) => {
  try {
    const [
      yearlyMembershipPrice,
      coursePrice,
      courseOriginalPrice,
      videoRateNormal,
      videoRateYearly,
      videoRateCourse,
      commissionRate
    ] = await Promise.all([
      SystemConfig.getNumberConfig(ConfigKey.YEARLY_MEMBERSHIP_PRICE),
      SystemConfig.getNumberConfig(ConfigKey.COURSE_PRICE),
      SystemConfig.getNumberConfig(ConfigKey.COURSE_ORIGINAL_PRICE),
      SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_NORMAL),
      SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_YEARLY),
      SystemConfig.getNumberConfig(ConfigKey.VIDEO_RATE_COURSE),
      SystemConfig.getNumberConfig(ConfigKey.COMMISSION_RATE)
    ]);

    return successResponse(res, {
      yearlyMembershipPrice: yearlyMembershipPrice || 299,
      coursePrice: coursePrice || 799,
      courseOriginalPrice: courseOriginalPrice || 1299,
      videoRateNormal: videoRateNormal || 0.002,
      videoRateYearly: videoRateYearly || 0.0015,
      videoRateCourse: videoRateCourse || 0.0013,
      commissionRate: commissionRate || 25
    });
  } catch (error) {
    console.error('获取价格配置失败:', error);
    return errorResponse(res, '获取价格配置失败');
  }
};

// 获取协议内容（服务条款和隐私政策，无需登录）
export const getAgreements = async (req: Request, res: Response) => {
  try {
    const [termsOfService, privacyPolicy] = await Promise.all([
      SystemConfig.getConfig(ConfigKey.TERMS_OF_SERVICE),
      SystemConfig.getConfig(ConfigKey.PRIVACY_POLICY)
    ]);

    return successResponse(res, {
      termsOfService: termsOfService || '',
      privacyPolicy: privacyPolicy || ''
    });
  } catch (error) {
    console.error('获取协议内容失败:', error);
    return errorResponse(res, '获取协议内容失败');
  }
};

// 获取课程二维码（需要验证用户是课程学员）
export const getCourseQrCode = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 从数据库获取用户完整信息
    const [userResult]: any = await sequelize.query(
      'SELECT is_course_student, membership_type FROM users WHERE id = ?',
      { replacements: [user.userId], type: QueryTypes.SELECT }
    );

    if (!userResult) {
      return errorResponse(res, '用户不存在', 404);
    }

    // 检查是否为课程学员
    const isCourseStudent = userResult.is_course_student || userResult.membership_type === 'course';
    if (!isCourseStudent) {
      return errorResponse(res, '仅课程学员可查看', 403);
    }

    // 获取二维码URL
    const qrCodeUrl = await SystemConfig.getConfig(ConfigKey.COURSE_QR_CODE);

    if (!qrCodeUrl) {
      return errorResponse(res, '课程群二维码未配置', 404);
    }

    return successResponse(res, { qrCodeUrl });
  } catch (error) {
    console.error('获取课程二维码失败:', error);
    return errorResponse(res, '获取课程二维码失败');
  }
};

// 获取配置类型
function getConfigType(key: ConfigKey): 'number' | 'string' | 'boolean' {
  const numberConfigs = [
    ConfigKey.COMMISSION_RATE,
    ConfigKey.COMMISSION_RATE_COURSE,
    ConfigKey.COMMISSION_RATE_MEMBERSHIP,
    ConfigKey.REGISTER_BONUS,
    ConfigKey.PROMPT_DEFAULT_PRICE,
    ConfigKey.RECHARGE_MIN_AMOUNT,
    ConfigKey.RECHARGE_MAX_AMOUNT,
    ConfigKey.YEARLY_MEMBERSHIP_PRICE,
    ConfigKey.COURSE_PRICE,
    ConfigKey.COURSE_ORIGINAL_PRICE,
    ConfigKey.VIDEO_RATE_NORMAL,
    ConfigKey.VIDEO_RATE_YEARLY,
    ConfigKey.VIDEO_RATE_COURSE
  ];

  if (numberConfigs.includes(key)) {
    return 'number';
  }
  return 'string';
}

// 验证配置值
function validateConfigValue(key: ConfigKey, value: any): { valid: boolean; message: string } {
  const numValue = parseFloat(value);

  switch (key) {
    case ConfigKey.COMMISSION_RATE:
    case ConfigKey.COMMISSION_RATE_COURSE:
    case ConfigKey.COMMISSION_RATE_MEMBERSHIP:
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return { valid: false, message: '佣金比例必须在0-100之间' };
      }
      break;

    case ConfigKey.REGISTER_BONUS:
      if (isNaN(numValue) || numValue < 0 || numValue > 1000) {
        return { valid: false, message: '注册赠金必须在0-1000之间' };
      }
      break;

    case ConfigKey.PROMPT_DEFAULT_PRICE:
      if (isNaN(numValue) || numValue < 0 || numValue > 10000) {
        return { valid: false, message: '提示词默认价格必须在0-10000之间' };
      }
      break;

    case ConfigKey.RECHARGE_MIN_AMOUNT:
      if (isNaN(numValue) || numValue < 0.01 || numValue > 1000) {
        return { valid: false, message: '充值最低金额必须在0.01-1000之间' };
      }
      break;

    case ConfigKey.RECHARGE_MAX_AMOUNT:
      if (isNaN(numValue) || numValue < 100 || numValue > 100000) {
        return { valid: false, message: '充值最高金额必须在100-100000之间' };
      }
      break;

    case ConfigKey.YEARLY_MEMBERSHIP_PRICE:
      if (isNaN(numValue) || numValue < 0 || numValue > 100000) {
        return { valid: false, message: '年度会员价格必须在0-100000之间' };
      }
      break;

    case ConfigKey.COURSE_PRICE:
      if (isNaN(numValue) || numValue < 0 || numValue > 100000) {
        return { valid: false, message: '课程价格必须在0-100000之间' };
      }
      break;

    case ConfigKey.COURSE_ORIGINAL_PRICE:
      if (isNaN(numValue) || numValue < 0 || numValue > 100000) {
        return { valid: false, message: '课程原价必须在0-100000之间' };
      }
      break;

    case ConfigKey.VIDEO_RATE_NORMAL:
    case ConfigKey.VIDEO_RATE_YEARLY:
    case ConfigKey.VIDEO_RATE_COURSE:
      if (isNaN(numValue) || numValue < 0 || numValue > 10) {
        return { valid: false, message: '视频费率必须在0-10之间' };
      }
      break;
  }

  return { valid: true, message: '' };
}

// ==================== 赠金规则管理 ====================

interface BonusRule {
  id?: number;
  min_amount: number;
  bonus_rate: number;
  bonus_type: 'rate' | 'fixed';
  bonus_fixed_amount?: number;
  display_text: string;
  priority: number;
  is_active: boolean;
}

// 获取所有赠金规则
export const getBonusRules = async (req: Request, res: Response) => {
  try {
    const rules = await sequelize.query<BonusRule>(
      `SELECT id, min_amount, bonus_rate, bonus_type, bonus_fixed_amount,
              display_text, priority, is_active
       FROM recharge_bonus_rules
       ORDER BY priority DESC, min_amount DESC`,
      { type: QueryTypes.SELECT }
    );

    return successResponse(res, rules);
  } catch (error) {
    console.error('获取赠金规则失败:', error);
    return errorResponse(res, '获取赠金规则失败');
  }
};

// 更新单个赠金规则
export const updateBonusRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { min_amount, bonus_rate, bonus_type, bonus_fixed_amount, display_text, priority, is_active } = req.body;

    // 验证
    if (min_amount === undefined || min_amount < 0) {
      return errorResponse(res, '最低金额必须大于等于0', 400);
    }
    if (bonus_rate === undefined || bonus_rate < 0 || bonus_rate > 1) {
      return errorResponse(res, '赠送比例必须在0-1之间', 400);
    }

    await sequelize.query(
      `UPDATE recharge_bonus_rules
       SET min_amount = ?, bonus_rate = ?, bonus_type = ?,
           bonus_fixed_amount = ?, display_text = ?, priority = ?, is_active = ?
       WHERE id = ?`,
      {
        replacements: [
          min_amount,
          bonus_rate,
          bonus_type || 'rate',
          bonus_fixed_amount || null,
          display_text || `充${min_amount}送${Math.round(min_amount * bonus_rate)}`,
          priority ?? 0,
          is_active ?? true,
          id
        ],
        type: QueryTypes.UPDATE
      }
    );

    return successResponse(res, null, '规则更新成功');
  } catch (error) {
    console.error('更新赠金规则失败:', error);
    return errorResponse(res, '更新赠金规则失败');
  }
};

// 批量更新赠金规则
export const updateBonusRules = async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return errorResponse(res, '参数格式错误', 400);
    }

    for (const rule of rules) {
      if (rule.id) {
        // 更新现有规则
        await sequelize.query(
          `UPDATE recharge_bonus_rules
           SET min_amount = ?, bonus_rate = ?, bonus_type = ?,
               bonus_fixed_amount = ?, display_text = ?, priority = ?, is_active = ?
           WHERE id = ?`,
          {
            replacements: [
              rule.min_amount,
              rule.bonus_rate,
              rule.bonus_type || 'rate',
              rule.bonus_fixed_amount || null,
              rule.display_text,
              rule.priority ?? 0,
              rule.is_active ?? true,
              rule.id
            ],
            type: QueryTypes.UPDATE
          }
        );
      } else {
        // 创建新规则
        await sequelize.query(
          `INSERT INTO recharge_bonus_rules
           (min_amount, bonus_rate, bonus_type, bonus_fixed_amount, display_text, priority, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              rule.min_amount,
              rule.bonus_rate,
              rule.bonus_type || 'rate',
              rule.bonus_fixed_amount || null,
              rule.display_text,
              rule.priority ?? 0,
              rule.is_active ?? true
            ],
            type: QueryTypes.INSERT
          }
        );
      }
    }

    return successResponse(res, null, '规则批量更新成功');
  } catch (error) {
    console.error('批量更新赠金规则失败:', error);
    return errorResponse(res, '批量更新赠金规则失败');
  }
};

// 删除赠金规则
export const deleteBonusRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await sequelize.query(
      'DELETE FROM recharge_bonus_rules WHERE id = ?',
      { replacements: [id], type: QueryTypes.DELETE }
    );

    return successResponse(res, null, '规则删除成功');
  } catch (error) {
    console.error('删除赠金规则失败:', error);
    return errorResponse(res, '删除赠金规则失败');
  }
};
