import { api } from './request';
import type {
  VideoExtractionTask,
  VideoExtractRequest,
  VideoExtractResponse,
  VideoTaskQueryParams,
  VideoStatistics,
  TokenConfigResponse
} from '../types/video';
import type { ApiResponse } from '../types/common';

export const videoApi = {
  // 提取视频
  extract: (data: VideoExtractRequest): Promise<ApiResponse<VideoExtractResponse>> => {
    return api.post('/video/extract', data);
  },

  // 获取任务列表
  getTasks: (params?: VideoTaskQueryParams): Promise<ApiResponse<{ tasks: VideoExtractionTask[]; pagination: any }>> => {
    return api.get('/video/tasks', { params });
  },

  // 获取任务详情
  getTaskById: (id: number): Promise<ApiResponse<VideoExtractionTask>> => {
    return api.get(`/video/tasks/${id}`);
  },

  // 获取统计信息
  getStatistics: (): Promise<ApiResponse<VideoStatistics>> => {
    return api.get('/video/statistics');
  },

  // 获取Token配置（管理员）
  getTokenConfig: (): Promise<ApiResponse<TokenConfigResponse>> => {
    return api.get('/video/admin/token-config');
  },

  // 更新Token配置（管理员）
  updateTokenConfig: (data: {
    primary_token?: string;
    backup_token?: string;
    current_token?: 'primary' | 'backup';
    api_endpoint?: string;
  }): Promise<ApiResponse<TokenConfigResponse>> => {
    return api.put('/video/admin/token-config', data);
  }
};
