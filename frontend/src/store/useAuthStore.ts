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
  loadUserFromStorage: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
  }
}));
