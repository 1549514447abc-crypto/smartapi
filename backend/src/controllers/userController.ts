import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import User from '../models/User';
import CourseOrder from '../models/CourseOrder';
import ApiCallLog from '../models/ApiCallLog';
import Workflow from '../models/Workflow';
import Plugin from '../models/Plugin';
import Prompt from '../models/Prompt';
import { hashPassword } from '../utils/password';
import supabaseService from '../services/SupabaseService';

// 获取用户列表（管理员）
export const getUserList = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 检查管理员权限
    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { page = 1, pageSize = 20, keyword, status, user_type } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建查询条件
    const where: any = {};

    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (user_type) {
      where.user_type = user_type;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: [
        'id', 'username', 'nickname', 'email', 'phone', 'avatar_url',
        'status', 'user_type', 'balance', 'bonus_balance', 'commission_balance', 'referral_level',
        'workflow_member_status', 'workflow_member_expire',
        'membership_type', 'membership_expiry', 'is_course_student',
        'total_recharged', 'total_consumed',
        'wechat_openid', 'wechat_unionid',
        'user_category',
        'last_login_at', 'created_at'
      ],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset
    });

    return res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

// 获取单个用户详情（管理员）
export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;

    const targetUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    return res.json({
      success: true,
      data: targetUser
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
};

// 更新用户状态（管理员）
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 不能修改自己的状态
    if (targetUser.id === user.id) {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的状态'
      });
    }

    await targetUser.update({ status });

    return res.json({
      success: true,
      message: '用户状态更新成功'
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户状态失败'
    });
  }
};

// 更新用户会员状态（管理员）
export const updateUserMembership = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;
    const {
      workflow_member_status,
      workflow_member_expire,
      membership_type,
      membership_expiry,
      is_course_student
    } = req.body;

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateData: any = {};

    // 旧字段（兼容）
    if (workflow_member_status !== undefined) {
      updateData.workflow_member_status = workflow_member_status;
    }
    if (workflow_member_expire !== undefined) {
      updateData.workflow_member_expire = workflow_member_expire;
    }

    // 新会员字段
    if (membership_type !== undefined) {
      updateData.membership_type = membership_type;
    }
    if (membership_expiry !== undefined) {
      updateData.membership_expiry = membership_expiry;
    }
    if (is_course_student !== undefined) {
      updateData.is_course_student = is_course_student;
    }

    await targetUser.update(updateData);

    console.log(`管理员 ${user.username} 更新用户 ${targetUser.username} 会员状态:`, updateData);

    return res.json({
      success: true,
      message: '会员状态更新成功'
    });
  } catch (error) {
    console.error('更新会员状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新会员状态失败'
    });
  }
};

// 调整用户余额（管理员）
export const adjustUserBalance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;
    const { amount, bonus_amount, commission_amount, reason } = req.body;

    // 至少要调整一种余额
    if (typeof amount !== 'number' && typeof bonus_amount !== 'number' && typeof commission_amount !== 'number') {
      return res.status(400).json({
        success: false,
        message: '金额必须是数字'
      });
    }

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateData: any = {};
    const result: any = {};

    // 调整充值余额
    if (typeof amount === 'number' && amount !== 0) {
      const balanceBefore = Number(targetUser.balance);
      const newBalance = balanceBefore + amount;
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: '充值余额不能为负'
        });
      }
      updateData.balance = newBalance;
      result.newBalance = newBalance;

      // 记录余额变动日志
      await sequelize.query(
        `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
         VALUES (?, 'adjustment', ?, ?, ?, 'admin_adjustment', 'admin', ?, NOW())`,
        {
          replacements: [
            id,
            amount,
            balanceBefore,
            newBalance,
            `管理员调整充值金: ${reason || '无原因'}`
          ]
        }
      );
    }

    // 调整赠金余额
    if (typeof bonus_amount === 'number' && bonus_amount !== 0) {
      const bonusBefore = Number(targetUser.bonus_balance || 0);
      const newBonusBalance = bonusBefore + bonus_amount;
      if (newBonusBalance < 0) {
        return res.status(400).json({
          success: false,
          message: '赠金余额不能为负'
        });
      }
      updateData.bonus_balance = newBonusBalance;
      result.newBonusBalance = newBonusBalance;

      // 记录赠金余额变动日志
      await sequelize.query(
        `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
         VALUES (?, 'adjustment', ?, ?, ?, 'admin_bonus_adjustment', 'admin', ?, NOW())`,
        {
          replacements: [
            id,
            bonus_amount,
            bonusBefore,
            newBonusBalance,
            `管理员调整赠金: ${reason || '无原因'}`
          ]
        }
      );
    }

    // 调整返佣余额
    if (typeof commission_amount === 'number' && commission_amount !== 0) {
      const commissionBefore = Number(targetUser.commission_balance || 0);
      const newCommissionBalance = commissionBefore + commission_amount;
      if (newCommissionBalance < 0) {
        return res.status(400).json({
          success: false,
          message: '返佣余额不能为负'
        });
      }
      updateData.commission_balance = newCommissionBalance;
      result.newCommissionBalance = newCommissionBalance;

      // 记录返佣余额变动日志
      await sequelize.query(
        `INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, source, service_name, description, created_at)
         VALUES (?, 'adjustment', ?, ?, ?, 'admin_commission_adjustment', 'admin', ?, NOW())`,
        {
          replacements: [
            id,
            commission_amount,
            commissionBefore,
            newCommissionBalance,
            `管理员调整返佣: ${reason || '无原因'}`
          ]
        }
      );
    }

    await targetUser.update(updateData);

    console.log(`管理员 ${user.username} 调整用户 ${targetUser.username} 余额: 充值金${amount || 0}, 赠金${bonus_amount || 0}, 返佣${commission_amount || 0}, 原因: ${reason || '无'}`);

    // 同步余额到 Supabase（如果调整了充值余额或赠金）
    if (result.newBalance !== undefined || result.newBonusBalance !== undefined) {
      const totalBalance = (result.newBalance ?? Number(targetUser.balance)) + (result.newBonusBalance ?? Number(targetUser.bonus_balance || 0));
      supabaseService.syncBalance(Number(id), totalBalance).catch(err => {
        console.error('Supabase 同步余额失败:', err);
      });
    }

    return res.json({
      success: true,
      message: '余额调整成功',
      data: result
    });
  } catch (error) {
    console.error('调整余额失败:', error);
    return res.status(500).json({
      success: false,
      message: '调整余额失败'
    });
  }
};

