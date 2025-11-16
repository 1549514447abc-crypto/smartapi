import type { UserType } from './common';

// 用户信息
export interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
}

// 注册请求参数
export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  nickname?: string;
}

// 注册响应
export interface RegisterResponse {
  token: string;
  user: User;
}
