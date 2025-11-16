// 通用类型定义

// API响应基础结构
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页信息
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// 分页查询参数
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// 列表响应（带分页）
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

// 排序参数
export type SortOrder = 'asc' | 'desc';

// 状态类型
export type Status = 'pending' | 'processing' | 'completed' | 'failed';

// 用户类型
export type UserType = 'user' | 'svip' | 'admin';
