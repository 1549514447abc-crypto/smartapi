import { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Tabs, Select, DatePicker, Spin, Statistic, Row, Col, Tag, message } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

const { RangePicker } = DatePicker;

interface TransactionRecord {
  id: number;
  user_id: number;
  username: string;
  nickname: string;
  change_type: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  source: string;
  service_name: string;
  description: string;
  created_at: string;
}

interface RechargeRecord {
  id: number;
  user_id: number;
  username: string;
  nickname: string;
  order_no: string;
  amount_paid: number;
  amount_received: number;
  bonus_amount: number;
  payment_method: string;
  status: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  completed_at: string;
}

interface TransactionSummary {
  totalRecharge: number;
  totalConsumption: number;
  rechargeCount: number;
  consumptionCount: number;
  videoExtraction: { count: number; total: number; total_seconds: number };
  promptPurchase: { count: number; total: number };
  courseOrder: { count: number; total: number };
  today: { today_recharge: number; today_consumption: number; today_transactions: number };
}

const Transactions = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [keyword, setKeyword] = useState('');
  const [changeType, setChangeType] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchTransactions();
    } else if (activeTab === 'recharge') {
      fetchRechargeRecords();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, changeType, dateRange]);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/transactions/admin/summary');
      if ((res as any).success) {
        setSummary((res as any).data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  const fetchTransactions = async (pageNum?: number) => {
    setLoading(true);
    try {
      const currentPage = pageNum ?? page;
      const params: any = { page: currentPage, limit: 20 };
      if (keyword) params.keyword = keyword;
      if (changeType !== 'all') params.type = changeType;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/transactions/admin/all', { params });
      if ((res as any).success) {
        setTransactions((res as any).data.records || []);
        setTotal((res as any).data.pagination?.total || 0);
      }
    } catch (error) {
      message.error('获取交易记录失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRechargeRecords = async (pageNum?: number) => {
    setLoading(true);
    try {
      const currentPage = pageNum ?? page;
      const params: any = { page: currentPage, limit: 20 };
      if (keyword) params.keyword = keyword;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/transactions/admin/recharge', { params });
      if ((res as any).success) {
        setRechargeRecords((res as any).data.records || []);
        setTotal((res as any).data.pagination?.total || 0);
      }
    } catch (error) {
      message.error('获取充值记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    // 直接传入 page=1，避免状态更新延迟问题
    if (activeTab === 'all') {
      fetchTransactions(1);
    } else {
      fetchRechargeRecords(1);
    }
  };

  const handleRefresh = () => {
    fetchSummary();
    if (activeTab === 'all') {
      fetchTransactions();
    } else {
      fetchRechargeRecords();
    }
  };

  // 交易类型映射
  const changeTypeMap: Record<string, { label: string; color: string }> = {
    recharge: { label: '充值', color: 'green' },
    consumption: { label: '消费', color: 'orange' },
    refund: { label: '退款', color: 'blue' },
    adjustment: { label: '调整', color: 'purple' },
    commission: { label: '返佣', color: 'cyan' },
  };

  // 消费来源映射
  const sourceMap: Record<string, string> = {
    video_extraction: '视频提取',
    prompt_purchase: '提示词购买',
    workflow_purchase: '工作流购买',
    course_purchase: '课程购买',
    membership_purchase: '会员购买',
    balance_payment: '余额支付',
    admin_adjustment: '管理员调整余额',
    admin_commission_adjustment: '管理员调整返佣',
    referral_commission: '推荐返佣',
    recharge: '充值',
  };

  const transactionColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 150,
      render: (name: string, record: TransactionRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#0ea5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
          }}>
            {(record.nickname || name || '?').charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{record.nickname || name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{name}</div>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'change_type',
      width: 80,
      render: (type: string) => {
        const config = changeTypeMap[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '金额变动',
      dataIndex: 'change_amount',
      width: 120,
      render: (amount: number) => (
        <span style={{
          fontWeight: 600,
          color: amount >= 0 ? '#22c55e' : '#ef4444',
          fontSize: 14,
        }}>
          {amount >= 0 ? '+' : ''}{Number(amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '余额变化',
      width: 160,
      render: (_: any, record: TransactionRecord) => (
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {Number(record.balance_before).toFixed(2)} &rarr; {Number(record.balance_after).toFixed(2)}
        </span>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (source: string) => sourceMap[source] || source || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const rechargeColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 180,
      render: (no: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{no}</span>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 150,
      render: (name: string, record: RechargeRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
          }}>
            {(record.nickname || name || '?').charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{record.nickname || name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{name}</div>
          </div>
        </div>
      ),
    },
    {
      title: '支付金额',
      dataIndex: 'amount_paid',
      width: 100,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          ¥{Number(amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '到账金额',
      dataIndex: 'amount_received',
      width: 100,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#22c55e' }}>
          ¥{Number(amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '赠送金额',
      dataIndex: 'bonus_amount',
      width: 100,
      render: (amount: number) => amount > 0 ? (
        <span style={{ color: '#f59e0b' }}>+¥{Number(amount).toFixed(2)}</span>
      ) : '-',
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, { label: string; color: string }> = {
          alipay: { label: '支付宝', color: 'blue' },
          wechat: { label: '微信', color: 'green' },
          admin: { label: '管理员', color: 'purple' },
        };
        const config = methodMap[method] || { label: method, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          pending: { label: '待支付', color: 'orange' },
          success: { label: '成功', color: 'green' },
          failed: { label: '失败', color: 'red' },
          cancelled: { label: '已取消', color: 'default' },
        };
        const config = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwapOutlined />
          全部记录
        </span>
      ),
    },
    {
      key: 'recharge',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WalletOutlined />
          充值记录
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">交易记录</h1>
          <p className="page-subtitle">查看所有用户的交易记录和财务流水</p>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: '#f0fdf4' }}>
              <Statistic
                title={<span style={{ color: '#166534' }}>总充值</span>}
                value={Number(summary.totalRecharge)}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#16a34a', fontWeight: 600 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#166534' }}>
                <ArrowUpOutlined /> 今日: ¥{Number(summary.today?.today_recharge || 0).toFixed(2)}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: '#fef2f2' }}>
              <Statistic
                title={<span style={{ color: '#991b1b' }}>总消费</span>}
                value={Number(summary.totalConsumption)}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#dc2626', fontWeight: 600 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#991b1b' }}>
                <ArrowDownOutlined /> 今日: ¥{Number(summary.today?.today_consumption || 0).toFixed(2)}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: '#eff6ff' }}>
              <Statistic
                title={<span style={{ color: '#1e40af' }}>视频提取</span>}
                value={summary.videoExtraction?.count || 0}
                suffix="次"
                valueStyle={{ color: '#2563eb', fontWeight: 600 }}
                prefix={<VideoCameraOutlined style={{ fontSize: 16 }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#1e40af' }}>
                总消费: ¥{Number(summary.videoExtraction?.total || 0).toFixed(2)}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: '#faf5ff' }}>
              <Statistic
                title={<span style={{ color: '#6b21a8' }}>今日交易</span>}
                value={summary.today?.today_transactions || 0}
                suffix="笔"
                valueStyle={{ color: '#9333ea', fontWeight: 600 }}
                prefix={<FileTextOutlined style={{ fontSize: 16 }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b21a8' }}>
                提示词: {summary.promptPurchase?.count || 0}笔 | 课程: {summary.courseOrder?.count || 0}笔
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 主内容 */}
      <Card bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setPage(1); }}
          items={tabItems}
        />

        {/* 筛选区域 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Input
            placeholder="搜索用户名/描述..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          {activeTab === 'all' && (
            <Select
              value={changeType}
              onChange={setChangeType}
              style={{ width: 120 }}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'recharge', label: '充值' },
                { value: 'consumption', label: '消费' },
                { value: 'refund', label: '退款' },
                { value: 'adjustment', label: '调整' },
                { value: 'commission', label: '返佣' },
              ]}
            />
          )}
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            style={{ width: 240 }}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : activeTab === 'all' ? (
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`,
              showSizeChanger: false,
            }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Table
            columns={rechargeColumns}
            dataSource={rechargeRecords}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`,
              showSizeChanger: false,
            }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>
    </div>
  );
};

export default Transactions;
