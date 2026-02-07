import type { User } from './auth';
import type { PaginationParams } from './common';

// 工作流平台
export type WorkflowPlatform = 'coze' | 'make' | 'n8n' | 'comfyui';

// 工作流分类（与数据库 workflow_categories 表一致）
export type WorkflowCategory =
  | 'all'
  | 'self_media'
  | 'celebrity'
  | 'tools'
  | 'image_process'
  | 'ecommerce'
  | 'video'
  | 'education'
  | 'image_gen'
  | 'novel';

// 工作流状态
export type WorkflowStatus = 'published' | 'draft' | 'offline';

// 教学图片（带描述）
export interface WorkflowImage {
  url: string;
  description: string;
}

// 相关链接
export interface RelatedLink {
  title: string;
  url: string;
  description?: string;
}

// 工作流信息
export interface Workflow {
  id: number;
  creator_id: number | null;
  name: string;
  description: string | null;
  category: WorkflowCategory | null;
  platform: WorkflowPlatform | null;
  cover_url: string | null;

  // 下载相关
  download_url: string | null;
  file_size: string | null;

  // 文档链接
  video_url: string | null;
  feishu_link: string | null;
  related_links: RelatedLink[] | null;

  // 插件说明
  requires_paid_plugin: boolean;
  plugin_note: string | null;

  // 教学图片（支持旧格式 string[] 和新格式 {url, description}[]）
  images: (string | WorkflowImage)[] | null;

  // 统计
  view_count: number;
  use_count: number;
  rating: number;

  // 状态
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
  search?: string;
  sort_by?: 'latest' | 'popular' | 'rating';
}

// 创建工作流数据
export interface CreateWorkflowData {
  name: string;
  description?: string;
  category?: WorkflowCategory;
  platform?: WorkflowPlatform;
  cover_url?: string;
  download_url?: string;
  file_size?: string;
  video_url?: string;
  feishu_link?: string;
  related_links?: RelatedLink[];
  requires_paid_plugin?: boolean;
  plugin_note?: string;
  images?: WorkflowImage[];
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
