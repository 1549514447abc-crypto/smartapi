import { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Tabs, Modal, Form, InputNumber, message, Spin } from 'antd';
import {
  SearchOutlined,
  WalletOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

interface UserBalance {
  id: number;
  username: string;
  nickname: string;
  balance: number;
  commission_balance: number;
  total_recharged: number;
  total_consumed: number;
  membership_type: string;
}

interface WithdrawalRequest {
  id: number;
  user_id: number;
  username: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  payment_method: string;
  payment_account: string;
  created_at: string;
}

const UserFinance = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('balances');
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchUsers();
    } else {
      fetchWithdrawals();
    }
  }, [page, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/list', {
        params: { page, pageSize: 20, keyword }
      });
      if ((res as any).success) {
        setUsers((res as any).data.list || []);
        setTotal((res as any).data.total || 0);
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    // 模拟提现申请数据
    setTimeout(() => {
      setWithdrawals([
        {
          id: 1,
          user_id: 101,
          username: '张小明',
          amount: 150.00,
          status: 'pending',
          payment_method: 'alipay',
          payment_account: '138****1234',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 102,
          username: '李雪',
          amount: 200.00,
          status: 'pending',
          payment_method: 'wechat',
          payment_account: 'wx****5678',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          user_id: 103,
          username: '王大力',
          amount: 80.00,
          status: 'approved',
          payment_method: 'alipay',
          payment_account: '139****9999',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);
  };

  const handleAdjustBalance = (user: UserBalance) => {
    setSelectedUser(user);
    form.setFieldsValue({
      balance_amount: 0,
      commission_amount: 0,
      reason: '',
    });
    setAdjustModalVisible(true);
  };

  const handleAdjustSubmit = async () => {
    try {
      const values = await form.validateFields();
      await api.put(`/users/${selectedUser?.id}/balance`, values);
      message.success('余额调整成功');
      setAdjustModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('余额调整失败');
    }
  };

  const handleWithdrawalAction = async (_id: number, action: 'approve' | 'reject') => {
    message.success(`提现申请已${action === 'approve' ? '通过' : '拒绝'}`);
    fetchWithdrawals();
  };

  const balanceColumns = [
    {
      title: '用户',
      dataIndex: 'username',
      width: 180,
      render: (name: string, record: UserBalance) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#0ea5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 500,
          }}>
            {(record.nickname || name).charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: '#0f172a' }}>{record.nickname || name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{name}</div>
          </div>
        </div>
      ),
    },
    {
      title: '会员类型',
      dataIndex: 'membership_type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; className: string }> = {
          course: { label: '课程学员', className: 'badge-purple' },
          yearly: { label: '年度会员', className: 'badge-warning' },
          none: { label: '普通用户', className: 'badge-info' },
        };
        const config = typeMap[type] || typeMap['none'];
        return <span className={`badge ${config.className}`}>{config.label}</span>;
      },
    },
    {
      title: '充值余额',
      dataIndex: 'balance',
      width: 120,
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          ¥{Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '返佣余额',
      dataIndex: 'commission_balance',
      width: 120,
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#22c55e' }}>
          ¥{Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '累计充值',
      dataIndex: 'total_recharged',
      width: 120,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '累计消费',
      dataIndex: 'total_consumed',
      width: 120,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, record: UserBalance) => (
        <Button
          type="link"
          icon={<WalletOutlined />}
          onClick={() => handleAdjustBalance(record)}
        >
          调整
        </Button>
      ),
    },
  ];

  const withdrawalColumns = [
    {
      title: '申请ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 120,
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#a855f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
          }}>
            {name.charAt(0)}
          </div>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#ef4444' }}>
          ¥{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '提现方式',
      dataIndex: 'payment_method',
      width: 100,
      render: (method: string) => (
        <span className={`badge ${method === 'alipay' ? 'badge-info' : 'badge-success'}`}>
          {method === 'alipay' ? '支付宝' : '微信'}
        </span>
      ),
    },
    {
      title: '收款账号',
      dataIndex: 'payment_account',
      width: 140,
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          pending: { label: '待审核', className: 'badge-warning' },
          approved: { label: '已通过', className: 'badge-success' },
          rejected: { label: '已拒绝', className: 'badge-error' },
          paid: { label: '已打款', className: 'badge-info' },
        };
        const config = statusMap[status] || statusMap['pending'];
        return <span className={`badge ${config.className}`}>{config.label}</span>;
      },
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: WithdrawalRequest) => (
        record.status === 'pending' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#22c55e' }}
              onClick={() => handleWithdrawalAction(record.id, 'approve')}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              icon={<CloseCircleOutlined />}
              danger
              onClick={() => handleWithdrawalAction(record.id, 'reject')}
            >
              拒绝
            </Button>
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>-</span>
        )
      ),
    },
  ];

  const tabItems = [
    {
      key: 'balances',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WalletOutlined />
          用户余额
        </span>
      ),
    },
    {
      key: 'withdrawals',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined />
          提现审核
          <span className="badge badge-error" style={{ marginLeft: 4 }}>
            {withdrawals.filter(w => w.status === 'pending').length}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">用户财务</h1>
          <p className="page-subtitle">管理用户余额和提现申请</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            placeholder="搜索用户名..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => { setPage(1); fetchUsers(); }}
            style={{ width: 240 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => activeTab === 'balances' ? fetchUsers() : fetchWithdrawals()}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <Card bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : activeTab === 'balances' ? (
          <Table
            columns={balanceColumns}
            dataSource={users}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        ) : (
          <Table
            columns={withdrawalColumns}
            dataSource={withdrawals}
            rowKey="id"
            pagination={false}
          />
        )}
      </Card>

      {/* 余额调整弹窗 */}
      <Modal
        title={`调整余额 - ${selectedUser?.nickname || selectedUser?.username}`}
        open={adjustModalVisible}
        onOk={handleAdjustSubmit}
        onCancel={() => setAdjustModalVisible(false)}
        okText="确认调整"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            padding: 16,
            background: '#f8fafc',
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>当前充值余额</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
                ¥{Number(selectedUser?.balance || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>当前返佣余额</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e' }}>
                ¥{Number(selectedUser?.commission_balance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <Form.Item
            name="balance_amount"
            label="调整充值余额"
            extra="正数增加，负数扣减"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="输入调整金额"
              prefix="¥"
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="commission_amount"
            label="调整返佣余额"
            extra="正数增加，负数扣减"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="输入调整金额"
              prefix="¥"
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="调整原因"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入调整原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserFinance;
