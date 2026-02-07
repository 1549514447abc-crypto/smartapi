import { useState, useEffect } from 'react';
import { Card, Row, Col, message, Spin, Button } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  CrownOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DollarOutlined,
  ApiOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

interface DashboardStats {
  // 用户数据
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  memberUsers: number;
  todayNewUsers: number;
  yesterdayNewUsers: number;
  usersTrend: string;
  // 收入数据
  todayIncome: number;
  yesterdayIncome: number;
  totalIncome: number;
  incomeTrend: string;
  // API调用数据
  todayApiCalls: number;
  yesterdayApiCalls: number;
  totalApiCalls: number;
  apiCallsTrend: string;
  // 内容数据
  totalWorkflows: number;
  totalPlugins: number;
  totalPrompts: number;
  // 会员转化率
  memberConversionRate: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/stats');

      if (response && (response as any).success) {
        setStats((response as any).data);
      }
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 解析趋势是正还是负
  const parseTrend = (trend: string) => {
    const isPositive = trend.startsWith('+');
    const isNegative = trend.startsWith('-');
    return { isPositive, isNegative, value: trend };
  };

  // 统计卡片数据
  const statCards = [
    {
      title: '今日收入',
      value: stats?.todayIncome || 0,
      prefix: '¥',
      icon: <DollarOutlined />,
      iconBg: '#eff6ff',
      iconColor: '#0ea5e9',
      trend: stats?.incomeTrend || '0%',
      trendLabel: 'vs 昨日',
    },
    {
      title: '新增用户',
      value: stats?.todayNewUsers || 0,
      icon: <TeamOutlined />,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
      trend: stats?.usersTrend || '0%',
      trendLabel: 'vs 昨日',
    },
    {
      title: 'API调用',
      value: stats?.todayApiCalls || 0,
      icon: <ApiOutlined />,
      iconBg: '#faf5ff',
      iconColor: '#a855f7',
      trend: stats?.apiCallsTrend || '0%',
      trendLabel: 'vs 昨日',
    },
    {
      title: '活跃会员',
      value: stats?.memberUsers || 0,
      icon: <CrownOutlined />,
      iconBg: '#fff7ed',
      iconColor: '#f97316',
      trend: `${stats?.memberConversionRate || 0}%`,
      trendLabel: '转化率',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">数据概览</h1>
          <p className="page-subtitle">查看系统运营数据和关键指标</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button icon={<DownloadOutlined />}>导出数据</Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchStats}>
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[20, 20]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div
                  className="stat-icon"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                {(card as any).prefix}{card.value.toLocaleString()}{(card as any).suffix}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: parseTrend(card.trend).isNegative ? '#ef4444' : '#22c55e'
              }}>
                {parseTrend(card.trend).isNegative ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                <span>{card.trend} {card.trendLabel}</span>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 下方内容 */}
      <Row gutter={[20, 20]} className="mt-6">
        {/* 快捷操作 */}
        <Col xs={24} lg={12}>
          <Card title="快捷操作" bordered={false}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <a
                  href="/admin/users"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 20,
                    background: '#eff6ff',
                    borderRadius: 12,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                >
                  <UserOutlined style={{ fontSize: 24, color: '#0ea5e9', marginBottom: 8 }} />
                  <span style={{ fontSize: 14, color: '#64748b' }}>用户管理</span>
                </a>
              </Col>
              <Col span={8}>
                <a
                  href="/admin/prompts"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 20,
                    background: '#faf5ff',
                    borderRadius: 12,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3e8ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#faf5ff'}
                >
                  <MessageOutlined style={{ fontSize: 24, color: '#a855f7', marginBottom: 8 }} />
                  <span style={{ fontSize: 14, color: '#64748b' }}>提示词</span>
                </a>
              </Col>
              <Col span={8}>
                <a
                  href="/admin/settings"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 20,
                    background: '#f0fdf4',
                    borderRadius: 12,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                >
                  <CrownOutlined style={{ fontSize: 24, color: '#22c55e', marginBottom: 8 }} />
                  <span style={{ fontSize: 14, color: '#64748b' }}>系统设置</span>
                </a>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 系统概况 */}
        <Col xs={24} lg={12}>
          <Card title="系统概况" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: '#eff6ff',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0ea5e9',
                    fontSize: 18,
                  }}>
                    <UserOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>总用户数</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>累计注册用户</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {stats?.totalUsers?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: '#f0fdf4',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                    fontSize: 18,
                  }}>
                    <AppstoreOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>工作流数量</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>已发布工作流</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {stats?.totalWorkflows?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: '#faf5ff',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a855f7',
                    fontSize: 18,
                  }}>
                    <FileTextOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>提示词数量</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>已发布提示词</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  {stats?.totalPrompts?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: '#fff7ed',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f97316',
                    fontSize: 18,
                  }}>
                    <DollarOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>总收入</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>累计订单收入</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
                  ¥{stats?.totalIncome?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
