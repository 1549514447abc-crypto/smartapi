import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';

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
        'status', 'user_type', 'balance', 'referral_level',
        'workflow_member_status', 'workflow_member_expire',
        'total_recharged', 'total_consumed',
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
    const { workflow_member_status, workflow_member_expire } = req.body;

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateData: any = {};

    if (workflow_member_status !== undefined) {
      updateData.workflow_member_status = workflow_member_status;
    }

    if (workflow_member_expire !== undefined) {
      updateData.workflow_member_expire = workflow_member_expire;
    }

    await targetUser.update(updateData);

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
    const { amount, reason } = req.body;

    if (typeof amount !== 'number') {
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

    const newBalance = Number(targetUser.balance) + amount;

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: '余额不能为负'
      });
    }

    await targetUser.update({ balance: newBalance });

    console.log(`管理员 ${user.username} 调整用户 ${targetUser.username} 余额: ${amount}, 原因: ${reason || '无'}`);

    return res.json({
      success: true,
      message: '余额调整成功',
      data: {
        newBalance
      }
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

    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const suspendedUsers = await User.count({ where: { status: 'suspended' } });
    const memberUsers = await User.count({
      where: {
        workflow_member_status: 'active',
        workflow_member_expire: { [Op.gt]: new Date() }
      }
    });

    // 今日新增用户
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNewUsers = await User.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        memberUsers,
        todayNewUsers
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
