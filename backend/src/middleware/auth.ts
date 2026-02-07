import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import User from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Auth middleware to verify JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // 检查用户是否被禁用
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'status']
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: '账号已被停用'
      });
      return;
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional auth middleware - doesn't require token but will decode if present
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      // 检查用户是否被禁用
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'status']
      });

      // 只有用户存在且未被禁用时才设置 req.user
      if (user && user.status !== 'suspended') {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // Token invalid, but we continue without user
    next();
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.userType !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};

// Alias for requireAdmin for compatibility
export const adminOnly = requireAdmin;
