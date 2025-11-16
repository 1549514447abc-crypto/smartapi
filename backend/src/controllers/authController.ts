import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { generateApiKey } from '../utils/apiKey';
import supabaseService from '../services/SupabaseService';
import sequelize from '../config/database';

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

    const { username, email, phone, password, nickname } = value;

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

    // 开启事务
    const transaction = await sequelize.transaction();

    try {
      // 1. Create user with default balance (1元注册赠金)
      const newUser = await User.create({
        username,
        email: email || null,
        phone: phone || null,
        password_hash,
        nickname: nickname || username,
        status: 'active',
        user_type: 'normal',
        balance: 1.0000, // 注册默认送1元
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
      await sequelize.query(
        `INSERT INTO balance_logs
         (user_id, change_type, change_amount, balance_before, balance_after, source, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            userId,
            'recharge',
            1.0000,
            0,
            1.0000,
            'web',
            '注册赠金'
          ],
          transaction
        }
      );

      // 提交事务
      await transaction.commit();

      // 4. 同步到 Supabase（异步，失败不影响注册）
      // 必须先同步用户，再同步 API Key（避免外键约束错误）
      supabaseService.syncUser(userId, 1.0000)
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
    await user.update({
      last_login_at: new Date(),
      last_login_ip: clientIp
    });

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

    // Return user data (without password)
    successResponse(res, user.toSafeJSON(), 'User retrieved successfully');
  } catch (error: any) {
    console.error('Get current user error:', error);
    errorResponse(res, 'Failed to get user info', 500, error.message);
  }
};
