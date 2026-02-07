import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Tag, message, Card, Descriptions } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { api } from '../../api/request';
import './PluginMarket.css';

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
}

const PluginDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [categories, setCategories] = useState<PluginCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchPluginDetail();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get<{ success: boolean; data: PluginCategory[] }>('/plugin-categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchPluginDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: Plugin }>(`/plugins/${id}`);
      if (response.success) {
        setPlugin(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch plugin detail:', error);
      message.error('获取插件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const openFeishuLink = () => {
    if (plugin?.feishu_link) {
      window.open(plugin.feishu_link, '_blank');
    } else {
      message.warning('暂无详情链接');
    }
  };

  // 获取分类信息
  const getCategoryInfo = () => {
    if (!plugin?.category) return { name: '其他', icon: '🔧' };
    const category = categories.find(c => c.category_key === plugin.category);
    return category ? { name: category.category_name, icon: category.icon } : { name: plugin.category, icon: '🔧' };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>插件不存在</p>
        <Button onClick={() => navigate('/plugin-market')}>返回插件市场</Button>
      </div>
    );
  }

  return (
    <div className="plugin-market-container">
      {/* Header */}
      <div className="plugin-header">
        <div className="plugin-header-content">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/plugin-market')}
            style={{ marginBottom: '16px' }}
          >
            返回插件市场
          </Button>
          <h1>{plugin.name}</h1>
          <p>{plugin.description}</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <Card>
          <div style={{ display: 'flex', gap: '40px' }}>
            {/* Plugin Icon */}
            <div style={{ flex: '0 0 200px' }}>
              <div className="plugin-icon" style={{ width: '200px', height: '200px' }}>
                {plugin.icon_url ? (
                  <img src={plugin.icon_url} alt={plugin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="plugin-icon-placeholder" style={{ width: '100%', height: '100%', fontSize: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getCategoryInfo().icon}
                  </div>
                )}
              </div>
              <Button
                type="primary"
                size="large"
                block
                icon={<LinkOutlined />}
                onClick={openFeishuLink}
                style={{ marginTop: '20px' }}
              >
                查看详情
              </Button>
            </div>

            {/* Plugin Info */}
            <div style={{ flex: 1 }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="插件名称">{plugin.name}</Descriptions.Item>
                <Descriptions.Item label="版本">{plugin.version}</Descriptions.Item>
                <Descriptions.Item label="分类">
                  <Tag color="blue">{getCategoryInfo().icon} {getCategoryInfo().name}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="安装次数">{plugin.install_count} 次</Descriptions.Item>
                <Descriptions.Item label="价格">
                  {plugin.is_free ? (
                    <Tag color="success">免费</Tag>
                  ) : (
                    <Tag color="orange">付费插件</Tag>
                  )}
                </Descriptions.Item>
                {plugin.developer && (
                  <Descriptions.Item label="开发者">
                    {plugin.developer.nickname || plugin.developer.username}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="插件描述">
                  {plugin.description || '暂无描述'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PluginDetail;
