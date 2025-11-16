import { create } from 'zustand';
import { workflowApi } from '../api/workflow';
import type { Workflow, WorkflowQueryParams } from '../types/workflow';
import type { Pagination } from '../types/common';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  pagination: Pagination | null;
  filters: WorkflowQueryParams;
  loading: boolean;

  // Actions
  fetchWorkflows: (params?: WorkflowQueryParams) => Promise<void>;
  fetchWorkflowById: (id: number) => Promise<void>;
  setFilters: (filters: Partial<WorkflowQueryParams>) => void;
  useWorkflow: (id: number) => Promise<void>;
  clearCurrentWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  pagination: null,
  filters: {
    page: 1,
    limit: 20
  },
  loading: false,

  // 获取工作流列表
  fetchWorkflows: async (params?: WorkflowQueryParams) => {
    set({ loading: true });
    try {
      const queryParams = params || get().filters;
      const response = await workflowApi.getList(queryParams);

      if (response.success && response.data) {
        set({
          workflows: response.data.workflows,
          pagination: response.data.pagination,
          filters: queryParams,
          loading: false
        });
      }
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch workflows:', error);
      throw error;
    }
  },

  // 获取工作流详情
  fetchWorkflowById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await workflowApi.getById(id);

      if (response.success && response.data) {
        set({
          currentWorkflow: response.data,
          loading: false
        });
      }
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch workflow:', error);
      throw error;
    }
  },

  // 设置筛选条件
  setFilters: (filters: Partial<WorkflowQueryParams>) => {
    const currentFilters = get().filters;
    set({
      filters: { ...currentFilters, ...filters }
    });
  },

  // 使用工作流
  useWorkflow: async (id: number) => {
    try {
      await workflowApi.use(id);
      // 更新当前工作流的使用次数
      const current = get().currentWorkflow;
      if (current && current.id === id) {
        set({
          currentWorkflow: {
            ...current,
            use_count: current.use_count + 1
          }
        });
      }
    } catch (error) {
      console.error('Failed to use workflow:', error);
      throw error;
    }
  },

  // 清除当前工作流
  clearCurrentWorkflow: () => {
    set({ currentWorkflow: null });
  }
}));
