import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Button, Row, Col, message, Modal, Typography, Space, Divider } from 'antd';
import {
  UserOutlined,
  WalletOutlined,
  CopyOutlined,
  ReloadOutlined,
  BookOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { api } from '../../api/request';
import './Profile.css';

const { Title, Text, Paragraph } = Typography;

interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  balance: number;
  email?: string;
}

interface ApiKeyInfo {
  api_key: string;
  key_name: string;
  status: string;
  created_at: string;
  last_used_at?: string;
  total_calls: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // 获取用户信息
      const userRes = await api.get('/auth/me');
      if (userRes.data.success) {
        setUserInfo(userRes.data.data);
      }

      // 获取API Key信息
      const apiKeyRes = await api.get('/apikey');
      if (apiKeyRes.data.success) {
        setApiKeyInfo(apiKeyRes.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      message.error(error.response?.data?.message || '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKeyInfo?.api_key) {
      navigator.clipboard.writeText(apiKeyInfo.api_key);
      message.success('API密钥已复制到剪贴板');
    }
  };

  const handleRegenerateApiKey = () => {
    Modal.confirm({
      title: '确认刷新API密钥？',
      content: '刷新后，旧的API密钥将立即失效，请确保已更新所有使用该密钥的应用。',
      okText: '确认刷新',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRegenerating(true);
          const res = await api.post('/apikey/regenerate');
          if (res.data.success) {
            setApiKeyInfo(res.data.data);
            message.success('API密钥刷新成功');
          }
        } catch (error: any) {
          message.error(error.response?.data?.message || '刷新API密钥失败');
        } finally {
          setRegenerating(false);
        }
      }
    });
  };

  const handleRecharge = () => {
    navigate('/recharge');
  };

  const featureCards = [
    {
      title: '使用教程',
      description: '查看详细的API使用教程，全面的开发指南',
      icon: <BookOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      action: '立即查看',
      onClick: () => message.info('使用教程功能开发中')
    },
    {
      title: '推广赚钱',
      description: '分享推广，提现收益',
      icon: <GiftOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      action: '立即查看',
      onClick: () => message.info('推广功能开发中')
    },
    {
      title: '每日签到',
      description: '每日签到领取奖励，连续签到获得更多福利',
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
      action: '立即签到',
      onClick: () => message.info('签到功能开发中')
    },
    {
      title: '开发票',
      description: '在线申请发票服务，支持增值税普通发票和专用发票',
      icon: <FileTextOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      action: '立即申请',
      onClick: () => message.info('发票功能开发中')
    }
  ];

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <Text>加载中...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Row gutter={[24, 24]}>
        {/* 左侧：个人信息卡片 */}
        <Col xs={24} lg={8}>
          <Card className="user-info-card" bordered={false}>
            <div className="user-header">
              <Avatar
                size={80}
                icon={<UserOutlined />}
                src={userInfo?.avatar_url}
                className="user-avatar"
              />
              <div className="user-details">
                <Title level={4} style={{ margin: '8px 0 4px' }}>
                  {userInfo?.nickname || userInfo?.username}
                </Title>
                <Text type="secondary">@{userInfo?.username}</Text>
              </div>
            </div>

            <Divider />

            <div className="balance-section">
              <div className="balance-header">
                <Space>
                  <WalletOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <Text strong>账户余额</Text>
                </Space>
              </div>
              <div className="balance-amount">
                <Title level={2} style={{ margin: '12px 0', color: '#1890ff' }}>
                  ¥{userInfo?.balance?.toFixed(2) || '0.00'}
                </Title>
              </div>
              <Button
                type="primary"
                block
                size="large"
                onClick={handleRecharge}
              >
                立即充值
              </Button>
            </div>

            <Divider />

            {/* API密钥区域 */}
            <div className="api-key-section">
              <div className="api-key-header">
                <Text strong>API 密钥</Text>
              </div>
              <div className="api-key-box">
                <Paragraph
                  copyable={{
                    text: apiKeyInfo?.api_key,
                    tooltips: ['复制', '已复制'],
                    icon: [<CopyOutlined key="copy" />, <CopyOutlined key="copied" />]
                  }}
                  ellipsis
                  style={{ marginBottom: 8, fontFamily: 'monospace' }}
                >
                  {apiKeyInfo?.api_key || '暂无密钥'}
                </Paragraph>
                <Space>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyApiKey}
                  >
                    复制
                  </Button>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={regenerating}
                    onClick={handleRegenerateApiKey}
                  >
                    刷新
                  </Button>
                </Space>
              </div>
              {apiKeyInfo && (
                <div className="api-key-stats">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    调用次数: {apiKeyInfo.total_calls} |
                    创建时间: {new Date(apiKeyInfo.created_at).toLocaleDateString()}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 右侧：功能入口卡片 */}
        <Col xs={24} lg={16}>
          <Title level={4} style={{ marginBottom: 16 }}>快捷功能</Title>
          <Row gutter={[16, 16]}>
            {featureCards.map((card, index) => (
              <Col xs={24} sm={12} key={index}>
                <Card
                  className="feature-card"
                  hoverable
                  onClick={card.onClick}
                >
                  <div className="feature-card-content">
                    <div className="feature-icon">{card.icon}</div>
                    <Title level={5} style={{ marginTop: 16 }}>
                      {card.title}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                      {card.description}
                    </Paragraph>
                    <Button type="link" style={{ padding: 0 }}>
                      {card.action} →
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
