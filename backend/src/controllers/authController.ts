import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { generateApiKey } from '../utils/apiKey';
import supabaseService from '../services/SupabaseService';
import sequelize from '../config/database';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import commissionService from '../services/CommissionService';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const { username, email, phone, password, nickname, referral_code } = value;

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      errorResponse(res, '用户名已存在', 409);
      return;
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        errorResponse(res, '邮箱已被注册', 409);
        return;
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) {
        errorResponse(res, '手机号已被注册', 409);
        return;
      }
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // 获取注册赠金配置
    const registerBonus = await SystemConfig.getNumberConfig(ConfigKey.REGISTER_BONUS);

    // 开启事务
    const transaction = await sequelize.transaction();

    try {
      // 1. Create user with default balance (注册赠金从配置读取)
      const newUser = await User.create({
        username,
        email: email || null,
        phone: phone || null,
        password_hash,
        nickname: nickname || username,
        status: 'active',
        user_type: 'normal',
        balance: registerBonus,
        total_recharged: 0,
        total_consumed: 0
      }, { transaction });

      const userId = newUser.id;

      // 2. 生成默认 API Key
      const apiKey = generateApiKey();
      await sequelize.query(
        `INSERT INTO api_keys (api_key, user_id, key_name, status)
         VALUES (?, ?, ?, ?)`,
        {
          replacements: [apiKey, userId, '默认密钥', 'active'],
          transaction
        }
      );

      // 3. 记录余额日志（注册赠金）
      if (registerBonus > 0) {
        await sequelize.query(
          `INSERT INTO balance_logs
           (user_id, change_type, change_amount, balance_before, balance_after, source, description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              userId,
              'recharge',
              registerBonus,
              0,
              registerBonus,
              'web',
              '注册赠金'
            ],
            transaction
          }
        );
      }

      // 4. 处理推荐码绑定
      if (referral_code) {
        await commissionService.bindReferral(userId, referral_code, transaction);
      }

      // 提交事务
      await transaction.commit();

      // 4. 同步到 Supabase（异步，失败不影响注册）
      // 必须先同步用户，再同步 API Key（避免外键约束错误）
      supabaseService.syncUser(userId, registerBonus)
        .then(() => {
          // 用户同步成功后，再同步 API Key
          return supabaseService.syncApiKey(apiKey, userId, '默认密钥');
        })
        .catch(err => {
          console.error('Supabase 同步失败:', err);
        });

      // Generate JWT token
      const token = generateToken({
        userId: newUser.id,
        username: newUser.username,
        userType: newUser.user_type
      });

      // Return user data (without password)
      successResponse(
        res,
        {
          token,
          user: newUser.toSafeJSON(),
          apiKey: apiKey // 返回生成的 API Key
        },
        'User registered successfully',
        201
      );
    } catch (txError: any) {
      // 回滚事务
      await transaction.rollback();
      throw txError;
    }
  } catch (error: any) {
    console.error('Register error:', error);
    errorResponse(res, 'Registration failed', 500, error.message);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      errorResponse(res, error.details[0].message, 400);
      return;
    }

    const { username, password } = value;

    // Find user by username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      errorResponse(res, '用户名或密码错误', 401);
      return;
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      errorResponse(res, '账号已被停用', 403);
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      errorResponse(res, '用户名或密码错误', 401);
      return;
    }

    // Update last login info
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = req.ip ||
                     (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
                     'unknown';

    // 检查会员是否过期
    const updateData: any = {
      last_login_at: new Date(),
      last_login_ip: clientIp
    };

    if (user.membership_type && user.membership_type !== 'none' && user.membership_expiry) {
      const expiryDate = new Date(user.membership_expiry);
      if (expiryDate < new Date()) {
        // 会员已过期，重置为非会员
        updateData.membership_type = 'none';
        updateData.membership_expiry = null;
        console.log(`用户 ${user.username} 的会员已过期，自动重置为非会员`);
      }
    }

    await user.update(updateData);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      userType: user.user_type
    });

    // Return user data and token
    successResponse(res, {
      token,
      user: user.toSafeJSON()
    }, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500, error.message);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    // Find user by ID
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    // 检查会员是否过期
    if (user.membership_type && user.membership_type !== 'none' && user.membership_expiry) {
      const expiryDate = new Date(user.membership_expiry);
      if (expiryDate < new Date()) {
        // 会员已过期，重置为非会员
        await user.update({
          membership_type: 'none',
          membership_expiry: null
        });
        console.log(`用户 ${user.username} 的会员已过期，自动重置为非会员`);
      }
    }

    // Return user data (without password)
    successResponse(res, user.toSafeJSON(), 'User retrieved successfully');
  } catch (error: any) {
    console.error('Get current user error:', error);
    errorResponse(res, 'Failed to get user info', 500, error.message);
  }
};

/**
 * 修改密码（已有密码的用户）
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      errorResponse(res, '请输入旧密码和新密码', 400);
      return;
    }

    if (newPassword.length < 6) {
      errorResponse(res, '新密码至少6个字符', 400);
      return;
    }

    // 获取用户
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 验证旧密码
    if (!user.password_hash) {
      errorResponse(res, '您尚未设置密码，请使用"设置密码"功能', 400);
      return;
    }

    const isOldPasswordValid = await comparePassword(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      errorResponse(res, '旧密码错误', 400);
      return;
    }

    // 更新密码
    const newPasswordHash = await hashPassword(newPassword);
    await user.update({ password_hash: newPasswordHash });

    successResponse(res, null, '密码修改成功');
  } catch (error: any) {
    console.error('Change password error:', error);
    errorResponse(res, '密码修改失败', 500, error.message);
  }
};

/**
 * 设置密码（手机注册用户首次设置）
 * POST /api/auth/set-password
 */
export const setPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      errorResponse(res, '请输入新密码', 400);
      return;
    }

    if (newPassword.length < 6) {
      errorResponse(res, '密码至少6个字符', 400);
      return;
    }

    // 获取用户
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 检查是否已有密码（手机注册用户虽然有随机密码，但允许设置）
    const isPhoneUser = /^user_\d{4}_[a-z0-9]+$/.test(user.username);
    if (user.password_hash && !isPhoneUser) {
      errorResponse(res, '您已设置过密码，请使用"修改密码"功能', 400);
      return;
    }

    // 设置密码
    const passwordHash = await hashPassword(newPassword);
    await user.update({ password_hash: passwordHash });

    successResponse(res, null, '密码设置成功');
  } catch (error: any) {
    console.error('Set password error:', error);
    errorResponse(res, '密码设置失败', 500, error.message);
  }
};

/**
 * 判断用户是否是手机注册用户（用户名格式为 user_xxxx_xxx）
 */
const isPhoneRegisteredUser = (username: string): boolean => {
  return /^user_\d{4}_[a-z0-9]+$/.test(username);
};

/**
 * 检查用户是否已设置密码
 * GET /api/auth/has-password
 * 注意：手机注册用户虽然有随机密码，但视为"未设置密码"
 */
export const hasPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    // 手机注册用户虽然有随机密码，但用户不知道，所以返回 false
    const hasRealPassword = !!user.password_hash && !isPhoneRegisteredUser(user.username);

    successResponse(res, { hasPassword: hasRealPassword }, '查询成功');
  } catch (error: any) {
    console.error('Has password check error:', error);
    errorResponse(res, '查询失败', 500, error.message);
  }
};
