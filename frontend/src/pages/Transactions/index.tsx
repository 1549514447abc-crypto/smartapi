import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import PaymentModal from '../../components/PaymentModal';
import {
  Loader2,
  ArrowLeft,
  Wallet,
  CreditCard,
  ShoppingBag,
  Video,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  MessageCircle,
  Copy,
  RefreshCw
} from 'lucide-react';

type TabType = 'summary' | 'recharge' | 'consumption' | 'orders' | 'video' | 'prompts';

interface Summary {
  recharge: { count: number; total: number };
  consumption: { count: number; total: number };
  orders: { count: number; total: number };
  videoExtraction: { count: number; total_seconds: number };
  prompts: { count: number; total: number };
}

interface RechargeRecord {
  order_no: string;
  amount_paid: number;
  amount_received: number;
  bonus_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  completed_at: string;
}

interface ConsumptionRecord {
  id: number;
  change_type: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface OrderRecord {
  id: number;
  order_no: string;
  course_title: string;
  amount: number;
  status: string;
  created_at: string;
}

interface VideoRecord {
  id: number;
  video_title: string;
  platform: string;
  status: string;
  used_seconds: number;
  cost: number;
  created_at: string;
}

interface PromptRecord {
  id: number;
  prompt_title: string;
  purchase_type: string;
  price_paid: number;
  created_at: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>([]);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [orderRecords, setOrderRecords] = useState<OrderRecord[]>([]);
  const [videoRecords, setVideoRecords] = useState<VideoRecord[]>([]);
  const [promptRecords, setPromptRecords] = useState<PromptRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // 课程购买继续支付相关
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [coursePurchaseInfo, setCoursePurchaseInfo] = useState<{
    productType: 'course';
    productName: string;
    productPrice: number;
  } | null>(null);

