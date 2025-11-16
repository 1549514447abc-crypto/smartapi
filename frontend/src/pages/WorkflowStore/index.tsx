import { useEffect, useState } from 'react';
import { Button, Select, Input, Spin, message } from 'antd';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import type { WorkflowPlatform, WorkflowCategory } from '../../types/workflow';
import { api } from '../../api/request';
import './WorkflowStore.css';

const { Option } = Select;

type Platform = 'coze' | 'make' | 'n8n' | 'comfyui';

interface PlatformConfig {
  platform_key: string;
  platform_name: string;
  description: string;
  yearly_price: number;
  is_hot: boolean;
}

interface CategoryConfig {
  category_key: string;
  category_name: string;
  icon: string;
  workflow_count: number;
}

interface PackageConfig {
  package_key: string;
  package_name: string;
  package_type: 'individual' | 'combined';
  platform_key?: string;
  description: string;
  original_price: number;
  current_price: number;
  features: string[];
  savings_text: string;
  is_popular: boolean;
}

const WorkflowStore = () => {
  const { workflows, pagination, filters, loading, fetchWorkflows, setFilters } = useWorkflowStore();
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('coze');
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [showVipBanner, setShowVipBanner] = useState(true);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [packages, setPackages] = useState<PackageConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
    fetchWorkflows();
  }, []);

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      const [platformsRes, categoriesRes, packagesRes] = await Promise.all([
        api.get<{ success: boolean; data: PlatformConfig[] }>('/workflow-config/platforms'),
        api.get<{ success: boolean; data: CategoryConfig[] }>('/workflow-config/categories'),
        api.get<{ success: boolean; data: PackageConfig[] }>('/workflow-config/packages')
      ]);

      if (platformsRes.success) setPlatforms(platformsRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (packagesRes.success) setPackages(packagesRes.data);
    } catch (error) {
      console.error('加载配置失败:', error);
      message.error('加载配置失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const getPlatformConfig = (platformKey: string) => {
    return platforms.find(p => p.platform_key === platformKey);
  };

  const getCurrentPackage = () => {
    return packages.find(p => p.package_type === 'individual' && p.platform_key === currentPlatform);
  };

  const getCombinedPackage = () => {
    return packages.find(p => p.package_type === 'combined');
  };

  const switchPlatform = (platform: Platform) => {
    setCurrentPlatform(platform);
    setFilters({ platform, page: 1 });
    fetchWorkflows({ ...filters, platform, page: 1 });
  };

  const filterCategory = (category: string) => {
    setCurrentCategory(category);
    const cat = category === 'all' ? undefined : category as WorkflowCategory;
    setFilters({ category: cat, page: 1 });
    fetchWorkflows({ ...filters, category: cat, page: 1 });
  };

  const purchaseMembership = (type: 'individual' | 'combined') => {
    if (type === 'individual') {
      const pkg = getCurrentPackage();
      if (pkg) {
        message.info(`即将开通${pkg.package_name}（¥${pkg.current_price}/年）`);
      }
    } else {
      const pkg = getCombinedPackage();
      if (pkg) {
        message.info(`即将开通${pkg.package_name}（¥${pkg.current_price}/年）`);
      }
    }
  };

  if (configLoading) {
    return (
      <div className="workflow-store-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" tip="加载配置中..." />
      </div>
    );
  }

  const currentPlatformConfig = getPlatformConfig(currentPlatform);
  const individualPackage = getCurrentPackage();
  const combinedPackage = getCombinedPackage();

  return (
    <div className="workflow-store-container">
      {/* VIP Banner */}
      {showVipBanner && (
        <div className="vip-banner">
          <div className="vip-info">
            <div className="vip-icon">👑</div>
            <div className="vip-text">
              温馨提示：下载的工作流包包含导入方法指导视频，无需开通coze团队版会员也可按教学视频导入
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
            onClick={() => switchPlatform(platform.platform_key as Platform)}
          >
            {platform.platform_name}工作流
            {platform.is_hot && <span className="tab-badge">HOT</span>}
          </div>
        ))}
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
                  <div className="category-count">{cat.workflow_count}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          <div className="content-header">
            <div className="content-title">{currentPlatformConfig?.platform_name}工作流商店</div>
            <div className="content-subtitle">
              {currentPlatformConfig?.description}
            </div>
          </div>

          {/* Membership Cards */}
          <div className="membership-section">
            <div className="membership-container">
              {individualPackage && (
                <div className="membership-card individual">
                  <div className="membership-title">{individualPackage.package_name}</div>
                  <div className="membership-desc">{individualPackage.description}</div>
                  <div className="membership-price">¥{individualPackage.current_price}</div>
                  <div className="membership-period">/ 年</div>
                  <ul className="membership-features">
                    {individualPackage.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                  <div className="membership-buttons">
                    <button className="membership-btn" onClick={() => purchaseMembership('individual')}>
                      立即开通
                    </button>
                    {individualPackage.discount_rate && (
                      <button className="discount-btn">🔥 限时{(individualPackage.discount_rate * 10).toFixed(0)}折购买</button>
                    )}
                  </div>
                  <div className="savings-text">{individualPackage.savings_text}</div>
                </div>
              )}

              {combinedPackage && (
                <div className="membership-card combined">
                  {combinedPackage.is_popular && <div className="popular-badge">最受欢迎</div>}
                  <div className="membership-title">{combinedPackage.package_name}</div>
                  <div className="membership-desc">{combinedPackage.description}</div>
                  <div className="membership-price">¥{combinedPackage.current_price}</div>
                  <div className="membership-period">/ 年</div>
                  <ul className="membership-features">
                    {combinedPackage.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                  <div className="membership-buttons">
                    <button className="membership-btn" onClick={() => purchaseMembership('combined')}>
                      立即开通
                    </button>
                  </div>
                  <div className="savings-text">{combinedPackage.savings_text}</div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-left">
              <Select
                className="filter-select"
                defaultValue="latest"
                onChange={(value) => setFilters({ ...filters, sort_by: value })}
              >
                <Option value="latest">最新发布</Option>
                <Option value="popular">最受欢迎</Option>
                <Option value="price_low">价格从低到高</Option>
                <Option value="price_high">价格从高到低</Option>
              </Select>
              <Select className="filter-select" defaultValue="all">
                <Option value="all">全部价格</Option>
                <Option value="free">免费</Option>
                <Option value="paid">付费</Option>
                <Option value="svip">SVIP免费</Option>
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
                <div key={workflow.id} className="workflow-card">
                  <div className="workflow-thumbnail">
                    {workflow.cover_url ? (
                      <img src={workflow.cover_url} alt={workflow.name} />
                    ) : (
                      <div style={{ background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
                        {workflow.category === 'video' ? '🎬' : '⚙️'}
                      </div>
                    )}
                    {workflow.is_svip_free && <div className="svip-badge">SVIP免费下载</div>}
                    {workflow.price > 0 && <div className="price-badge">¥{workflow.price}</div>}
                    <div className="play-icon">▶</div>
                  </div>
                  <div className="workflow-content">
                    <div className="workflow-title">{workflow.name}</div>
                    <div className="workflow-description">{workflow.description || '暂无描述'}</div>
                    <div className="workflow-author">
                      <div className="author-avatar">
                        {workflow.creator_id ? String(workflow.creator_id).charAt(0) : 'U'}
                      </div>
                      <div className="author-name">创作者</div>
                    </div>
                    <div className="workflow-stats">
                      <div className="stat-item">
                        <span>💼</span>
                        <span>{workflow.use_count}次使用</span>
                      </div>
                      <div className="stat-item">
                        <span>👍</span>
                        <span>{workflow.view_count}</span>
                      </div>
                      <div className="stat-item">
                        <span>⭐</span>
                        <span>{workflow.rating}</span>
                      </div>
                    </div>
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
