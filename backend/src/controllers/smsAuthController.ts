import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import User from '../models/User';
import SmsService from '../services/SmsService';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';
import { generateApiKey } from '../utils/apiKey';
import supabaseService from '../services/SupabaseService';
import sequelize from '../config/database';
import { hashPassword } from '../utils/password';
import UserReferral from '../models/UserReferral';

/**
 * Check if SMS login is available
 */
export const getSmsStatus = async (req: Request, res: Response) => {
  try {
    const enabled = await SmsService.isEnabled();
    res.json({
      success: true,
      data: { available: enabled }
    });
  } catch (error) {
    console.error('Get SMS status error:', error);
    res.json({
      success: true,
      data: { available: false }
    });
  }
};

/**
 * Send SMS verification code
 * 统一入口：未注册自动注册，已注册直接登录
 */
export const sendSmsCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({
        success: false,
        error: '请输入手机号'
      });
      return;
    }

    // 检查用户是否已注册，以决定使用哪个短信模板
    const existingUser = await User.findOne({ where: { phone } });
    const isNewUser = !existingUser;

    const result = await SmsService.sendVerificationCode(phone, isNewUser);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Send SMS code error:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

/**
 * Login or register with phone and SMS code
 * 统一入口：未注册自动注册，已注册直接登录
 * 支持可选的 referral_code 参数：新用户注册时绑定推荐人
 */
export const smsLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, referral_code } = req.body;

    if (!phone || !code) {
      res.status(400).json({
        success: false,
        error: '请输入手机号和验证码'
      });
      return;
    }

    // Verify SMS code
    const verifyResult = SmsService.verifyCode(phone, code);
    if (!verifyResult.success) {
      res.status(400).json({
        success: false,
        error: verifyResult.message
      });
      return;
    }

    // Find or create user
    let user = await User.findOne({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      // Create new user with phone
      isNewUser = true;

      // 生成随机密码（仅用于数据库存储，用户通过验证码登录）
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Generate unique username from phone
      const username = `user_${phone.slice(-4)}_${Date.now().toString(36)}`;

      // 获取注册赠金配置
      const registerBonus = await SystemConfig.getNumberConfig(ConfigKey.REGISTER_BONUS);

      // 查找推荐人
      let referredByUserId: number | null = null;
      if (referral_code) {
        const referrer = await User.findOne({ where: { referral_code } });
        if (referrer) {
          referredByUserId = referrer.id;
          console.log(`[smsLogin] 找到推荐人: userId=${referrer.id}, referral_code=${referral_code}`);
        } else {
          console.log(`[smsLogin] 未找到推荐人, referral_code=${referral_code}`);
        }
      }

      // 开启事务
      const transaction = await sequelize.transaction();

      try {
        // 创建用户
        user = await User.create({
          username,
          phone,
          password_hash: passwordHash,
          status: 'active',
          user_type: 'normal',
          balance: registerBonus,
          total_recharged: 0,
          total_consumed: 0,
          referred_by_user_id: referredByUserId,
          referred_at: referredByUserId ? new Date() : null
        }, { transaction });

        const userId = user.id;

        // 生成 API Key
        const apiKey = generateApiKey();
        await sequelize.query(
          `INSERT INTO api_keys (api_key, user_id, key_name, status) VALUES (?, ?, ?, ?)`,
          {
            replacements: [apiKey, userId, '默认密钥', 'active'],
            transaction
          }
        );

        // 记录余额日志（注册赠金）
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

        // 创建推荐关系记录（用于佣金计算）
        if (referredByUserId && referral_code) {
          await UserReferral.create(
            {
              referrer_id: referredByUserId,
              referee_id: userId,
              referral_code: referral_code.toUpperCase(),
              status: 'pending'
            },
            { transaction }
          );
          console.log(`[smsLogin] 创建推荐关系记录: referrer_id=${referredByUserId}, referee_id=${userId}`);
        }

        await transaction.commit();

        // 同步到 Supabase（异步）
        supabaseService.syncUser(userId, registerBonus)
          .then(() => supabaseService.syncApiKey(apiKey, userId, '默认密钥'))
          .catch(err => console.error('Supabase 同步失败:', err));

      } catch (txError) {
        await transaction.rollback();
        throw txError;
      }
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: '账号已被禁用'
      });
      return;
    }

    // Update last login
    await user.update({
      last_login_at: new Date(),
      last_login_ip: req.ip || req.socket.remoteAddress || null
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      userType: user.user_type
    });

    res.json({
      success: true,
      data: {
        token,
        user: user.toSafeJSON(),
        isNewUser
      }
    });
  } catch (error) {
    console.error('SMS login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
};

/**
 * Reset password via phone + SMS code (no login required)
 * POST /api/auth/sms/reset-password
 */
export const resetPasswordByPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, newPassword } = req.body;

    // Validate input
    if (!phone || !code || !newPassword) {
      res.status(400).json({
        success: false,
        error: '请输入手机号、验证码和新密码'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: '密码至少6个字符'
      });
      return;
    }

    // Verify SMS code
    const verifyResult = SmsService.verifyCode(phone, code);
    if (!verifyResult.success) {
      res.status(400).json({
        success: false,
        error: verifyResult.message
      });
      return;
    }

    // Find user by phone
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      res.status(404).json({
        success: false,
        error: '该手机号未注册'
      });
      return;
    }

    // Update password
    const newPasswordHash = await hashPassword(newPassword);
    await user.update({ password_hash: newPasswordHash });

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: '密码重置失败'
    });
  }
};

