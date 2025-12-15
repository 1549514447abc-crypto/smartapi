import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, message, Spin } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  CrownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  memberUsers: number;
  todayNewUsers: number;
}

interface PromptStats {
  total: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [promptStats, setPromptStats] = useState<PromptStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // 并行获取统计数据
      const [userResponse, promptResponse] = await Promise.all([
        api.get('/users/stats').catch(() => null),
        api.get('/prompts/list', { params: { page: 1, pageSize: 1 } }).catch(() => null),
      ]);

      if (userResponse && (userResponse as any).success) {
        setUserStats((userResponse as any).data);
      }

      if (promptResponse && (promptResponse as any).success) {
        setPromptStats({ total: (promptResponse as any).data.total || 0 });
      }
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">控制台</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="总用户数"
              value={userStats?.totalUsers || 0}
              prefix={<UserOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="今日新增"
              value={userStats?.todayNewUsers || 0}
              prefix={<TeamOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="会员用户"
              value={userStats?.memberUsers || 0}
              prefix={<CrownOutlined className="text-yellow-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="提示词数量"
              value={promptStats?.total || 0}
              prefix={<MessageOutlined className="text-purple-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={12}>
          <Card title="快捷操作" bordered={false} className="shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/users"
                className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors"
              >
                <UserOutlined className="text-2xl text-blue-500" />
                <div className="mt-2 text-gray-600">用户管理</div>
              </a>
              <a
                href="/prompts"
                className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors"
              >
                <MessageOutlined className="text-2xl text-purple-500" />
                <div className="mt-2 text-gray-600">提示词管理</div>
              </a>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统信息" bordered={false} className="shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">活跃用户</span>
                <span className="font-medium">{userStats?.activeUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">会员比例</span>
                <span className="font-medium">
                  {userStats?.totalUsers
                    ? ((userStats.memberUsers / userStats.totalUsers) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
