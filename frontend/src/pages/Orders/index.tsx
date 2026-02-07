import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  Loader2,
  ShoppingBag,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  MessageCircle,
  Calendar,
  CreditCard
} from 'lucide-react';

interface Order {
  id: number;
  order_no: string;
  course_title: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

const statusConfig = {
  pending: {
    label: '待确认',
    color: 'amber',
    icon: Clock
  },
  completed: {
    label: '已完成',
    color: 'emerald',
    icon: CheckCircle
  },
  cancelled: {
    label: '已取消',
    color: 'slate',
    icon: XCircle
  }
};

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: { orders: Order[] } }>('/course/orders/my');
      if (response.success) {
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderNo = (orderNo: string) => {
    navigator.clipboard.writeText(orderNo);
    message.success('订单号已复制');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 text-white flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">我的订单</h1>
            <p className="text-sm text-slate-500">查看您的课程购买记录</p>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无订单记录</h3>
          <p className="text-slate-500 mb-6">您还没有购买任何课程</p>
          <button
            onClick={() => navigate('/course')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
          >
            去看看课程
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const StatusIcon = status.icon;
            return (
              <div key={order.id} className="card p-5 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* 订单信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-${status.color}-100 text-${status.color}-700 flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{order.course_title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        订单号：
                        <span className="font-mono text-slate-700">{order.order_no}</span>
                        <button
                          onClick={() => handleCopyOrderNo(order.order_no)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* 金额和操作 */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">订单金额</p>
                      <p className="text-xl font-bold text-slate-900">¥{Number(order.amount).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors text-sm"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 温馨提示 */}
      {orders.length > 0 && (
        <div className="card p-5 bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">温馨提示</h4>
              <p className="text-sm text-slate-600">
                如果您的订单状态为"待确认"，请添加讲师微信 <span className="font-semibold text-slate-900">OTR4936</span> 并发送订单号，讲师确认后将发送完整课程资料。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 订单详情弹窗 - 和购买成功弹窗样式一致 */}
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
    </div>
  );
};

export default Orders;
