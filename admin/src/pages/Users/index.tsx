import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Input,
  Space,
  message,
  Button,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DollarOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import api from '../../api/request';
import dayjs from 'dayjs';

interface User {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  user_type: string;
  balance: number;
  workflow_member_status: string | null;
  workflow_member_expire: string | null;
  total_recharged: number;
  total_consumed: number;
  created_at: string;
  last_login_at: string | null;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceForm] = Form.useForm();
  const [memberForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [page, keyword]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/users/list', {
        params: { page, pageSize: 20, keyword: keyword || undefined },
      });
      if (response.success) {
        setUsers(response.data.list);
        setTotal(response.data.total);
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const response: any = await api.put(`/users/${user.id}/status`, {
        status: newStatus,
      });
      if (response.success) {
        message.success('状态更新成功');
        fetchUsers();
      }
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleAdjustBalance = (user: User) => {
    setSelectedUser(user);
    balanceForm.resetFields();
    setBalanceModalVisible(true);
  };

  const submitBalanceAdjust = async () => {
    try {
      const values = await balanceForm.validateFields();
      const response: any = await api.post(`/users/${selectedUser?.id}/balance`, {
        amount: values.amount,
        reason: values.reason,
      });
      if (response.success) {
        message.success('余额调整成功');
        setBalanceModalVisible(false);
        fetchUsers();
      }
    } catch (error) {
      message.error('余额调整失败');
    }
  };

  const handleEditMembership = (user: User) => {
    setSelectedUser(user);
    memberForm.setFieldsValue({
      workflow_member_status: user.workflow_member_status || 'inactive',
      workflow_member_expire: user.workflow_member_expire
        ? dayjs(user.workflow_member_expire)
        : null,
    });
    setMemberModalVisible(true);
  };

  const submitMembershipUpdate = async () => {
    try {
      const values = await memberForm.validateFields();
      const response: any = await api.put(`/users/${selectedUser?.id}/membership`, {
        workflow_member_status: values.workflow_member_status,
        workflow_member_expire: values.workflow_member_expire?.format('YYYY-MM-DD HH:mm:ss'),
      });
      if (response.success) {
        message.success('会员状态更新成功');
        setMemberModalVisible(false);
        fetchUsers();
      }
    } catch (error) {
      message.error('会员状态更新失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 180,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '手机',
      dataIndex: 'phone',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 100,
      render: (balance: number) => (
        <span className="text-orange-500 font-medium">
          ¥{Number(balance).toFixed(2)}
        </span>
      ),
    },
    {
      title: '会员状态',
      dataIndex: 'workflow_member_status',
      width: 100,
      render: (status: string, record: User) => {
        if (status === 'active' && record.workflow_member_expire) {
          const isExpired = dayjs(record.workflow_member_expire).isBefore(dayjs());
          if (isExpired) {
            return <Tag color="red">已过期</Tag>;
          }
          return <Tag color="gold">会员</Tag>;
        }
        return <Tag>普通用户</Tag>;
      },
    },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      width: 90,
      render: (type: string) => (
        <Tag color={type === 'admin' ? 'red' : 'blue'}>
          {type === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '累计充值',
      dataIndex: 'total_recharged',
      width: 100,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '累计消费',
      dataIndex: 'total_consumed',
      width: 100,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handleAdjustBalance(record)}
          >
            调余额
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CrownOutlined />}
            onClick={() => handleEditMembership(record)}
          >
            会员
          </Button>
          {record.user_type !== 'admin' && (
            <Popconfirm
              title={`确定${record.status === 'active' ? '禁用' : '启用'}此用户吗？`}
              onConfirm={() => handleStatusChange(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger={record.status === 'active'}
                icon={<EditOutlined />}
              >
                {record.status === 'active' ? '禁用' : '启用'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
        <Space>
          <Input
            placeholder="搜索用户名/邮箱/手机"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchUsers();
            }}
            style={{ width: 250 }}
            allowClear
          />
          <Button type="primary" onClick={() => { setPage(1); fetchUsers(); }}>
            搜索
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1600 }}
      />

      {/* 调整余额弹窗 */}
      <Modal
        title={`调整余额 - ${selectedUser?.username}`}
        open={balanceModalVisible}
        onOk={submitBalanceAdjust}
        onCancel={() => setBalanceModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={balanceForm} layout="vertical" className="mt-4">
          <Form.Item label="当前余额">
            <span className="text-orange-500 font-bold text-lg">
              ¥{Number(selectedUser?.balance || 0).toFixed(2)}
            </span>
          </Form.Item>
          <Form.Item
            name="amount"
            label="调整金额"
            rules={[{ required: true, message: '请输入调整金额' }]}
            extra="正数为增加，负数为扣减"
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.01}
              precision={2}
              prefix="¥"
              placeholder="输入金额，正数增加，负数扣减"
            />
          </Form.Item>
          <Form.Item name="reason" label="调整原因">
            <Input.TextArea rows={2} placeholder="请输入调整原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑会员弹窗 */}
      <Modal
        title={`编辑会员 - ${selectedUser?.username}`}
        open={memberModalVisible}
        onOk={submitMembershipUpdate}
        onCancel={() => setMemberModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={memberForm} layout="vertical" className="mt-4">
          <Form.Item
            name="workflow_member_status"
            label="会员状态"
            rules={[{ required: true, message: '请选择会员状态' }]}
          >
            <Select>
              <Select.Option value="active">激活</Select.Option>
              <Select.Option value="inactive">未激活</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="workflow_member_expire"
            label="到期时间"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择到期时间"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
