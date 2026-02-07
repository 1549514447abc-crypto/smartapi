import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Progress, Spin, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

interface SystemStatus {
  api: 'ok' | 'error';
  database: 'ok' | 'error';
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  cpu: number;
}

const SystemMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus>({
    api: 'ok',
    database: 'ok',
    uptime: 0,
    memory: { used: 0, total: 0 },
    cpu: 0,
  });

  useEffect(() => {
    fetchData();
    // 每30秒刷新一次
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取真实系统状态
      const response: any = await api.get('/admin/system-status');
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      message.error('获取系统状态失败');
      // 设置API状态为错误
      setStatus(prev => ({ ...prev, api: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const serviceCards = [
    {
      name: 'API 服务',
      status: status.api,
      icon: <ApiOutlined />,
      description: 'Express.js 后端服务',
    },
    {
      name: '数据库',
      status: status.database,
      icon: <DatabaseOutlined />,
      description: 'MySQL 数据库',
    },
    {
      name: '文件存储',
      status: 'ok' as const,
      icon: <CloudServerOutlined />,
      description: '本地文件存储',
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
          <h1 className="page-title">系统监控</h1>
          <p className="page-subtitle">监控系统运行状态和性能指标</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: status.api === 'ok' ? '#f0fdf4' : '#fef2f2',
            borderRadius: 20,
            fontSize: 13,
            color: status.api === 'ok' ? '#16a34a' : '#dc2626',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: status.api === 'ok' ? '#22c55e' : '#ef4444',
              animation: 'pulse 2s infinite',
            }} />
            系统{status.api === 'ok' ? '正常' : '异常'}
          </div>
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </div>
      </div>

      {/* 服务状态 */}
      <Row gutter={[20, 20]}>
        {serviceCards.map((service, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card bordered={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: service.status === 'ok' ? '#f0fdf4' : '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: service.status === 'ok' ? '#22c55e' : '#ef4444',
                }}>
                  {service.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{service.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{service.description}</div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: service.status === 'ok' ? '#22c55e' : '#ef4444',
                }}>
                  {service.status === 'ok' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  <span style={{ fontSize: 13 }}>{service.status === 'ok' ? '运行中' : '异常'}</span>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 资源使用 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={8}>
          <Card title="CPU 使用率" bordered={false}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={status.cpu}
                strokeColor="#0ea5e9"
                trailColor="#e2e8f0"
                width={120}
              />
              <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>
                当前使用率
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="内存使用" bordered={false}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={Math.round((status.memory.used / status.memory.total) * 100)}
                strokeColor="#a855f7"
                trailColor="#e2e8f0"
                width={120}
                format={() => `${Math.round((status.memory.used / status.memory.total) * 100)}%`}
              />
              <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>
                {status.memory.used}MB / {status.memory.total}MB
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="系统运行时间" bordered={false}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                {formatUptime(status.uptime)}
              </div>
              <div style={{ fontSize: 14, color: '#64748b' }}>
                自上次启动以来
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemMonitor;
