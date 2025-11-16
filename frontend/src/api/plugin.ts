import { api } from './request';
import type {
  Plugin,
  PluginQueryParams,
  CreatePluginData,
  UpdatePluginData,
  PluginStatistics
} from '../types/plugin';
import type { ApiResponse } from '../types/common';

export const pluginApi = {
  // 获取插件列表
  getList: (params?: PluginQueryParams): Promise<ApiResponse<{ plugins: Plugin[]; pagination: any }>> => {
    return api.get('/plugins', { params });
  },

  // 获取插件详情
  getById: (id: number): Promise<ApiResponse<Plugin>> => {
    return api.get(`/plugins/${id}`);
  },

  // 创建插件
  create: (data: CreatePluginData): Promise<ApiResponse<Plugin>> => {
    return api.post('/plugins', data);
  },

  // 更新插件
  update: (id: number, data: UpdatePluginData): Promise<ApiResponse<Plugin>> => {
    return api.put(`/plugins/${id}`, data);
  },

  // 删除插件
  delete: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/plugins/${id}`);
  },

  // 安装插件
  install: (id: number): Promise<ApiResponse<{ plugin_id: number; install_count: number }>> => {
    return api.post(`/plugins/${id}/install`);
  },

  // 卸载插件
  uninstall: (id: number): Promise<ApiResponse<null>> => {
    return api.post(`/plugins/${id}/uninstall`);
  },

  // 获取我的已安装插件
  getMyPlugins: (params?: { page?: number; limit?: number }): Promise<ApiResponse<{ plugins: any[]; pagination: any }>> => {
    return api.get('/plugins/my/installed', { params });
  },

  // 获取插件统计（管理员）
  getStatistics: (): Promise<ApiResponse<PluginStatistics>> => {
    return api.get('/plugins/admin/statistics');
  }
};
