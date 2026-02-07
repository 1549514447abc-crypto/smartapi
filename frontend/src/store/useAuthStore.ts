import { create } from 'zustand';
import { authApi } from '../api/auth';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuth: (token: string, user: User) => void;
  loadUserFromStorage: () => void;
  refreshUser: () => Promise<void>;

  // Computed helpers
  isMember: () => boolean;
  isCourseStudent: () => boolean;
  hasMemberAccess: () => boolean; // 是否有会员下载权限（年度会员或课程学员）
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,

  // 登录
  login: async (credentials: LoginRequest) => {
    set({ loading: true });
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        const { token, user } = response.data;

        // 保存到localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // 更新state
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false
        });
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // 注册
  register: async (data: RegisterRequest) => {
    set({ loading: true });
    try {
      const response = await authApi.register(data);
      if (response.success && response.data) {
        const { token, user } = response.data;

        // 保存到localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // 更新state
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false
        });
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // 退出登录
  logout: () => {
    // 清除localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 清除state
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });

    // 可选：调用后端logout API
    authApi.logout().catch(() => {
      // 忽略错误
    });
  },

  // 设置用户
  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  // 设置token
  setToken: (token: string | null) => {
    set({ token });
    if (token) {
      localStorage.setItem('token', token);
    }
  },

  // 设置认证信息（用于短信登录等场景）
  setAuth: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true
    });
  },

  // 从localStorage加载用户信息
  loadUserFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true
        });
      } catch (error) {
        // 解析失败，清除数据
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },

  // 刷新用户信息
  refreshUser: async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  },

  // 判断是否是有效会员（年度会员，未过期）- 用于显示 PRO 标志
  isMember: () => {
    const user = get().user;
    if (!user) return false;

    // 只有年度会员才显示 PRO 标志，课程学员不显示
    if (user.membership_type !== 'yearly') {
      return false;
    }

    // 检查是否过期
    if (user.membership_expiry) {
      const expiryDate = new Date(user.membership_expiry);
      if (expiryDate < new Date()) {
        return false; // 已过期
      }
    }

    return true;
  },

  // 判断是否是课程学员
  isCourseStudent: () => {
    const user = get().user;
    if (!user) return false;

    // 课程学员标记
    if (user.is_course_student) return true;

    // 或者会员类型是 course 且未过期
    if (user.membership_type === 'course' && user.membership_expiry) {
      const expiryDate = new Date(user.membership_expiry);
      return expiryDate >= new Date();
    }

    return false;
  },

  // 判断是否有工作流下载权限（只有年度工作流会员才能免费下载）
  hasMemberAccess: () => {
    const user = get().user;
    if (!user) return false;

    // 检查会员类型：只有 yearly（年度工作流会员）才能下载工作流
    if (user.membership_type !== 'yearly') {
      return false;
    }

    // 检查是否过期
    if (user.membership_expiry) {
      const expiryDate = new Date(user.membership_expiry);
      return expiryDate >= new Date();
    }

    return false;
  }
}));