  const handleCopyOrderNo = (orderNo: string) => {
    navigator.clipboard.writeText(orderNo);
    message.success('订单号已复制');
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab !== 'summary') {
      fetchRecords(activeTab);
    }
  }, [activeTab]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Summary }>('/transactions/summary');
      if (res.success) {
        setSummary(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (type: TabType) => {
    try {
      setLoading(true);
      let endpoint = '';
      switch (type) {
        case 'recharge':
          endpoint = '/transactions/recharge';
          break;
        case 'consumption':
          endpoint = '/transactions/consumption';
          break;
        case 'orders':
          endpoint = '/transactions/orders';
          break;
        case 'video':
          endpoint = '/transactions/video-extractions';
          break;
        case 'prompts':
          endpoint = '/transactions/prompts';
          break;
        default:
          return;
      }

      const res = await api.get<{ success: boolean; data: any }>(endpoint);
      if (res.success) {
        switch (type) {
          case 'recharge':
            setRechargeRecords(res.data.records || []);
            break;
          case 'consumption':
            setConsumptionRecords(res.data.records || []);
            break;
          case 'orders':
            setOrderRecords(res.data.orders || []);
            break;
          case 'video':
            setVideoRecords(res.data.records || []);
            break;
          case 'prompts':
            setPromptRecords(res.data.records || []);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
      message.error('获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 检查充值订单是否可以继续支付（pending且未超过15分钟）
  const canContinuePayment = (record: RechargeRecord) => {
    if (record.status !== 'pending') return false;
    const createdAt = new Date(record.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    const timeoutMs = 15 * 60 * 1000; // 15分钟
    return timeDiff < timeoutMs;
  };

  // 检查订单是否是课程购买订单
  const getCoursePurchaseInfo = (orderNo: string) => {
    try {
      const coursePurchaseOrders = JSON.parse(localStorage.getItem('coursePurchaseOrders') || '[]');
      const order = coursePurchaseOrders.find((o: any) => o.orderNo === orderNo);
      if (order) {
        return {
          productType: order.productType as 'course',
          productName: order.productName,
          productPrice: order.productPrice
        };
      }
    } catch (error) {
      console.error('Failed to parse coursePurchaseOrders:', error);
    }
    return null;
  };

  // 继续支付
  const handleContinuePayment = (orderNo: string) => {
    // 检查是否是课程购买订单
    const courseInfo = getCoursePurchaseInfo(orderNo);
    if (courseInfo) {
      // 课程购买订单 - 显示支付弹窗
      setCoursePurchaseInfo(courseInfo);
      setShowPaymentModal(true);
    } else {
      // 普通充值订单 - 跳转到充值页面
      navigate(`/recharge?continueOrder=${orderNo}`);
    }
  };

  // 课程购买支付成功回调
  const handleCoursePurchaseSuccess = () => {
    setShowPaymentModal(false);
    setCoursePurchaseInfo(null);
    message.success('购买成功！');
    // 刷新记录
    if (activeTab !== 'summary') {
      fetchRecords(activeTab);
    }
  };

  const tabs = [
    { key: 'summary', label: '概览', icon: Wallet },
    { key: 'recharge', label: '充值记录', icon: TrendingUp },
    { key: 'consumption', label: '消费记录', icon: TrendingDown },
    { key: 'orders', label: '订单记录', icon: ShoppingBag },
    { key: 'video', label: '视频提取', icon: Video },
    { key: 'prompts', label: '提示词', icon: FileText },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      success: { label: '成功', color: 'emerald', icon: CheckCircle },
      completed: { label: '已完成', color: 'emerald', icon: CheckCircle },
      pending: { label: '处理中', color: 'amber', icon: Clock },
      failed: { label: '失败', color: 'red', icon: XCircle },
      cancelled: { label: '已取消', color: 'slate', icon: XCircle },
      timeout: { label: '已超时', color: 'slate', icon: Clock },
    };
    const item = config[status] || { label: status, color: 'slate', icon: Clock };
    const Icon = item.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${item.color}-100 text-${item.color}-700`}>
        <Icon className="w-3 h-3" />
        {item.label}
      </span>
    );
  };

  const renderSummary = () => {
    if (!summary) return null;

    const cards = [
      {
        title: '充值总额',
        value: `¥${Number(summary.recharge.total || 0).toFixed(2)}`,
        sub: `${summary.recharge.count} 笔`,
        icon: TrendingUp,
        color: 'emerald',
        onClick: () => setActiveTab('recharge')
      },
      {
        title: '消费总额',
        value: `¥${Number(summary.consumption.total || 0).toFixed(2)}`,
        sub: `${summary.consumption.count} 笔`,
        icon: TrendingDown,
        color: 'orange',
        onClick: () => setActiveTab('consumption')
      },
      {
        title: '课程订单',
        value: `¥${Number(summary.orders.total || 0).toFixed(2)}`,
        sub: `${summary.orders.count} 单`,
        icon: ShoppingBag,
        color: 'violet',
        onClick: () => setActiveTab('orders')
      },
      {
        title: '视频提取',
        value: `${Math.round(Number(summary.videoExtraction.total_seconds || 0) / 60)} 分钟`,
        sub: `${summary.videoExtraction.count} 次`,
        icon: Video,
        color: 'sky',
        onClick: () => setActiveTab('video')
      },
      {
        title: '提示词购买',
        value: `¥${Number(summary.prompts.total || 0).toFixed(2)}`,
        sub: `${summary.prompts.count} 个`,
        icon: FileText,
        color: 'pink',
        onClick: () => setActiveTab('prompts')
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={card.onClick}
            className="card p-5 cursor-pointer hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-${card.color}-100 text-${card.color}-600 flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderRechargeRecords = () => (
    <div className="space-y-3">
      {rechargeRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无充值记录</p>
        </div>
      ) : (
        rechargeRecords.map((record, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(record.status)}
                  <span className="text-xs text-slate-400">{record.payment_method === 'alipay' ? '支付宝' : '微信'}</span>
                </div>
                <p className="text-sm text-slate-500">订单号: {record.order_no}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(record.created_at)}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <p className="text-lg font-bold text-emerald-600">+¥{Number(record.amount_received).toFixed(2)}</p>
                  {Number(record.bonus_amount) > 0 && (
                    <p className="text-xs text-orange-500">含赠送 ¥{Number(record.bonus_amount).toFixed(2)}</p>
                  )}
                </div>
                {canContinuePayment(record) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContinuePayment(record.order_no);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg hover:from-sky-600 hover:to-blue-600 transition-all shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    继续支付
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // 检查消费记录是否是课程购买
  const isCourseConsumption = (record: ConsumptionRecord) => {
    return record.description && (
      record.description.includes('课程') ||
      record.description.includes('余额支付:') ||
      record.change_type === 'course_purchase'
    );
  };

  // 通过消费记录找到对应的课程订单
  const findRelatedOrder = (record: ConsumptionRecord) => {
    // 通过时间匹配（容差5秒）找到对应订单
    const recordTime = new Date(record.created_at).getTime();
    return orderRecords.find(order => {
      const orderTime = new Date(order.created_at).getTime();
      return Math.abs(orderTime - recordTime) < 5000; // 5秒内
    });
  };

  const renderConsumptionRecords = () => (
    <div className="space-y-3">
      {consumptionRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无消费记录</p>
        </div>
      ) : (
        consumptionRecords.map((record, index) => {
          const isCourse = isCourseConsumption(record);
          const relatedOrder = isCourse ? findRelatedOrder(record) : null;

          return (
            <div
              key={index}
              className={`card p-4 ${relatedOrder ? 'cursor-pointer hover:shadow-lg transition-all' : ''}`}
              onClick={() => relatedOrder && setSelectedOrder(relatedOrder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 mb-1">{record.description || record.change_type}</p>
                    {relatedOrder && (
                      <ChevronRight className="w-4 h-4 text-sky-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(record.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${Number(record.change_amount) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {Number(record.change_amount) >= 0 ? '+' : ''}¥{Number(record.change_amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">余额: ¥{Number(record.balance_after).toFixed(2)}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderOrderRecords = () => (
    <div className="space-y-3">
      {orderRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无订单记录</p>
        </div>
      ) : (
        orderRecords.map((record, index) => (
          <div key={index} className="card p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedOrder(record)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(record.status)}
                </div>
                <p className="font-medium text-slate-900">{record.course_title}</p>
                <p className="text-xs text-slate-400 mt-1">订单号: {record.order_no}</p>
                <p className="text-xs text-slate-400">{formatDate(record.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-slate-900">¥{Number(record.amount).toFixed(2)}</p>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderVideoRecords = () => (
    <div className="space-y-3">
      {videoRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无视频提取记录</p>
        </div>
      ) : (
        videoRecords.map((record, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(record.status)}
                  {record.platform && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{record.platform}</span>
                  )}
                </div>
                <p className="font-medium text-slate-900 truncate">{record.video_title || '未知视频'}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(record.created_at)}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-lg font-bold text-orange-600">
                  {record.cost ? `-¥${Number(record.cost).toFixed(2)}` : '-'}
                </p>
                <p className="text-xs text-slate-400">
                  {record.used_seconds ? `${Math.round(Number(record.used_seconds))} 秒` : '-'}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPromptRecords = () => (
    <div className="space-y-3">
      {promptRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无提示词购买记录</p>
        </div>
      ) : (
        promptRecords.map((record, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 mb-1">{record.prompt_title || '未知提示词'}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${record.purchase_type === 'paid' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {record.purchase_type === 'paid' ? '付费购买' : '会员免费'}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(record.created_at)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {Number(record.price_paid) > 0 ? `¥${Number(record.price_paid).toFixed(2)}` : '免费'}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'summary':
        return renderSummary();
      case 'recharge':
        return renderRechargeRecords();
      case 'consumption':
        return renderConsumptionRecords();
      case 'orders':
        return renderOrderRecords();
      case 'video':
        return renderVideoRecords();
      case 'prompts':
        return renderPromptRecords();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="card p-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回个人中心
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-white flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">交易记录</h1>
            <p className="text-sm text-slate-500">查看您的充值、消费和订单记录</p>
          </div>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="card p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      {renderContent()}

      {/* 订单详情弹窗 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">订单详情</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 text-center">
              {/* 状态图标 */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selectedOrder.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-500'
                  : selectedOrder.status === 'pending'
                  ? 'bg-amber-100 text-amber-500'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {selectedOrder.status === 'completed' ? (
                  <CheckCircle className="w-10 h-10" />
                ) : selectedOrder.status === 'pending' ? (
                  <Clock className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-1">{selectedOrder.course_title}</h4>
              <p className="text-slate-500 mb-4">
                {selectedOrder.status === 'completed' ? '已购买成功' :
                 selectedOrder.status === 'pending' ? '待确认领取' : '订单已取消'}
              </p>

              {/* 订单号 */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-500 mb-2">您的订单号</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono font-bold text-slate-900">{selectedOrder.order_no}</span>
                  <button
                    onClick={() => handleCopyOrderNo(selectedOrder.order_no)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm text-slate-500">
                  <span>¥{Number(selectedOrder.amount).toFixed(2)}</span>
                  <span>•</span>
                  <span>{formatDate(selectedOrder.created_at)}</span>
                </div>
              </div>

              {/* 讲师微信 */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-600 mb-3">扫码添加讲师微信，发送订单号领取课程</p>
                <div className="w-40 h-40 mx-auto mb-3 bg-white rounded-xl p-2 shadow-sm">
                  <img
                    src="/wechat-qr.png"
                    alt="讲师微信"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    二维码加载中...
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-semibold">微信号：OTR4936</span>
                </div>
              </div>

              {/* 提示 */}
              <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    截图保存此页面或复制订单号
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    扫码添加讲师微信
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    发送订单号给讲师确认
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">4.</span>
                    讲师将通过微信发送课程资料
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 课程购买支付弹窗 */}
      {coursePurchaseInfo && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setCoursePurchaseInfo(null);
          }}
          onSuccess={handleCoursePurchaseSuccess}
          productType={coursePurchaseInfo.productType}
          productName={coursePurchaseInfo.productName}
          productPrice={coursePurchaseInfo.productPrice}
        />
      )}
    </div>
  );
};

export default Transactions;
