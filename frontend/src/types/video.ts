import type { PaginationParams, Status } from './common';

// 视频提取任务
export interface VideoExtractionTask {
  id: number;
  user_id: number;
  original_url: string;
  platform: string | null;
  video_url: string | null;
  video_title: string | null;
  video_cover: string | null;
  video_duration: number | null;
  author_name: string | null;
  author_avatar: string | null;
  raw_response: Record<string, any> | null;
  status: Status;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// 视频提取请求
export interface VideoExtractRequest {
  video_url: string;
}

// 视频提取响应
export interface VideoExtractResponse {
  task: VideoExtractionTask;
}

// 视频任务查询参数
export interface VideoTaskQueryParams extends PaginationParams {
  status?: Status;
}

// 视频统计
export interface VideoStatistics {
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  today_tasks: number;
  platform_distribution: Array<{ platform: string; count: number }>;
}

// API配置（用于Token管理）
export interface ApiConfig {
  id: number;
  service_name: string;
  config_key: string;
  config_value: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Token配置响应
export interface TokenConfigResponse {
  primary_token: string;
  backup_token: string;
  current_token: 'primary' | 'backup';
  api_endpoint: string;
}
