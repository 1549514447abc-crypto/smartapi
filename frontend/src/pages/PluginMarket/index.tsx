import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Input, Spin, Tag, message } from 'antd';
import { api } from '../../api/request';
import './PluginMarket.css';

const { Option } = Select;

interface Plugin {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  icon_url: string | null;
  version: string;
  install_count: number;
  rating: string | number;
  review_count: number;
  is_free: boolean;
  status: string;
  feishu_link: string | null;
  developer?: {
    id: number;
    username: string;
    nickname: string;
    avatar_url: string | null;
  };
}

interface PluginCategory {
  category_key: string;
  category_name: string;
  icon: string;
  plugin_count: number;
}

const PluginMarket = () => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<PluginCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchPlugins();
  }, []);

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: PluginCategory[] }>('/plugin-categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('加载插件分类失败:', error);
      message.error('加载插件分类失败');
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          plugins: Plugin[];
          pagination: { total: number; page: number; limit: number; total_pages: number }
        }
      }>('/plugins');
      if (response.success && response.data.plugins) {
        setPlugins(response.data.plugins);
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
      message.error('获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filterCategory = (cat: string) => {
    setCategory(cat);
  };

  const viewPluginDetail = (plugin: Plugin) => {
    // 跳转到插件详情页
    navigate(`/plugin-market/${plugin.id}`);
  };

  const filteredPlugins = category === 'all'
    ? plugins
    : plugins.filter(p => p.category === category || (category === 'other' && !p.category));

  const getCategoryCount = (catKey: string) => {
    if (catKey === 'all') return plugins.length;
    return plugins.filter(p => p.category === catKey || (catKey === 'other' && !p.category)).length;
  };

  return (
    <div className="plugin-market-container">
      {/* Header */}
      <div className="plugin-header">
        <div className="plugin-header-content">
          <h1>插件市场</h1>
          <p>丰富的API插件生态，一键安装即用，按使用量计费</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="plugin-main-container">
        {/* Sidebar */}
        <div className="plugin-sidebar">
          <div className="plugin-sidebar-section">
            <div className="plugin-sidebar-title">🗂️ 插件分类</div>
            <Spin spinning={categoryLoading}>
              <ul className="plugin-category-list">
                {categories.map((cat) => (
                  <li
                    key={cat.category_key}
                    className={`plugin-category-item ${category === cat.category_key ? 'active' : ''}`}
                    onClick={() => filterCategory(cat.category_key)}
                  >
                    <div className="plugin-category-icon">{cat.icon}</div>
                    <div className="plugin-category-text">{cat.category_name}</div>
                    <div className="plugin-category-count">
                      {getCategoryCount(cat.category_key)}
                    </div>
                  </li>
                ))}
              </ul>
            </Spin>
          </div>
        </div>

        {/* Content Area */}
        <div className="plugin-content-area">
          <div className="plugin-content-header">
            <div className="plugin-content-title">精选插件</div>
            <div className="plugin-content-subtitle">
              提供文生图、视频生成、大模型接口等多种API服务，按使用量灵活计费
            </div>
          </div>

          {/* Filter Bar */}
          <div className="plugin-filter-bar">
            <div className="plugin-filter-left">
              <Select className="plugin-filter-select" defaultValue="popular">
                <Option value="popular">最受欢迎</Option>
                <Option value="latest">最新上架</Option>
                <Option value="price_low">价格从低到高</Option>
                <Option value="price_high">价格从高到低</Option>
              </Select>
            </div>
            <div className="plugin-search-box">
              <div className="plugin-search-icon">🔍</div>
              <Input
                className="plugin-search-input"
                placeholder="搜索插件名称或关键词..."
                allowClear
              />
            </div>
          </div>

          {/* Plugin Grid */}
          <Spin spinning={loading}>
            <div className="plugin-grid">
              {filteredPlugins.map((plugin) => (
                <div key={plugin.id} className="plugin-card">
                  <div className="plugin-icon">
                    {plugin.icon_url ? (
                      <img src={plugin.icon_url} alt={plugin.name} />
                    ) : (
                      <div className="plugin-icon-placeholder">
                        {plugin.category === 'image' && '🎨'}
                        {plugin.category === 'video' && '🎬'}
                        {plugin.category === 'content' && '✍️'}
                        {plugin.category === 'scraping' && '🕷️'}
                        {plugin.category === 'automation' && '⚙️'}
                        {plugin.category === 'llm' && '🤖'}
                        {(!plugin.category || !['image', 'video', 'content', 'scraping', 'automation', 'llm'].includes(plugin.category)) && '🔧'}
                      </div>
                    )}
                  </div>
                  <div className="plugin-info">
                    <div className="plugin-name">{plugin.name}</div>
                    <div className="plugin-description">{plugin.description}</div>
                    <div className="plugin-meta">
                      <Tag color="blue">{plugin.category || '其他'}</Tag>
                      <span className="plugin-use-count">
                        {plugin.install_count || 0} 次安装
                      </span>
                    </div>
                    <div className="plugin-footer">
                      <div className="plugin-price">
                        {plugin.is_free ? (
                          <span className="price-free">免费</span>
                        ) : (
                          <span className="price-value">付费插件</span>
                        )}
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => viewPluginDetail(plugin)}
                      >
                        查看详情
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredPlugins.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                暂无插件数据
              </div>
            )}
          </Spin>

          {/* Load More */}
          {filteredPlugins.length > 0 && (
            <div className="plugin-load-more">
              <button className="plugin-load-more-btn">加载更多插件</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginMarket;
