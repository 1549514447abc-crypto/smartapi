import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Select, Modal, Input, message, Row, Col, Descriptions, Space } from 'antd';
import {
  WalletOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;

interface WithdrawalRequest {
  id: number;
  user_id: number;
  amount: number;
  openid: string;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  success_amount: number;
  fail_amount: number;
  transfer_count: number;
  success_count: number;
  remark: string | null;
  created_at: string;
  user?: {
    id: number;
    username: string;
    nickname: string | null;
    phone: string | null;
  };
  reviewer?: {
    id: number;
    username: string;
    nickname: string | null;
  };
}

interface WithdrawalStats {
  [key: string]: {
    count: number;
    totalAmount: number;
  };
}

const Withdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<WithdrawalStats>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WithdrawalRequest | null>(null);
  const [transferDetails, setTransferDetails] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // 自动刷新开关
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    fetchData();
  }, [pagination.page, statusFilter, userSearch]);

  // 自动刷新定时器
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      fetchData(false); // 自动刷新时不显示 loading，避免页面闪烁
    }, 10000); // 每10秒刷新一次

    return () => clearInterval(timer);
  }, [autoRefresh, pagination.page, statusFilter, userSearch]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));
      if (statusFilter) params.append('status', statusFilter);
      if (userSearch) params.append('user_id', userSearch);

      const [listRes, statsRes] = await Promise.all([
        api.get(`/admin/withdrawals?${params.toString()}`),
        api.get('/admin/withdrawals/stats')
      ]);

      if ((listRes as any)?.success) {
        setList((listRes as any).data.list || []);
        setPagination(prev => ({
          ...prev,
          total: (listRes as any).data.pagination?.total || 0
        }));
      }

      if ((statsRes as any)?.success) {
        setStats((statsRes as any).data || {});
      }
    } catch (error) {
      console.error('获取提现列表失败:', error);
      if (showLoading) {
        message.error('获取数据失败');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!currentRecord) return;

    if (action === 'reject' && !rejectReason.trim()) {
      message.error('请填写拒绝原因');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post(`/admin/withdrawals/${currentRecord.id}/review`, {
        action,
        reject_reason: action === 'reject' ? rejectReason : undefined
      });

      if ((res as any)?.success) {
        message.success(action === 'approve' ? '已批准' : '已拒绝');
        setReviewModalVisible(false);
        setRejectReason('');
        fetchData();
      } else {
        message.error((res as any)?.message || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = async (record: WithdrawalRequest) => {
    Modal.confirm({
      title: '确认执行转账？',
      content: `将向用户 ${record.user?.nickname || record.user?.username} 转账 ¥${Number(record.amount).toFixed(2)}`,
      onOk: async () => {
        try {
          const res = await api.post(`/admin/withdrawals/${record.id}/transfer`);
          if ((res as any)?.success) {
            message.success('转账已开始执行，正在处理中...');
            // 延迟刷新，等待转账处理完成
            setTimeout(() => {
              fetchData(false);
            }, 3000);
            // 每3秒轮询一次，最多轮询10次
            let pollCount = 0;
            const pollInterval = setInterval(() => {
              pollCount++;
              fetchData(false);
              if (pollCount >= 10) {
                clearInterval(pollInterval);
              }
            }, 3000);
          } else {
            message.error((res as any)?.message || '执行失败');
          }
        } catch (error: any) {
          message.error(error.message || '执行失败');
        }
      }
    });
  };

  const handleRetry = async (record: WithdrawalRequest) => {
    const failedCount = record.transfer_count - record.success_count;
    Modal.confirm({
      title: '确认重试转账？',
      content: (
        <div>
          <p>将重试失败的转账：</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>总金额：¥{Number(record.amount).toFixed(2)}</li>
            <li>已成功：¥{Number(record.success_amount).toFixed(2)} ({record.success_count}笔)</li>
            <li>失败金额：¥{Number(record.fail_amount).toFixed(2)} ({failedCount}笔)</li>
          </ul>
          <p style={{ marginTop: 8, color: '#666' }}>将重试 {failedCount} 笔失败的转账</p>
        </div>
      ),
      onOk: async () => {
        try {
          const res = await api.post(`/admin/withdrawals/${record.id}/retry`);
          if ((res as any)?.success) {
            message.success('重试已开始执行，正在处理中...');
            // 延迟刷新，等待转账处理完成
            setTimeout(() => {
              fetchData(false);
            }, 3000);
            // 每3秒轮询一次，最多轮询10次
            let pollCount = 0;
            const pollInterval = setInterval(() => {
              pollCount++;
              fetchData(false);
              if (pollCount >= 10) {
                clearInterval(pollInterval);
              }
            }, 3000);
          } else {
            message.error((res as any)?.message || '重试失败');
          }
        } catch (error: any) {
          message.error(error.message || '重试失败');
        }
      }
    });
  };

  const handleCancel = async (record: WithdrawalRequest) => {
    Modal.confirm({
      title: '确认取消转账？',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>将取消等待用户确认收款的转账：</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>用户：{record.user?.nickname || record.user?.username}</li>
            <li>金额：¥{Number(record.amount).toFixed(2)}</li>
          </ul>
          <div style={{
            marginTop: 12,
            padding: 12,
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 8,
            color: '#d46b08'
          }}>
            <strong>⚠️ 注意：</strong>取消后将返还用户的佣金余额
          </div>
        </div>
      ),
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        try {
          const res = await api.post(`/admin/withdrawals/${record.id}/cancel`, {
            reason: '管理员取消转账'
          });
          if ((res as any)?.success) {
            message.success(`已取消转账，返还金额：¥${(res as any).data?.refundAmount?.toFixed(2) || record.amount}`);
            fetchData();
          } else {
            message.error((res as any)?.message || '取消失败');
          }
        } catch (error: any) {
          message.error(error.message || '取消失败');
        }
      }
    });
  };

  const openReviewModal = (record: WithdrawalRequest) => {
    setCurrentRecord(record);
    setRejectReason('');
    setReviewModalVisible(true);
  };

  const openDetailModal = async (record: WithdrawalRequest) => {
    setCurrentRecord(record);
    setDetailModalVisible(true);

    // 获取转账详情
    try {
      const res = await api.get(`/admin/withdrawals/${record.id}/transfers`);
      if ((res as any)?.success) {
        setTransferDetails((res as any).data?.transfers || []);
        console.log('转账明细:', (res as any).data?.transfers);
      }
    } catch (error) {
      console.error('获取转账详情失败:', error);
    }
  };

  // 查询微信商户余额
  const queryWechatBalance = async () => {
    setLoadingBalance(true);
    setBalanceModalVisible(true);
    try {
      const res = await api.get('/admin/withdrawals/wechat-balance');
      if ((res as any)?.success) {
        setBalanceData((res as any).data);
      } else {
        // API权限未开通，显示空数据和提示
        setBalanceData(null);
      }
    } catch (error: any) {
      // 捕获错误，显示空数据和提示
      setBalanceData(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'orange', icon: <ClockCircleOutlined />, label: '待审核' },
    approved: { color: 'blue', icon: <CheckCircleOutlined />, label: '已批准' },
    processing: { color: 'cyan', icon: <SyncOutlined spin />, label: '转账中' },
    success: { color: 'green', icon: <CheckCircleOutlined />, label: '已完成' },
    partial: { color: 'gold', icon: <ExclamationCircleOutlined />, label: '部分成功' },
    failed: { color: 'red', icon: <CloseCircleOutlined />, label: '失败' },
    rejected: { color: 'red', icon: <CloseCircleOutlined />, label: '已拒绝' }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '用户',
      dataIndex: 'user',
      width: 150,
      render: (user: WithdrawalRequest['user']) => (
        <div>
          <div style={{ fontWeight: 500 }}>{user?.nickname || user?.username || '未知'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.phone || '-'}</div>
        </div>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#0ea5e9', fontSize: 16 }}>
          ¥{Number(amount).toFixed(2)}
        </span>
      )
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
      title: '转账结果',
      width: 150,
      render: (_: any, record: WithdrawalRequest) => {
        if (!['success', 'partial', 'failed'].includes(record.status)) return '-';
        return (
          <div style={{ fontSize: 12 }}>
            <div>成功: ¥{Number(record.success_amount).toFixed(2)}</div>
            <div style={{ color: '#ef4444' }}>失败: ¥{Number(record.fail_amount).toFixed(2)}</div>
          </div>
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
      title: '审核人',
      dataIndex: 'reviewer',
      width: 100,
      render: (reviewer: WithdrawalRequest['reviewer']) => reviewer?.nickname || reviewer?.username || '-'
    },
    {
      title: '备注',
      width: 150,
      render: (_: any, record: WithdrawalRequest) => {
        if (record.reject_reason) return <span style={{ color: '#ef4444' }}>{record.reject_reason}</span>;
        if (record.remark) return record.remark;
        return '-';
      }
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: WithdrawalRequest) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetailModal(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => openReviewModal(record)}>
              审核
            </Button>
          )}
          {record.status === 'approved' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleTransfer(record)}
              >
                执行转账
              </Button>
              <Button
                danger
                size="small"
                onClick={() => openReviewModal(record)}
              >
                取消
              </Button>
            </>
          )}
          {record.status === 'processing' && (
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleCancel(record)}
            >
              取消转账
            </Button>
          )}
          {(record.status === 'failed' || record.status === 'partial') && (
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record)}
            >
              重试
            </Button>
          )}
        </Space>
      )
    }
  ];

  const statCards = [
    { key: 'pending', label: '待审核', color: '#f59e0b', bg: '#fff7ed' },
    { key: 'approved', label: '待转账', color: '#0ea5e9', bg: '#eff6ff' },
    { key: 'processing', label: '转账中', color: '#06b6d4', bg: '#ecfeff' },
    { key: 'success', label: '已完成', color: '#22c55e', bg: '#f0fdf4' },
    { key: 'rejected', label: '已拒绝', color: '#ef4444', bg: '#fef2f2' },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">提现管理</h1>
          <p className="page-subtitle">审核用户提现申请并执行转账</p>
        </div>
        <Space>
          <Button
            icon={<WalletOutlined />}
            onClick={queryWechatBalance}
          >
            查看余额
          </Button>
          <Button
            type={autoRefresh ? 'primary' : 'default'}
            icon={<SyncOutlined spin={autoRefresh} />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '自动刷新: 开' : '自动刷新: 关'}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()} loading={loading}>
            手动刷新
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card) => (
          <Col xs={12} sm={4} key={card.key}>
            <div style={{
              padding: 20,
              background: card.bg,
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>
                {stats[card.key]?.count || 0}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 12, color: card.color, marginTop: 4 }}>
                ¥{(stats[card.key]?.totalAmount || 0).toFixed(2)}
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
            style={{ width: 150 }}
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v || '');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <Option value="pending">待审核</Option>
            <Option value="approved">待转账</Option>
            <Option value="processing">转账中</Option>
            <Option value="success">已完成</Option>
            <Option value="partial">部分成功</Option>
            <Option value="failed">失败</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Search
            placeholder="输入用户ID搜索"
            allowClear
            style={{ width: 200 }}
            prefix={<UserOutlined />}
            onSearch={(value) => {
              setUserSearch(value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            enterButton={<SearchOutlined />}
          />
        </div>
      </Card>

      {/* 列表 */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WalletOutlined style={{ color: '#0ea5e9' }} />
            提现申请列表
          </span>
        }
        bordered={false}
      >
        <Table
          columns={columns}
          dataSource={list}
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

      {/* 审核弹窗 */}
      <Modal
        title={currentRecord?.status === 'approved' ? '取消提现' : '审核提现申请'}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={500}
      >
        {currentRecord && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 8
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>用户</div>
                <div style={{ fontWeight: 500 }}>
                  {currentRecord.user?.nickname || currentRecord.user?.username}
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>提现金额</div>
                <div style={{ fontWeight: 600, color: '#0ea5e9', fontSize: 18 }}>
                  ¥{Number(currentRecord.amount).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>微信OpenID</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{currentRecord.openid}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>申请时间</div>
                <div>{dayjs(currentRecord.created_at).format('YYYY-MM-DD HH:mm')}</div>
              </div>
            </div>
          </div>
        )}

        {currentRecord?.status === 'approved' && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b'
          }}>
            <strong>⚠️ 警告：</strong>此提现已批准，取消后将返还用户佣金余额。
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#64748b' }}>
            {currentRecord?.status === 'approved' ? '取消原因（必填）' : '拒绝原因（仅拒绝时需填写）'}
          </label>
          <TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={currentRecord?.status === 'approved' ? '请填写取消原因' : '请填写拒绝原因'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
          <Button
            danger
            onClick={() => handleReview('reject')}
            loading={processing}
          >
            {currentRecord?.status === 'approved' ? '确认取消' : '拒绝'}
          </Button>
          {currentRecord?.status === 'pending' && (
            <Button
              type="primary"
              onClick={() => handleReview('approve')}
              loading={processing}
            >
              批准
            </Button>
          )}
        </div>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="提现详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {currentRecord && (
          <div>
            {/* 基本信息 */}
            <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="申请ID">{currentRecord.id}</Descriptions.Item>
                <Descriptions.Item label="申请时间">
                  {dayjs(currentRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="用户">
                  {currentRecord.user?.nickname || currentRecord.user?.username} (ID: {currentRecord.user_id})
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {currentRecord.user?.phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="提现金额">
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#0ea5e9' }}>
                    ¥{Number(currentRecord.amount).toFixed(2)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {statusConfig[currentRecord.status] && (
                    <Tag color={statusConfig[currentRecord.status].color} icon={statusConfig[currentRecord.status].icon}>
                      {statusConfig[currentRecord.status].label}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="微信OpenID" span={2}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{currentRecord.openid}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 审批信息 */}
            {(currentRecord.reviewed_at || currentRecord.reject_reason) && (
              <Card size="small" title="审批记录" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="审核人">
                    {currentRecord.reviewer?.nickname || currentRecord.reviewer?.username || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="审核时间">
                    {currentRecord.reviewed_at ? dayjs(currentRecord.reviewed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </Descriptions.Item>
                  {currentRecord.reject_reason && (
                    <Descriptions.Item label="拒绝原因" span={2}>
                      <span style={{ color: '#ef4444' }}>{currentRecord.reject_reason}</span>
                    </Descriptions.Item>
                  )}
                  {currentRecord.remark && (
                    <Descriptions.Item label="备注" span={2}>
                      {currentRecord.remark}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            {/* 转账信息 */}
            {['processing', 'success', 'partial', 'failed'].includes(currentRecord.status) && (
              <Card size="small" title="转账信息" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small" style={{ marginBottom: 12 }}>
                  <Descriptions.Item label="转账笔数">
                    {currentRecord.transfer_count} 笔
                  </Descriptions.Item>
                  <Descriptions.Item label="成功笔数">
                    {currentRecord.success_count} 笔
                  </Descriptions.Item>
                  <Descriptions.Item label="成功金额">
                    <span style={{ color: '#22c55e', fontWeight: 500 }}>
                      ¥{Number(currentRecord.success_amount).toFixed(2)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="失败金额">
                    <span style={{ color: '#ef4444', fontWeight: 500 }}>
                      ¥{Number(currentRecord.fail_amount).toFixed(2)}
                    </span>
                  </Descriptions.Item>
                </Descriptions>

                {/* 转账明细 */}
                {transferDetails.length > 0 && (
                  <Table
                    size="small"
                    dataSource={transferDetails}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: '序号',
                        dataIndex: 'transfer_no',
                        width: 60,
                      },
                      {
                        title: '金额',
                        dataIndex: 'amount',
                        width: 100,
                        render: (amount: number) => `¥${Number(amount).toFixed(2)}`
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 80,
                        render: (status: string) => {
                          const config: Record<string, { color: string; label: string }> = {
                            pending: { color: 'orange', label: '待转账' },
                            processing: { color: 'blue', label: '转账中' },
                            success: { color: 'green', label: '成功' },
                            failed: { color: 'red', label: '失败' },
                          };
                          return <Tag color={config[status]?.color}>{config[status]?.label || status}</Tag>;
                        }
                      },
                      {
                        title: '微信批次号',
                        dataIndex: 'wechat_batch_id',
                        ellipsis: true,
                        render: (id: string) => id || '-'
                      },
                      {
                        title: '失败原因',
                        dataIndex: 'fail_reason',
                        width: 200,
                        ellipsis: true,
                        render: (reason: string) => reason ? (
                          <span style={{ color: '#ef4444', fontSize: 12 }}>{reason}</span>
                        ) : '-'
                      },
                      {
                        title: '转账时间',
                        dataIndex: 'transferred_at',
                        width: 150,
                        render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
                      },
                    ]}
                  />
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* 余额查询弹窗 */}
      <Modal
        title="微信商户账户余额"
        open={balanceModalVisible}
        onCancel={() => setBalanceModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBalanceModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {loadingBalance ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <SyncOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
            <div style={{ marginTop: 16, color: '#999' }}>正在查询余额...</div>
          </div>
        ) : balanceData ? (
          <div>
            {/* 运营账户 */}
            <Card
              size="small"
              title={
                <span>
                  <WalletOutlined style={{ marginRight: 8 }} />
                  运营账户（用于转账）
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>可用余额</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#0ea5e9' }}>
                      ¥{balanceData.operation?.available?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>待结算</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                      ¥{balanceData.operation?.pending?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </Col>
              </Row>
              {balanceData.operation?.available <= 0 && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  color: '#991b1b'
                }}>
                  <strong>⚠️ 余额不足：</strong>运营账户余额不足，无法执行转账。请充值后再试。
                </div>
              )}
            </Card>

            {/* 基本账户 */}
            <Card
              size="small"
              title={
                <span>
                  <WalletOutlined style={{ marginRight: 8 }} />
                  基本账户（交易结算）
                </span>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>可用余额</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
                      ¥{balanceData.basic?.available?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>待结算</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                      ¥{balanceData.basic?.pending?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 充值提示 */}
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              color: '#0c4a6e'
            }}>
              <strong>💡 提示：</strong>
              <div style={{ marginTop: 8 }}>
                • 运营账户用于商家转账到用户零钱<br />
                • 可以登录微信商户平台充值：<a href="https://pay.weixin.qq.com" target="_blank" rel="noopener noreferrer">https://pay.weixin.qq.com</a><br />
                • 进入"账户中心" → "账户余额" → "充值"
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* API权限未开通时的提示 */}
            <div style={{
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <ExclamationCircleOutlined style={{ fontSize: 48, color: '#f59e0b', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>余额查询API未开通</h3>
              <p style={{ color: '#64748b', marginBottom: 24 }}>
                当前微信商户号未开通余额查询API权限。<br />
                您可以通过以下方式查看账户余额：
              </p>

              <Card size="small" style={{ textAlign: 'left', marginBottom: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <strong>1. 登录微信商户平台</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
                  访问：<a href="https://pay.weixin.qq.com" target="_blank" rel="noopener noreferrer">https://pay.weixin.qq.com</a>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong>2. 查看账户余额</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
                  进入"账户中心" → "账户余额"，可以看到：
                </div>
                <ul style={{ color: '#64748b', fontSize: 13, marginLeft: 20 }}>
                  <li><strong>基本账户</strong>：用于交易资金结算</li>
                  <li><strong>运营账户</strong>：用于商家转账、手续费等</li>
                </ul>
                <div style={{ marginTop: 12 }}>
                  <strong>3. 充值运营账户</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  点击"充值"按钮，从基本账户转账到运营账户，或通过银行卡充值
                </div>
              </Card>

              <div style={{
                padding: 12,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                color: '#0c4a6e',
                textAlign: 'left'
              }}>
                <strong>💡 开通API权限（可选）：</strong>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  如需通过系统查询余额，可在微信商户平台申请开通"商户账户余额查询API"权限。
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Withdrawals;
