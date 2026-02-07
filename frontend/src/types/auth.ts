import type { UserType } from './common';

// 用户信息
export interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  balance?: number | string;
  bonus_balance?: number | string; // 赠金余额
  user_type: UserType;
  membership_type?: 'none' | 'yearly' | 'course' | null;
  membership_expiry?: string | null;
  is_course_student?: boolean;
  wechat_openid?: string | null;
  referral_code?: string | null;
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
  confirm: string;  // 密码确认
  email?: string;
  phone?: string;
  nickname?: string;
  referral_code?: string;
}

// 注册响应
export interface RegisterResponse {
  token: string;
  user: User;
}
