import { api } from './request';
import type {
  Workflow,
  WorkflowQueryParams,
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowStatistics
} from '../types/workflow';
import type { ApiResponse } from '../types/common';

export const workflowApi = {
  // 获取工作流列表
  getList: (params?: WorkflowQueryParams): Promise<ApiResponse<{ workflows: Workflow[]; pagination: any }>> => {
    return api.get('/workflows', { params });
  },

  // 获取工作流详情
  getById: (id: number): Promise<ApiResponse<Workflow>> => {
    return api.get(`/workflows/${id}`);
  },

  // 创建工作流
  create: (data: CreateWorkflowData): Promise<ApiResponse<Workflow>> => {
    return api.post('/workflows', data);
  },

  // 更新工作流
  update: (id: number, data: UpdateWorkflowData): Promise<ApiResponse<Workflow>> => {
    return api.put(`/workflows/${id}`, data);
  },

  // 删除工作流
  delete: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/workflows/${id}`);
  },

  // 使用工作流（增加使用次数）
  use: (id: number): Promise<ApiResponse<{ workflow_id: number; use_count: number }>> => {
    return api.post(`/workflows/${id}/use`);
  },

  // 获取工作流统计（管理员）
  getStatistics: (): Promise<ApiResponse<WorkflowStatistics>> => {
    return api.get('/workflows/admin/statistics');
  }
};
