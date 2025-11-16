import type { User } from './auth';
import type { PaginationParams } from './common';

// 插件分类
export type PluginCategory =
  | 'video'
  | 'scraping'
  | 'image'
  | 'content'
  | 'automation'
  | 'social'
  | 'analysis'
  | 'other';

// 插件状态
export type PluginStatus = 'approved' | 'pending' | 'rejected' | 'offline';

// 插件信息
export interface Plugin {
  id: number;
  developer_id: number | null;
  name: string;
  description: string | null;
  category: PluginCategory | null;
  icon_url: string | null;
  plugin_config: Record<string, any> | null;
  version: string;
  install_count: number;
  rating: number;
  review_count: number;
  is_free: boolean;
  status: PluginStatus;
  created_at: string;
  updated_at: string;
  developer?: User;
  is_installed?: boolean;
}

// 插件查询参数
export interface PluginQueryParams extends PaginationParams {
  category?: PluginCategory | 'all';
  is_free?: boolean;
  search?: string;
  sort_by?: 'latest' | 'popular' | 'rating';
}

// 创建插件数据
export interface CreatePluginData {
  name: string;
  description?: string;
  category?: PluginCategory;
  icon_url?: string;
  plugin_config?: Record<string, any>;
  version?: string;
  is_free?: boolean;
}

// 更新插件数据
export interface UpdatePluginData extends Partial<CreatePluginData> {
  status?: PluginStatus;
}

// 用户插件（安装记录）
export interface UserPlugin {
  id: number;
  user_id: number;
  plugin_id: number;
  installed_at: string;
  last_used_at: string | null;
  plugin?: Plugin;
}

// 插件统计
export interface PluginStatistics {
  total_plugins: number;
  approved_plugins: number;
  pending_plugins: number;
  rejected_plugins: number;
  total_installations: number;
  category_distribution: Array<{ category: string; count: number }>;
}
