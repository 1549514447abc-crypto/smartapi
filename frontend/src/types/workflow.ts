import type { User } from './auth';
import type { PaginationParams } from './common';

// 工作流平台
export type WorkflowPlatform = 'coze' | 'make' | 'n8n' | 'comfyui';

// 工作流分类
export type WorkflowCategory =
  | 'video'
  | 'scraping'
  | 'image'
  | 'content'
  | 'automation'
  | 'social'
  | 'analysis'
  | 'other';

// 工作流状态
export type WorkflowStatus = 'published' | 'draft' | 'offline';

// 工作流信息
export interface Workflow {
  id: number;
  creator_id: number | null;
  name: string;
  description: string | null;
  category: WorkflowCategory | null;
  platform: WorkflowPlatform | null;
  cover_url: string | null;
  workflow_config: Record<string, any> | null;
  price: number;
  is_svip_free: boolean;
  view_count: number;
  use_count: number;
  rating: number;
  is_public: boolean;
  is_official: boolean;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  creator?: User;
}

// 工作流查询参数
export interface WorkflowQueryParams extends PaginationParams {
  category?: WorkflowCategory | 'all';
  platform?: WorkflowPlatform | 'all';
  price_filter?: 'free' | 'paid' | 'svip';
  search?: string;
  sort_by?: 'latest' | 'popular' | 'rating' | 'price_low' | 'price_high';
}

// 创建工作流数据
export interface CreateWorkflowData {
  name: string;
  description?: string;
  category?: WorkflowCategory;
  platform?: WorkflowPlatform;
  cover_url?: string;
  workflow_config?: Record<string, any>;
  price?: number;
  is_svip_free?: boolean;
  is_public?: boolean;
}

// 更新工作流数据
export interface UpdateWorkflowData extends Partial<CreateWorkflowData> {
  status?: WorkflowStatus;
}

// 工作流统计
export interface WorkflowStatistics {
  total_workflows: number;
  published_workflows: number;
  draft_workflows: number;
  category_distribution: Array<{ category: string; count: number }>;
  platform_distribution: Array<{ platform: string; count: number }>;
}
