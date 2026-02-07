import { useState, useEffect } from 'react';
import {
  Table,
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
  Card,
  Spin,
  Avatar,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DollarOutlined,
  CrownOutlined,
  UserOutlined,
  PercentageOutlined,
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
  commission_balance: number;
  workflow_member_status: string | null;
  workflow_member_expire: string | null;
  membership_type: 'none' | 'yearly' | 'course' | null;
  membership_expiry: string | null;
  is_course_student: boolean;
  total_recharged: number;
  total_consumed: number;
  created_at: string;
  last_login_at: string | null;
  wechat_openid?: string | null;
  wechat_unionid?: string | null;
  user_category?: string | null;
}

interface UserCategory {
  id: number;
  category_key: string;
  category_name: string;
  default_course_rate: number;
  default_membership_rate: number;
}

interface PriceConfig {
  coursePrice: number;
  yearlyMembershipPrice: number;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [prices, setPrices] = useState<PriceConfig>({ coursePrice: 799, yearlyMembershipPrice: 299 });
  const [balanceForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [commissionForm] = Form.useForm();

  // 响应式检测 - 1200px 以下使用卡片视图
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1200);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, keyword]);

  useEffect(() => {
    fetchCategories();
    fetchPrices();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/users/list', {
        params: { page, pageSize: 10, keyword: keyword || undefined },
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

  const fetchCategories = async () => {
    try {
      const response: any = await api.get('/admin/user-categories');
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchPrices = async () => {
    try {
      const response: any = await api.get('/system-config/prices');
      if (response.success) {
        setPrices({
          coursePrice: response.data.coursePrice || 799,
          yearlyMembershipPrice: response.data.yearlyMembershipPrice || 299
        });
      }
    } catch (error) {
      console.error('获取价格配置失败:', error);
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
      if (!values.amount && !values.bonus_amount && !values.commission_amount) {
        message.warning('请至少填写一个调整金额');
        return;
      }
      const response: any = await api.post(`/users/${selectedUser?.id}/balance`, {
        amount: values.amount || 0,
        bonus_amount: values.bonus_amount || 0,
        commission_amount: values.commission_amount || 0,
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
    // 课程学员和年度会员是独立的，可以同时拥有
    const isCourseStudent = user.is_course_student || user.membership_type === 'course';
    const isYearlyMember = user.membership_type === 'yearly' && user.membership_expiry;
    memberForm.setFieldsValue({
      is_course_student: isCourseStudent,
      is_yearly_member: isYearlyMember,
      membership_expiry: user.membership_expiry ? dayjs(user.membership_expiry) : null,
    });
    setMemberModalVisible(true);
  };

  const submitMembershipUpdate = async () => {
    try {
      const values = await memberForm.validateFields();
      const isCourseStudent = values.is_course_student;
      const isYearlyMember = values.is_yearly_member;

      // membership_type 只管年度会员，课程学员用 is_course_student 独立控制
      // 两者可以同时存在
      let membershipType = 'none';
      if (isYearlyMember) {
        membershipType = 'yearly';
      }

      const response: any = await api.put(`/users/${selectedUser?.id}/membership`, {
        membership_type: membershipType,
        membership_expiry: isYearlyMember ? values.membership_expiry?.format('YYYY-MM-DD HH:mm:ss') : null,
        is_course_student: isCourseStudent,
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

  const handleEditCommission = (user: User) => {
    setSelectedUser(user);
    commissionForm.setFieldsValue({
      user_category: user.user_category || 'normal',
    });
    setCommissionModalVisible(true);
  };

  const submitCommission = async () => {
    try {
      const values = await commissionForm.validateFields();
      const response: any = await api.put(`/users/${selectedUser?.id}/commission`, values);
      if (response.success) {
        message.success('佣金设置更新成功');
        setCommissionModalVisible(false);
        fetchUsers();
      }
    } catch (error) {
      message.error('佣金设置更新失败');
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
      title: '充值余额',
      dataIndex: 'balance',
      width: 100,
      render: (balance: number) => (
        <span className="text-orange-500 font-medium">
          ¥{Number(balance).toFixed(2)}
        </span>
      ),
    },
    {
      title: '返佣余额',
      dataIndex: 'commission_balance',
      width: 100,
      render: (balance: number) => (
        <span className="text-green-500 font-medium">
          ¥{Number(balance || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '会员类型',
      dataIndex: 'membership_type',
      width: 120,
      render: (type: string, record: User) => {
        const badges = [];

        // 检查是否是课程学员
        if (type === 'course' || record.is_course_student) {
          badges.push(<span key="course" className="badge badge-purple">课程学员</span>);
        }

        // 检查是否是年度会员
        if (type === 'yearly') {
          if (record.membership_expiry && dayjs(record.membership_expiry).isBefore(dayjs())) {
            badges.push(<span key="yearly" className="badge badge-error">会员已过期</span>);
          } else {
            badges.push(<span key="yearly" className="badge badge-warning">年度会员</span>);
          }
        }

        // 如果没有任何会员身份
        if (badges.length === 0) {
          return <span className="badge badge-info">普通用户</span>;
        }

        // 显示所有会员身份
        return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{badges}</div>;
      },
    },
    {
      title: '会员到期',
      dataIndex: 'membership_expiry',
      width: 100,
      render: (date: string, record: User) => {
        if (record.membership_type === 'course' || record.is_course_student) {
          return <span className="text-purple-500">永久</span>;
        }
        if (!date) return <span className="text-gray-400">-</span>;
        const isExpired = dayjs(date).isBefore(dayjs());
        return (
          <span className={isExpired ? 'text-red-500' : 'text-green-500'}>
            {dayjs(date).format('YYYY-MM-DD')}
          </span>
        );
      },
    },
    {
      title: '微信绑定',
      dataIndex: 'wechat_openid',
      width: 80,
      render: (openid: string) => (
        openid ? (
          <span className="badge badge-success">已绑定</span>
        ) : (
          <span className="badge badge-default">未绑定</span>
        )
      ),
    },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      width: 90,
      render: (type: string) => (
        <span className={`badge ${type === 'admin' ? 'badge-error' : 'badge-info'}`}>
          {type === 'admin' ? '管理员' : '普通用户'}
        </span>
      ),
    },
    {
      title: '佣金级别',
      dataIndex: 'user_category',
      width: 90,
      render: (category: string) => {
        const cat = categories.find(c => c.category_key === category);
        const name = cat?.category_name || category || '普通用户';
        const colorMap: Record<string, string> = {
          'normal': 'badge-info',
          'blogger': 'badge-warning',
          'vip': 'badge-purple'
        };
        return (
          <span className={`badge ${colorMap[category] || 'badge-default'}`}>
            {name}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <span className={`badge ${status === 'active' ? 'badge-success' : 'badge-error'}`}>
          {status === 'active' ? '正常' : '禁用'}
        </span>
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
          <Button
            type="link"
            size="small"
            icon={<PercentageOutlined />}
            onClick={() => handleEditCommission(record)}
          >
            佣金
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
      {/* 页面标题 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0 }}>用户管理</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>管理用户、余额和会员</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="搜索用户..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchUsers();
            }}
            style={{ width: 160, minWidth: 120, flex: '1 1 auto', maxWidth: 220 }}
            allowClear
            size="small"
          />
          <Button size="small" type="primary" onClick={() => { setPage(1); fetchUsers(); }}>
            搜索
          </Button>
        </div>
      </div>

      <Card bordered={false}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Spin size="large" />
          </div>
        ) : isMobile ? (
          /* 卡片视图 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map((user) => {
              // 会员类型显示 - 支持多个会员身份同时显示
              const memberBadges = [];

              // 检查是否是课程学员
              if (user.membership_type === 'course' || user.is_course_student) {
                memberBadges.push(<span key="course" className="badge badge-purple">课程学员</span>);
              }

              // 检查是否是年度会员
              if (user.membership_type === 'yearly') {
                if (user.membership_expiry && dayjs(user.membership_expiry).isBefore(dayjs())) {
                  memberBadges.push(<span key="yearly" className="badge badge-error">会员已过期</span>);
                } else {
                  memberBadges.push(<span key="yearly" className="badge badge-warning">年度会员</span>);
                }
              }

              // 如果没有任何会员身份
              if (memberBadges.length === 0) {
                memberBadges.push(<span key="normal" className="badge badge-info">普通用户</span>);
              }

              const memberBadge = <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{memberBadges}</div>;

              return (
                <div
                  key={user.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  {/* 头部：头像 + 用户名 + 状态 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: user.user_type === 'admin' ? '#ef4444' : '#0ea5e9', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>
                          {user.nickname || user.username}
                        </span>
                        {user.user_type === 'admin' && (
                          <span className="badge badge-error">管理员</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        @{user.username} · ID: {user.id}
                      </div>
                    </div>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-error'}`} style={{ flexShrink: 0 }}>
                      {user.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </div>

                  {/* 联系方式 */}
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                    {user.email && <div>邮箱：{user.email}</div>}
                    {user.phone && <div>手机：{user.phone}</div>}
                    <div>
                      微信：{user.wechat_openid ? (
                        <span className="badge badge-success" style={{ marginLeft: 4 }}>已绑定</span>
                      ) : (
                        <span className="badge badge-default" style={{ marginLeft: 4 }}>未绑定</span>
                      )}
                    </div>
                  </div>

                  {/* 余额和会员信息 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 12, fontSize: 13 }}>
                    <span>
                      充值余额：<span style={{ color: '#f97316', fontWeight: 600 }}>¥{Number(user.balance).toFixed(2)}</span>
                    </span>
                    <span>
                      返佣余额：<span style={{ color: '#22c55e', fontWeight: 600 }}>¥{Number(user.commission_balance || 0).toFixed(2)}</span>
                    </span>
                    <span>会员：{memberBadge}</span>
                  </div>

                  {/* 充值消费统计 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 12, fontSize: 12, color: '#94a3b8' }}>
                    <span>累计充值：¥{Number(user.total_recharged || 0).toFixed(2)}</span>
                    <span>累计消费：¥{Number(user.total_consumed || 0).toFixed(2)}</span>
                    <span>注册：{dayjs(user.created_at).format('YYYY-MM-DD')}</span>
                    <span>佣金级别：{categories.find(c => c.category_key === user.user_category)?.category_name || user.user_category || '普通用户'}</span>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <Button size="small" icon={<DollarOutlined />} onClick={() => handleAdjustBalance(user)}>
                      调余额
                    </Button>
                    <Button size="small" icon={<CrownOutlined />} onClick={() => handleEditMembership(user)}>
                      会员
                    </Button>
                    <Button size="small" icon={<PercentageOutlined />} onClick={() => handleEditCommission(user)}>
                      佣金
                    </Button>
                    {user.user_type !== 'admin' && (
                      <Popconfirm
                        title={`确定${user.status === 'active' ? '禁用' : '启用'}此用户吗？`}
                        onConfirm={() => handleStatusChange(user)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          size="small"
                          danger={user.status === 'active'}
                          icon={<EditOutlined />}
                        >
                          {user.status === 'active' ? '禁用' : '启用'}
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 分页 */}
            {users.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ marginRight: 8 }}
                >
                  上一页
                </Button>
                <span style={{ lineHeight: '32px', padding: '0 12px', color: '#64748b' }}>
                  {page} / {Math.ceil(total / 10) || 1}
                </span>
                <Button
                  disabled={page >= Math.ceil(total / 10)}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}

            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                暂无数据
              </div>
            )}
          </div>
        ) : (
          /* 表格视图 */
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: 10,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1700 }}
          />
        )}
      </Card>

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
          <div className="flex gap-4 mb-4 flex-wrap">
            <div>
              <div className="text-gray-500 text-sm">充值金</div>
              <span className="text-orange-500 font-bold text-lg">
                ¥{Number(selectedUser?.balance || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <div className="text-gray-500 text-sm">赠金</div>
              <span className="text-blue-500 font-bold text-lg">
                ¥{Number((selectedUser as any)?.bonus_balance || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <div className="text-gray-500 text-sm">返佣（可提现）</div>
              <span className="text-green-500 font-bold text-lg">
                ¥{Number(selectedUser?.commission_balance || 0).toFixed(2)}
              </span>
            </div>
          </div>
          <Form.Item
            name="amount"
            label="调整充值金"
            extra="正数为增加，负数为扣减，不填则不调整"
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.01}
              precision={2}
              prefix="¥"
              placeholder="输入金额，正数增加，负数扣减"
            />
          </Form.Item>
          <Form.Item
            name="bonus_amount"
            label="调整赠金"
            extra="正数为增加，负数为扣减，不填则不调整"
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.01}
              precision={2}
              prefix="¥"
              placeholder="输入金额，正数增加，负数扣减"
            />
          </Form.Item>
          <Form.Item
            name="commission_amount"
            label="调整返佣余额"
            extra="正数为增加，负数为扣减，不填则不调整（可提现）"
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
          {/* 课程学员 - 独立开关 */}
          <div className="p-4 bg-slate-50 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">课程学员</div>
                <div className="text-xs text-slate-500">¥{prices.coursePrice} 永久有效</div>
              </div>
              <Form.Item name="is_course_student" valuePropName="checked" noStyle>
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </div>
          </div>

          {/* 年度会员 - 独立开关 + 到期时间 */}
          <div className="p-4 bg-slate-50 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-slate-900">年度会员</div>
                <div className="text-xs text-slate-500">¥{prices.yearlyMembershipPrice}/年 需设置到期时间</div>
              </div>
              <Form.Item name="is_yearly_member" valuePropName="checked" noStyle>
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </div>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_yearly_member !== cur.is_yearly_member}>
              {({ getFieldValue }) => {
                if (getFieldValue('is_yearly_member')) {
                  return (
                    <Form.Item
                      name="membership_expiry"
                      label="到期时间"
                      rules={[{ required: true, message: '请设置年度会员到期时间' }]}
                      style={{ marginBottom: 0, marginTop: 12 }}
                    >
                      <DatePicker
                        showTime
                        style={{ width: '100%' }}
                        placeholder="选择到期时间"
                      />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>
          </div>

          <div className="text-xs text-slate-400">
            提示：用户可同时拥有课程学员和年度会员身份
          </div>
        </Form>
      </Modal>

      {/* 编辑佣金设置弹窗 */}
      <Modal
        title={`编辑佣金设置 - ${selectedUser?.username}`}
        open={commissionModalVisible}
        onOk={submitCommission}
        onCancel={() => setCommissionModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={commissionForm} layout="vertical" className="mt-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              用户的佣金比例由所属分类决定。如需设置特殊比例，请先到「分佣设置」创建新分类。
            </p>
          </div>

          <Form.Item
            name="user_category"
            label="用户分类"
            rules={[{ required: true, message: '请选择用户分类' }]}
          >
            <Select placeholder="选择用户分类">
              {categories.map(cat => (
                <Select.Option key={cat.category_key} value={cat.category_key}>
                  {cat.category_name} (课程{cat.default_course_rate}% / 会员{cat.default_membership_rate}%)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
