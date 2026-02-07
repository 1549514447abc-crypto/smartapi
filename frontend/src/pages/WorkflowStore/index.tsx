import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Input, Spin } from 'antd';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { WorkflowCategory, WorkflowPlatform } from '../../types/workflow';
import { api } from '../../api/request';
import { Crown, Download, Sparkles } from 'lucide-react';
import './WorkflowStore.css';

const { Option } = Select;

interface CategoryConfig {
  category_key: string;
  category_name: string;
  icon: string;
  workflow_count: number;
}

interface PlatformConfig {
  platform_key: string;
  platform_name: string;
  is_hot: boolean;
}

const WorkflowStore = () => {
  const navigate = useNavigate();
  const { workflows, filters, loading, fetchWorkflows, setFilters } = useWorkflowStore();
  const { hasMemberAccess } = useAuthStore();
  const [currentPlatform, setCurrentPlatform] = useState<string>('coze'); // 默认选中第一个平台
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [showVipBanner, setShowVipBanner] = useState(true);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [membershipPrice, setMembershipPrice] = useState(299);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const isMember = hasMemberAccess();

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 当平台变化时，获取该平台下各分类的数量
  useEffect(() => {
    if (!currentPlatform) return;
    fetchCategoryCounts(currentPlatform);
  }, [currentPlatform]);

  // 当平台或分类变化时重新获取工作流
  useEffect(() => {
    if (!currentPlatform) return; // 等待平台加载
    const platform = currentPlatform as WorkflowPlatform;
    const category = currentCategory === 'all' ? undefined : currentCategory as WorkflowCategory;
    setFilters({ platform, category, page: 1 });
    fetchWorkflows({ ...filters, platform, category, page: 1 });
  }, [currentPlatform, currentCategory]);

  // 获取当前平台下各分类的工作流数量
  const fetchCategoryCounts = async (platform: string) => {
    try {
      // 获取该平台下所有工作流（不筛选分类，获取足够多的数据）
      const res = await api.get<{ success: boolean; data: { workflows: any[] } }>('/workflows', {
        params: { platform, limit: 1000 }
      });
      if (res.success && res.data.workflows) {
        const counts: Record<string, number> = { all: res.data.workflows.length };
        res.data.workflows.forEach((w: any) => {
          if (w.category) {
            counts[w.category] = (counts[w.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
      }
    } catch (error) {
      console.error('获取分类数量失败:', error);
    }
  };

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      const [categoriesRes, platformsRes, pricesRes] = await Promise.all([
        api.get<{ success: boolean; data: CategoryConfig[] }>('/workflow-config/categories'),
        api.get<{ success: boolean; data: PlatformConfig[] }>('/workflow-config/platforms'),
        api.get<{ success: boolean; data: { yearlyMembershipPrice: number } }>('/system-config/prices')
      ]);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (platformsRes.success) setPlatforms(platformsRes.data);
      if (pricesRes.success && pricesRes.data.yearlyMembershipPrice) {
        setMembershipPrice(pricesRes.data.yearlyMembershipPrice);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const filterPlatform = (platform: string) => {
    setCurrentPlatform(platform);
    setCurrentCategory('all'); // 切换平台时重置分类
  };

  const filterCategory = (category: string) => {
    setCurrentCategory(category);
  };

  const handleCardClick = (workflow: any) => {
    // 点击卡片进入详情页（不需要会员）
    navigate(`/workflow-store/${workflow.id}`);
  };

  if (configLoading) {
    return (
      <div className="workflow-store-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="workflow-store-container">
      {/* VIP Banner */}
      {showVipBanner && (
        <div className="vip-banner">
          <div className="vip-info">
            <div className="vip-icon">👑</div>
            <div className="vip-text">
              温馨提示：下载的工作流包包含导入方法指导视频，按教学视频即可轻松导入使用
            </div>
          </div>
          <button className="close-banner" onClick={() => setShowVipBanner(false)}>×</button>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="platform-tabs">
        {platforms.map((platform) => (
          <div
            key={platform.platform_key}
            className={`platform-tab ${currentPlatform === platform.platform_key ? 'active' : ''}`}
            onClick={() => filterPlatform(platform.platform_key)}
          >
            {platform.platform_name}
            {!!platform.is_hot && <span className="tab-badge">HOT</span>}
          </div>
        ))}
      </div>

      {/* Page Title */}
      <div className="page-header" style={{ padding: '20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
          {platforms.find(p => p.platform_key === currentPlatform)?.platform_name || ''} 工作流
        </h1>
        <p style={{ color: '#666', marginTop: '8px' }}>精选高效工作流，助力提升工作效率</p>
      </div>

      {/* Main Container */}
      <div className="main-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">🗂️ 工作流分类</div>
            <ul className="category-list">
              {categories.map((cat) => (
                <li
                  key={cat.category_key}
                  className={`category-item ${currentCategory === cat.category_key ? 'active' : ''}`}
                  onClick={() => filterCategory(cat.category_key)}
                >
                  <div className="category-icon">{cat.icon}</div>
                  <div className="category-text">{cat.category_name}</div>
                  <div className="category-count">{categoryCounts[cat.category_key] || 0}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {/* 会员状态提示 */}
          <div className="mb-6">
            {isMember ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">您已是会员</p>
                  <p className="text-sm text-amber-700">所有工作流免费下载</p>
                </div>
                <Download className="w-5 h-5 text-amber-500" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">开通年度会员</p>
                    <p className="text-sm text-slate-600">
                      <span className="text-violet-600 font-bold">¥{membershipPrice}/年</span>
                      ，下载所有工作流 + 全部提示词
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/membership')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-all whitespace-nowrap"
                >
                  立即开通
                </button>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-left">
              <Select
                className="filter-select"
                defaultValue="latest"
                onChange={(value) => setFilters({ ...filters, sort_by: value as "latest" | "popular" | "rating" })}
              >
                <Option value="latest">最新发布</Option>
                <Option value="popular">最受欢迎</Option>
                <Option value="rating">评分最高</Option>
              </Select>
            </div>
            <div className="search-box">
              <div className="search-icon">🔍</div>
              <Input
                className="search-input"
                placeholder="搜索工作流名称或关键词..."
                allowClear
              />
            </div>
          </div>

          {/* Workflow Grid */}
          <Spin spinning={loading}>
            <div className="workflow-grid">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="workflow-card" onClick={() => handleCardClick(workflow)}>
                  <div className="workflow-thumbnail">
                    {workflow.cover_url ? (
                      <img src={workflow.cover_url} alt={workflow.name} />
                    ) : (
                      <div style={{ background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
                        {workflow.category === 'video' ? '🎬' : '⚙️'}
                      </div>
                    )}
                    {/* 会员免费下载标志 */}
                    <div className="svip-badge">会员免费</div>
                    {workflow.requires_paid_plugin && <div className="price-badge">需付费插件</div>}
                    <div className="play-icon">▶</div>
                  </div>
                  <div className="workflow-content">
                    <div className="workflow-title">{workflow.name}</div>
                    <div className="workflow-description">{workflow.description || '暂无描述'}</div>
                    <div className="workflow-author">
                      <div className="author-avatar">
                        {workflow.creator_id ? String(workflow.creator_id).charAt(0) : 'U'}
                      </div>
                      <div className="author-name">官方出品</div>
                    </div>
                    <div className="workflow-stats">
                      <div className="stat-item">
                        <span>📥</span>
                        <span>{workflow.use_count || 0}次下载</span>
                      </div>
                      <div className="stat-item">
                        <span>👁️</span>
                        <span>{workflow.view_count || 0}</span>
                      </div>
                      {workflow.file_size && (
                        <div className="stat-item">
                          <span>📦</span>
                          <span>{workflow.file_size}</span>
                        </div>
                      )}
                    </div>
                    {/* 查看详情按钮 */}
                    <button
                      onClick={() => handleCardClick(workflow)}
                      className="mt-3 w-full py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {workflows.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                暂无工作流数据
              </div>
            )}
          </Spin>

          {/* Load More */}
          {workflows.length > 0 && (
            <div className="load-more">
              <button className="load-more-btn">加载更多工作流</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowStore;
