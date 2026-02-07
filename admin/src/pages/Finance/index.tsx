import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, DatePicker, Button, Spin, message } from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  CrownOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import dayjs from 'dayjs';
import api from '../../api/request';

const { RangePicker } = DatePicker;

interface FinanceStats {
  todayIncome: number;
  weekIncome: number;
  monthIncome: number;
  totalIncome: number;
  todayRecharge: number;
  todayCourse: number;
  todayMembership: number;
  todayCommission: number;
  // 趋势数据
  todayTrend: string;
  weekTrend: string;
  monthTrend: string;
}

interface RechargeRecord {
  id: number;
  user_id: number;
  username: string;
  nickname?: string;
  amount: number;
  type: string;
  created_at: string;
}

interface TrendData {
  date: string;
  amount: number;
}

const Finance = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [stats, setStats] = useState<FinanceStats>({
    todayIncome: 0,
    weekIncome: 0,
    monthIncome: 0,
    totalIncome: 0,
    todayRecharge: 0,
    todayCourse: 0,
    todayMembership: 0,
    todayCommission: 0,
    todayTrend: '0%',
    weekTrend: '0%',
    monthTrend: '0%',
  });
  const [recentOrders, setRecentOrders] = useState<RechargeRecord[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [orderPagination, setOrderPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // 获取订单列表（支持分页）
  const fetchOrders = async (page = 1, pageSize = 10) => {
    setOrderLoading(true);
    try {
      let dateParams = '';
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        dateParams = `&startDate=${startDate}&endDate=${endDate}`;
      }

      const ordersRes = await api.get(`/admin/finance/recent-orders?page=${page}&pageSize=${pageSize}${dateParams}`);
      if ((ordersRes as any)?.success && (ordersRes as any)?.data) {
        const { list, pagination } = (ordersRes as any).data;
        setRecentOrders(list || []);
        setOrderPagination({
          page: pagination?.page || 1,
          pageSize: pagination?.pageSize || 10,
          total: pagination?.total || 0
        });
      }
    } catch (e) {
      console.error('orders error:', e);
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 构建日期参数
      let dateParams = '';
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        dateParams = `&startDate=${startDate}&endDate=${endDate}`;
      }

      // 并行获取财务统计和趋势数据
      const [statsRes, trendRes] = await Promise.all([
        api.get(`/admin/finance/stats?_=1${dateParams}`).catch((e) => { console.error('stats error:', e); return { success: false }; }),
        api.get(`/admin/finance/trend?days=30${dateParams}`).catch((e) => { console.error('trend error:', e); return { success: false }; }),
      ]);

      // 设置统计数据
      if ((statsRes as any)?.success && (statsRes as any)?.data) {
        const data = (statsRes as any).data;
        setStats({
          todayIncome: data.todayIncome || 0,
          weekIncome: data.weekIncome || 0,
          monthIncome: data.monthIncome || 0,
          totalIncome: data.totalIncome || 0,
          todayRecharge: data.todayRecharge || 0,
          todayCourse: data.todayCourse || 0,
          todayMembership: data.todayMembership || 0,
          todayCommission: data.todayCommission || 0,
          todayTrend: data.todayTrend || '0%',
          weekTrend: data.weekTrend || '0%',
          monthTrend: data.monthTrend || '0%',
        });
      }

      // 设置趋势数据
      if ((trendRes as any)?.success && (trendRes as any)?.data) {
        setTrendData((trendRes as any).data);
      }

      // 获取订单（重置到第一页）
      await fetchOrders(1, orderPagination.pageSize);

    } catch (error) {
      console.error('获取财务数据失败:', error);
      message.error('获取财务数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 解析趋势是正还是负
  const parseTrend = (trend: string) => {
    const isNegative = trend.startsWith('-');
    return { isNegative, value: trend };
  };

  const statCards = [
    {
      title: '今日收入',
      value: stats.todayIncome,
      icon: <DollarOutlined />,
      iconBg: '#eff6ff',
      iconColor: '#0ea5e9',
      trend: stats.todayTrend,
      trendLabel: 'vs 昨日',
    },
    {
      title: '本周收入',
      value: stats.weekIncome,
      icon: <WalletOutlined />,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
      trend: stats.weekTrend,
      trendLabel: 'vs 上周',
    },
    {
      title: '本月收入',
      value: stats.monthIncome,
      icon: <ShoppingCartOutlined />,
      iconBg: '#faf5ff',
      iconColor: '#a855f7',
      trend: stats.monthTrend,
      trendLabel: 'vs 上月',
    },
    {
      title: '累计收入',
      value: stats.totalIncome,
      icon: <CrownOutlined />,
      iconBg: '#fff7ed',
      iconColor: '#f97316',
      trend: '',
      trendLabel: '',
    },
  ];

  const incomeBreakdown = [
    { label: '充值收入', value: stats.todayRecharge, color: '#0ea5e9' },
    { label: '课程收入', value: stats.todayCourse, color: '#a855f7' },
    { label: '会员收入', value: stats.todayMembership, color: '#22c55e' },
    { label: '返佣支出', value: -stats.todayCommission, color: '#ef4444' },
  ];

  const orderColumns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 120,
      render: (name: string, record: RechargeRecord) => {
        const displayName = record.nickname || name || '未知用户';
        return (
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
              {displayName.charAt(0)}
            </div>
            <span>{displayName}</span>
          </div>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; className: string }> = {
          recharge: { label: '充值', className: 'badge-info' },
          course: { label: '课程购买', className: 'badge-purple' },
          membership: { label: '会员购买', className: 'badge-warning' },
        };
        const config = typeMap[type] || { label: type, className: 'badge-info' };
        return <span className={`badge ${config.className}`}>{config.label}</span>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (amount: number | string) => (
        <span style={{ fontWeight: 600, color: '#22c55e' }}>
          +¥{parseFloat(String(amount)).toFixed(2)}
        </span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
          <h1 className="page-title">财务报表</h1>
          <p className="page-subtitle">查看平台收入数据和财务统计</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
            }}
            placeholder={['开始日期', '结束日期']}
          />
          <Button
            type="primary"
            onClick={() => fetchData()}
            disabled={loading}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              setDateRange(null);
              setTimeout(() => fetchData(), 0);
            }}
          >
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
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
                <div className="stat-icon" style={{ background: card.iconBg, color: card.iconColor }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                ¥{card.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              {card.trend && (
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
              )}
            </div>
          </Col>
        ))}
      </Row>

      {/* 今日收入构成 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card title="今日收入构成" bordered={false}>
            <Row gutter={[16, 16]}>
              {incomeBreakdown.map((item, index) => (
                <Col xs={12} sm={6} key={index}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: item.color,
                      }} />
                      <span style={{ color: '#64748b' }}>{item.label}</span>
                    </div>
                    <span style={{
                      fontWeight: 600,
                      color: item.value >= 0 ? '#0f172a' : '#ef4444',
                    }}>
                      {item.value >= 0 ? '+' : ''}¥{Math.abs(item.value).toFixed(2)}
                    </span>
                  </div>
                </Col>
              ))}
              <Col xs={12} sm={6}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: '#eff6ff',
                  borderRadius: 8,
                }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>净收入</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#0ea5e9' }}>
                    ¥{(stats.todayIncome - stats.todayCommission).toFixed(2)}
                  </span>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 交易记录 - 单独一行 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card title={`交易记录 (共${orderPagination.total}条)`} bordered={false}>
            <Table
              columns={orderColumns}
              dataSource={recentOrders}
              rowKey="id"
              loading={orderLoading}
              size="small"
              pagination={{
                current: orderPagination.page,
                pageSize: orderPagination.pageSize,
                total: orderPagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  fetchOrders(page, pageSize);
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 收入趋势图表 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card title="收入趋势（近30天）" bordered={false}>
            {trendData.length > 0 ? (
              <Column
                data={trendData.map(item => ({
                  日期: dayjs(item.date).format('MM/DD'),
                  金额: Number(item.amount) || 0,
                }))}
                xField="日期"
                yField="金额"
                height={300}
                color="#0ea5e9"
                columnStyle={{
                  radius: [4, 4, 0, 0],
                }}
                xAxis={{
                  label: {
                    style: {
                      fill: '#94a3b8',
                      fontSize: 11,
                    },
                    autoRotate: true,
                  },
                }}
                yAxis={{
                  label: {
                    formatter: (v: string) => `¥${v}`,
                    style: {
                      fill: '#94a3b8',
                      fontSize: 11,
                    },
                  },
                  grid: {
                    line: {
                      style: {
                        stroke: '#e2e8f0',
                        lineDash: [4, 4],
                      },
                    },
                  },
                }}
              />
            ) : (
              <div style={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: 8,
              }}>
                暂无数据
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Finance;
