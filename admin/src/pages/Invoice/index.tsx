import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Select, Input, Modal, Form, message, Row, Col } from 'antd';
import {
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

const { Option } = Select;
const { TextArea } = Input;

interface InvoiceApplication {
  id: number;
  user_id: number;
  invoice_type: 'normal' | 'special';
  title: string;
  tax_number: string | null;
  amount: number;
  email: string;
  remark: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  admin_remark: string | null;
  processed_at: string | null;
  created_at: string;
  user?: {
    id: number;
    username: string;
    email: string;
    phone: string;
  };
}

interface InvoiceStats {
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  total: number;
}

interface UserInvoiceStats {
  user: {
    id: number;
    username: string;
    phone: string;
    email: string;
  };
  total_consumed: number;
  total_invoiced: number;
  available_amount: number;
  invoice_history: Array<{
    id: number;
    amount: number;
    status: string;
    invoice_type: string;
    title: string;
    created_at: string;
    processed_at: string | null;
  }>;
}

const Invoice = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<InvoiceApplication[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({ pending: 0, processing: 0, completed: 0, rejected: 0, total: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ status: '', invoice_type: '', keyword: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<InvoiceApplication | null>(null);
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  const [userStats, setUserStats] = useState<UserInvoiceStats | null>(null);
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  useEffect(() => {
    fetchData();
  }, [pagination.page, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.invoice_type) params.append('invoice_type', filters.invoice_type);
      if (filters.keyword) params.append('keyword', filters.keyword);

      const [listRes, statsRes] = await Promise.all([
        api.get(`/invoice/admin?${params.toString()}`),
        api.get('/invoice/admin/stats')
      ]);

      if ((listRes as any)?.success) {
        setApplications((listRes as any).data.list || []);
        setPagination(prev => ({
          ...prev,
          total: (listRes as any).data.pagination?.total || 0
        }));
      }

      if ((statsRes as any)?.success) {
        setStats((statsRes as any).data);
      }
    } catch (error) {
      console.error('获取开票申请失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (values: { status: string; admin_remark?: string }) => {
    if (!currentApplication) return;

    setUpdating(true);
    try {
      const res = await api.put(`/invoice/admin/${currentApplication.id}/status`, values);
      if ((res as any)?.success) {
        message.success('状态更新成功');
        setModalVisible(false);
        fetchData();
      } else {
        message.error('更新失败');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      message.error('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = async (record: InvoiceApplication) => {
    setCurrentApplication(record);
    form.setFieldsValue({
      status: record.status,
      admin_remark: record.admin_remark || ''
    });
    setModalVisible(true);

    // 获取用户开票统计
    setLoadingUserStats(true);
    setUserStats(null);
    try {
      const res = await api.get(`/invoice/admin/user/${record.user_id}/stats`);
      if ((res as any)?.success) {
        setUserStats((res as any).data);
      }
    } catch (error) {
      console.error('获取用户开票统计失败:', error);
    } finally {
      setLoadingUserStats(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'orange', icon: <ClockCircleOutlined />, label: '待处理' },
    processing: { color: 'blue', icon: <SyncOutlined spin />, label: '处理中' },
    completed: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
    rejected: { color: 'red', icon: <CloseCircleOutlined />, label: '已拒绝' }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '申请人',
      dataIndex: 'user',
      width: 150,
      render: (user: InvoiceApplication['user']) => (
        <div>
          <div style={{ fontWeight: 500 }}>{user?.username || '未知'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.phone || user?.email}</div>
        </div>
      )
    },
    {
      title: '发票类型',
      dataIndex: 'invoice_type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'special' ? 'purple' : 'blue'}>
          {type === 'special' ? '专用发票' : '普通发票'}
        </Tag>
      )
    },
    {
      title: '发票抬头',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '税号',
      dataIndex: 'tax_number',
      width: 160,
      render: (v: string) => v || '-'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#0ea5e9' }}>
          ¥{Number(amount).toFixed(2)}
        </span>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusConfig[status] || statusConfig.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, record: InvoiceApplication) => (
        <Button
          type="link"
          size="small"
          onClick={() => openUpdateModal(record)}
        >
          处理
        </Button>
      )
    }
  ];

  const statCards = [
    { label: '待处理', value: stats.pending, color: '#f59e0b', bg: '#fff7ed' },
    { label: '处理中', value: stats.processing, color: '#0ea5e9', bg: '#eff6ff' },
    { label: '已完成', value: stats.completed, color: '#22c55e', bg: '#f0fdf4' },
    { label: '已拒绝', value: stats.rejected, color: '#ef4444', bg: '#fef2f2' },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">开票管理</h1>
          <p className="page-subtitle">处理用户开票申请</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card, index) => (
          <Col xs={12} sm={6} key={index}>
            <div style={{
              padding: 20,
              background: card.bg,
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
                {card.value}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {card.label}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 筛选栏 */}
      <Card bordered={false} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={filters.status || undefined}
            onChange={(v) => setFilters(prev => ({ ...prev, status: v || '' }))}
          >
            <Option value="pending">待处理</Option>
            <Option value="processing">处理中</Option>
            <Option value="completed">已完成</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Select
            placeholder="发票类型"
            allowClear
            style={{ width: 120 }}
            value={filters.invoice_type || undefined}
            onChange={(v) => setFilters(prev => ({ ...prev, invoice_type: v || '' }))}
          >
            <Option value="normal">普通发票</Option>
            <Option value="special">专用发票</Option>
          </Select>
          <Input
            placeholder="搜索抬头/邮箱/税号"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={() => fetchData()}
          />
          <Button type="primary" onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchData(); }}>
            搜索
          </Button>
        </div>
      </Card>

      {/* 申请列表 */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#0ea5e9' }} />
            开票申请列表
          </span>
        }
        bordered={false}
      >
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, page, limit: pageSize }));
            }
          }}
        />
      </Card>

      {/* 状态更新弹窗 */}
      <Modal
        title="处理开票申请"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentApplication && (
          <div style={{ marginBottom: 20 }}>
            {/* 本次申请信息 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>本次申请</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>发票类型</div>
                  <div style={{ fontWeight: 500 }}>
                    {currentApplication.invoice_type === 'special' ? '专用发票' : '普通发票'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>开票金额</div>
                  <div style={{ fontWeight: 600, color: '#0ea5e9' }}>¥{Number(currentApplication.amount).toFixed(2)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>发票抬头</div>
                  <div style={{ fontWeight: 500 }}>{currentApplication.title}</div>
                </div>
                {currentApplication.tax_number && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>税号</div>
                    <div>{currentApplication.tax_number}</div>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>接收邮箱</div>
                  <div>{currentApplication.email}</div>
                </div>
                {currentApplication.remark && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>用户备注</div>
                    <div>{currentApplication.remark}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 用户开票统计 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>用户开票统计</div>
              {loadingUserStats ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>加载中...</div>
              ) : userStats ? (
                <div style={{ padding: 16, background: '#fefce8', borderRadius: 8, border: '1px solid #fef08a' }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#854d0e' }}>累计消费</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#a16207' }}>
                          ¥{userStats.total_consumed.toFixed(2)}
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#854d0e' }}>已开票</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#a16207' }}>
                          ¥{userStats.total_invoiced.toFixed(2)}
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#166534' }}>可开票余额</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                          ¥{userStats.available_amount.toFixed(2)}
                        </div>
                      </div>
                    </Col>
                  </Row>
                  {/* 校验提示 */}
                  {Number(currentApplication.amount) > userStats.available_amount && (
                    <div style={{ marginTop: 12, padding: 8, background: '#fef2f2', borderRadius: 4, color: '#dc2626', fontSize: 12 }}>
                      ⚠️ 警告：本次申请金额 ¥{Number(currentApplication.amount).toFixed(2)} 超过可开票余额 ¥{userStats.available_amount.toFixed(2)}，建议拒绝
                    </div>
                  )}
                  {Number(currentApplication.amount) <= userStats.available_amount && (
                    <div style={{ marginTop: 12, padding: 8, background: '#f0fdf4', borderRadius: 4, color: '#16a34a', fontSize: 12 }}>
                      ✓ 本次申请金额在可开票范围内
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', textAlign: 'center' }}>
                  无法获取用户统计信息
                </div>
              )}
            </div>

            {/* 用户历史开票记录 */}
            {userStats && userStats.invoice_history.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>历史开票记录</div>
                <div style={{ maxHeight: 150, overflowY: 'auto', background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: '#64748b' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>金额</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>类型</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>状态</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>申请时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userStats.invoice_history.map(item => (
                        <tr key={item.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 500 }}>¥{Number(item.amount).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px' }}>{item.invoice_type === 'special' ? '专票' : '普票'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <Tag color={statusConfig[item.status]?.color || 'default'}>
                              {statusConfig[item.status]?.label || item.status}
                            </Tag>
                          </td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{dayjs(item.created_at).format('MM-DD HH:mm')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleStatusUpdate}>
          <Form.Item
            name="status"
            label="更新状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Form.Item>
          <Form.Item name="admin_remark" label="管理员备注">
            <TextArea rows={3} placeholder="可填写处理说明或拒绝原因" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={updating}>
              确认更新
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Invoice;
