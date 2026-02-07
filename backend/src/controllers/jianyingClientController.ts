import { Request, Response } from 'express';
import User from '../models/User';

/**
 * 剪映客户端控制器
 *
 * 权限规则：
 * - 免费用户：首次授权后1年
 * - 课程学员：首次授权后3年
 * - 普通用户升级为课程学员：可升级到3年（从升级时算起）
 * - 每次登录验证权限，但不自动续期
 */

// 检查客户端访问权限（只验证，不自动续期）
export const checkAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: '账号已被停用'
      });
    }

    const now = new Date();

    // 未授权，需要先授权
    if (!user.jianying_client_expire) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          needAuthorize: true,
          isCourseStudent: user.is_course_student,
          message: '尚未授权使用剪映客户端'
        }
      });
    }

    const expireDate = new Date(user.jianying_client_expire);

    // 已过期
    if (expireDate < now) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          expired: true,
          expireDate: user.jianying_client_expire,
          isCourseStudent: user.is_course_student,
          message: '剪映客户端使用权限已过期'
        }
      });
    }

    // 检查课程学员是否可以升级（已有权限但不足3年）
    let canUpgrade = false;
    if (user.is_course_student) {
      const threeYearsLater = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
      if (expireDate < threeYearsLater) {
        canUpgrade = true;
      }
    }

    // 正常，权限有效
    return res.json({
      success: true,
      data: {
        hasAccess: true,
        expireDate: user.jianying_client_expire,
        isCourseStudent: user.is_course_student,
        canUpgrade: canUpgrade,
        daysLeft: Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('检查剪映客户端权限失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 授权客户端（首次授权或升级）
export const authorize = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: '账号已被停用'
      });
    }

    const now = new Date();
    const isCourseStudent = user.is_course_student;

    // 课程学员3年，普通用户1年
    const years = isCourseStudent ? 3 : 1;
    const newExpireDate = new Date(now.getFullYear() + years, now.getMonth(), now.getDate());
    const duration = isCourseStudent ? '3年' : '1年';

    // 检查是否已有有效授权
    if (user.jianying_client_expire) {
      const currentExpire = new Date(user.jianying_client_expire);

      // 如果未过期且到期时间>=新授权时间，不需要操作
      if (currentExpire > now && currentExpire >= newExpireDate) {
        return res.json({
          success: true,
          data: {
            alreadyAuthorized: true,
            expireDate: user.jianying_client_expire,
            daysLeft: Math.ceil((currentExpire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            message: '已授权，权限有效'
          }
        });
      }

      // 如果是课程学员且当前权限不足3年，可以升级
      if (isCourseStudent && currentExpire > now && currentExpire < newExpireDate) {
        await user.update({ jianying_client_expire: newExpireDate });

        return res.json({
          success: true,
          data: {
            authorized: true,
            upgraded: true,
            expireDate: newExpireDate,
            duration: duration,
            message: `已升级为课程学员权限，有效期${duration}`
          }
        });
      }
    }

    // 首次授权或权限已过期，重新授权
    await user.update({ jianying_client_expire: newExpireDate });

    return res.json({
      success: true,
      data: {
        authorized: true,
        expireDate: newExpireDate,
        isCourseStudent: isCourseStudent,
        duration: duration,
        message: `授权成功，有效期${duration}`
      }
    });

  } catch (error) {
    console.error('剪映客户端授权失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取用户信息（只获取，不自动续期）
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'avatar_url', 'phone', 'is_course_student', 'jianying_client_expire', 'status']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: '账号已被停用'
      });
    }

    const now = new Date();
    let daysLeft = 0;
    let hasAccess = false;
    let canUpgrade = false;

    if (user.jianying_client_expire) {
      const expireDate = new Date(user.jianying_client_expire);
      if (expireDate > now) {
        hasAccess = true;
        daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // 课程学员是否可以升级
        if (user.is_course_student) {
          const threeYearsLater = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
          if (expireDate < threeYearsLater) {
            canUpgrade = true;
          }
        }
      }
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        avatar: user.avatar_url,
        phone: user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
        isCourseStudent: user.is_course_student,
        jianyingAccess: {
          hasAccess,
          expireDate: user.jianying_client_expire,
          daysLeft,
          canUpgrade
        }
      }
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};