/**
 * Send SMS code specifically for password reset
 * POST /api/auth/sms/send-reset-code
 */
export const sendResetCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({
        success: false,
        error: '请输入手机号'
      });
      return;
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { phone } });
    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: '该手机号未注册'
      });
      return;
    }

    // Send SMS using reset template
    const result = await SmsService.sendVerificationCode(phone, false, 'reset');

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Send reset code error:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

/**
 * Send SMS code for binding phone (requires login)
 * POST /api/auth/sms/send-bind-code
 */
export const sendBindPhoneCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    console.log('[sendBindPhoneCode] userId:', userId);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: '请先登录'
      });
      return;
    }

    const { phone } = req.body;
    console.log('[sendBindPhoneCode] phone:', phone);

    if (!phone) {
      res.status(400).json({
        success: false,
        error: '请输入手机号'
      });
      return;
    }

    // 检查当前用户是否已绑定手机号
    const currentUser = await User.findByPk(userId);
    console.log('[sendBindPhoneCode] currentUser phone:', currentUser?.phone);

    if (currentUser?.phone) {
      console.log('[sendBindPhoneCode] 用户已绑定手机号:', currentUser.phone);
      res.status(400).json({
        success: false,
        error: '您已绑定手机号，如需更换请联系客服'
      });
      return;
    }

    // 检查该手机号是否已被其他用户使用
    const existingUser = await User.findOne({ where: { phone } });
    console.log('[sendBindPhoneCode] existingUser:', existingUser?.id);

    if (existingUser && existingUser.id !== userId) {
      console.log('[sendBindPhoneCode] 手机号已被其他用户使用:', existingUser.id);
      res.status(400).json({
        success: false,
        error: '该手机号已被其他账号使用'
      });
      return;
    }

    // 发送验证码（使用注册模板，后续可申请绑定专用模板）
    console.log('[sendBindPhoneCode] 开始发送验证码...');
    const result = await SmsService.sendVerificationCode(phone, false, 'register');
    console.log('[sendBindPhoneCode] 发送结果:', result);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Send bind phone code error:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

/**
 * Bind phone number to current account (requires login)
 * POST /api/auth/sms/bind-phone
 */
export const bindPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: '请先登录'
      });
      return;
    }

    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({
        success: false,
        error: '请输入手机号和验证码'
      });
      return;
    }

    // 验证验证码
    const verifyResult = SmsService.verifyCode(phone, code);
    if (!verifyResult.success) {
      res.status(400).json({
        success: false,
        error: verifyResult.message
      });
      return;
    }

    // 检查当前用户是否已绑定手机号
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      res.status(404).json({
        success: false,
        error: '用户不存在'
      });
      return;
    }

    if (currentUser.phone) {
      res.status(400).json({
        success: false,
        error: '您已绑定手机号，如需更换请联系客服'
      });
      return;
    }

    // 检查该手机号是否已被其他用户使用
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser && existingUser.id !== userId) {
      res.status(400).json({
        success: false,
        error: '该手机号已被其他账号使用'
      });
      return;
    }

    // 绑定手机号
    await currentUser.update({ phone });

    console.log(`✅ 用户 ${userId} 绑定手机号成功: ${phone}`);

    res.json({
      success: true,
      message: '绑定手机号成功'
    });
  } catch (error) {
    console.error('Bind phone error:', error);
    res.status(500).json({
      success: false,
      error: '绑定手机号失败'
    });
  }
};
