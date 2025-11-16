import { api } from './request';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '../types/auth';
import type { ApiResponse } from '../types/common';

export const authApi = {
  // 用户登录
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return api.post('/auth/login', data);
  },

  // 用户注册
  register: (data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
    return api.post('/auth/register', data);
  },

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return api.get('/auth/me');
  },

  // 退出登录
  logout: (): Promise<ApiResponse<null>> => {
    return api.post('/auth/logout');
  }
};