// 获取用户统计数据（管理员）
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    // 时间范围
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // === 用户统计 ===
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const suspendedUsers = await User.count({ where: { status: 'suspended' } });

    // 会员统计（新字段 + 旧字段兼容）
    const memberUsers = await User.count({
      where: {
        [Op.or]: [
          {
            membership_type: { [Op.in]: ['yearly', 'course'] },
            membership_expiry: { [Op.gt]: now }
          },
          {
            workflow_member_status: 'active',
            workflow_member_expire: { [Op.gt]: now }
          }
        ]
      }
    });

    // 今日新增用户
    const todayNewUsers = await User.count({
      where: { created_at: { [Op.gte]: today } }
    });

    // 昨日新增用户（用于计算趋势）
    const yesterdayNewUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    // === 收入统计 ===
    // 今日收入
    const todayIncomeResult = await CourseOrder.sum('amount', {
      where: {
        status: 'completed',
        created_at: { [Op.gte]: today }
      }
    });
    const todayIncome = Number(todayIncomeResult) || 0;

    // 昨日收入
    const yesterdayIncomeResult = await CourseOrder.sum('amount', {
      where: {
        status: 'completed',
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });
    const yesterdayIncome = Number(yesterdayIncomeResult) || 0;

    // 总收入
    const totalIncomeResult = await CourseOrder.sum('amount', {
      where: { status: 'completed' }
    });
    const totalIncome = Number(totalIncomeResult) || 0;

    // === API调用统计 ===
    const todayApiCalls = await ApiCallLog.count({
      where: { created_at: { [Op.gte]: today } }
    });

    const yesterdayApiCalls = await ApiCallLog.count({
      where: {
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    const totalApiCalls = await ApiCallLog.count();

    // === 内容统计 ===
    const totalWorkflows = await Workflow.count();
    const totalPlugins = await Plugin.count();
    const totalPrompts = await Prompt.count();

    // === 计算趋势百分比 ===
    const calcTrend = (current: number, previous: number): string => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    return res.json({
      success: true,
      data: {
        // 用户数据
        totalUsers,
        activeUsers,
        suspendedUsers,
        memberUsers,
        todayNewUsers,
        yesterdayNewUsers,
        usersTrend: calcTrend(todayNewUsers, yesterdayNewUsers),

        // 收入数据
        todayIncome,
        yesterdayIncome,
        totalIncome,
        incomeTrend: calcTrend(todayIncome, yesterdayIncome),

        // API调用数据
        todayApiCalls,
        yesterdayApiCalls,
        totalApiCalls,
        apiCallsTrend: calcTrend(todayApiCalls, yesterdayApiCalls),

        // 内容数据
        totalWorkflows,
        totalPlugins,
        totalPrompts,

        // 会员转化率
        memberConversionRate: totalUsers > 0
          ? ((memberUsers / totalUsers) * 100).toFixed(1)
          : '0'
      }
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户统计失败'
    });
  }
};

// 重置用户密码（管理员）
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少6个字符'
      });
    }

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 重置密码
    const passwordHash = await hashPassword(newPassword);
    await targetUser.update({ password_hash: passwordHash });

    console.log(`管理员 ${user.username} 重置了用户 ${targetUser.username} 的密码`);

    return res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    return res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
};

/**
 * 更新用户佣金设置（管理员）
 * PUT /api/admin/users/:id/commission
 * 简化版：只需更新用户分类，佣金比例由分类决定
 */
export const updateUserCommission = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 检查管理员权限
    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { id } = req.params;
    const { user_category } = req.body;

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 只更新用户分类
    if (user_category !== undefined) {
      await targetUser.update({
        user_category: user_category
      });
    }

    console.log(`管理员 ${user.username} 更新了用户 ${targetUser.username} 的分类为: ${user_category}`);

    return res.json({
      success: true,
      message: '更新成功',
      data: {
        user_category: targetUser.user_category
      }
    });
  } catch (error) {
    console.error('更新用户佣金设置失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
};
