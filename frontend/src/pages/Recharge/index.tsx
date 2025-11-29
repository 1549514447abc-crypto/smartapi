import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  Zap,
  Gift,
  Wallet,
  History,
  CreditCard,
  Loader2,
  Check,
  Sparkles,
  QrCode,
  X
} from 'lucide-react';

interface BonusRule {
  amount: number;
  bonusRate: number;
  bonusAmount: number;
  displayText: string;
}

interface RechargeConfig {
  minAmount: number;
  maxAmount: number;
  bonusRules: BonusRule[];
  paymentMethods: Array<{
    value: string;
    label: string;
    icon: string;
  }>;
}

interface RechargeOrder {
  orderNo: string;
  amount: number;
  bonusAmount: number;
  totalAmount: number;
  paymentMethod: string;
  qrCodeUrl: string;
  mockPayUrl: string;
}

const Recharge = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<RechargeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('alipay');
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrder | null>(null);
  const [pollingTimer, setPollingTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // 加载充值配置
  useEffect(() => {
    fetchConfig();
    fetchUserBalance();
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [pollingTimer]);

  const fetchConfig = async () => {
    try {
      const response = await api.get<{ success: boolean; data: RechargeConfig }>('/recharge/config');
      if (response.success) {
        setConfig(response.data);
        // 默认选中第三个档位（100元）
        if (response.data.bonusRules.length >= 3) {
          setSelectedAmount(response.data.bonusRules[3].amount);
        }
      }
    } catch (error) {
      message.error('加载充值配置失败');
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { balance: number } }>('/auth/me');
      if (response.success && response.data.balance !== undefined) {
        setUserBalance(response.data.balance);
      }
    } catch (error) {
      console.error('获取用户余额失败:', error);
    }
  };

  const calculateBonus = (amount: number): number => {
    if (!config) return 0;
    for (const rule of config.bonusRules) {
      if (amount >= rule.amount) {
        return rule.bonusAmount;
      }
    }
    return 0;
  };

  const handleRecharge = async () => {
    if (!selectedAmount) {
      message.warning('请选择充值金额');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        success: boolean;
        data: RechargeOrder;
      }>('/recharge/create', {
        amount: selectedAmount,
        paymentMethod: selectedMethod
      });

      if (response.success) {
        setCurrentOrder(response.data);
        setPayModalVisible(true);
        // 开始轮询订单状态
        startPolling(response.data.orderNo);
      } else {
        message.error('创建订单失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 轮询订单状态
  const startPolling = (orderNo: string) => {
    const timer = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: { status: string };
        }>(`/recharge/order/${orderNo}`);

        if (response.success && response.data.status === 'success') {
          // 支付成功
          clearInterval(timer);
          setPollingTimer(null);
          setPayModalVisible(false);
          message.success('充值成功！');
          fetchUserBalance(); // 刷新余额
          setCurrentOrder(null);
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    setPollingTimer(timer);
  };

  // 模拟支付（测试用）
  const handleMockPay = async () => {
    if (!currentOrder) return;

    try {
      const response = await api.post<{ success: boolean }>(`/recharge/mock-pay/${currentOrder.orderNo}`);
      if (response.success) {
        message.success('支付成功！');
        // 轮询会自动检测到状态变化并关闭弹窗
      }
    } catch (error) {
      message.error('支付失败');
    }
  };

  const handleCancelPay = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
    setPayModalVisible(false);
    setCurrentOrder(null);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 标题区域 */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">账户充值</h1>
              <p className="text-sm text-slate-500">充值即享好礼，满100送20</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">当前余额</p>
              <p className="text-2xl font-bold text-emerald-600">¥{userBalance.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 充值金额选择 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-sky-500" />
          选择充值金额
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {config.bonusRules.map((rule) => (
            <button
              key={rule.amount}
              onClick={() => setSelectedAmount(rule.amount)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                selectedAmount === rule.amount
                  ? 'border-sky-400 bg-sky-50 shadow-lg shadow-sky-100'
                  : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
              }`}
            >
              {selectedAmount === rule.amount && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div className="text-2xl font-bold text-slate-900">¥{rule.amount}</div>
              {rule.bonusAmount > 0 && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 text-white font-medium">
                  <Gift className="w-3 h-3" />
                  送{rule.bonusAmount.toFixed(0)}元
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-emerald-500" />
          选择支付方式
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedMethod('alipay')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selectedMethod === 'alipay'
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 hover:border-sky-200'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#1677ff] text-white flex items-center justify-center text-xl font-bold">
              支
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900">支付宝</div>
              <div className="text-sm text-slate-500">推荐使用</div>
            </div>
            {selectedMethod === 'alipay' && (
              <Check className="w-5 h-5 text-sky-500 ml-auto" />
            )}
          </button>
          <button
            onClick={() => setSelectedMethod('wechat')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selectedMethod === 'wechat'
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 hover:border-sky-200'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#07c160] text-white flex items-center justify-center text-xl font-bold">
              微
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900">微信支付</div>
              <div className="text-sm text-slate-500">扫码支付</div>
            </div>
            {selectedMethod === 'wechat' && (
              <Check className="w-5 h-5 text-sky-500 ml-auto" />
            )}
          </button>
        </div>
      </div>

      {/* 充值汇总 */}
      {selectedAmount && (
        <div className="card p-6 bg-gradient-to-r from-slate-50 to-sky-50">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">充值金额</p>
              <p className="text-2xl font-bold text-slate-900">¥{selectedAmount}</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-sm text-slate-500 mb-1">赠送金额</p>
              <p className="text-2xl font-bold text-orange-500">
                +¥{calculateBonus(selectedAmount).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">实际到账</p>
              <p className="text-2xl font-bold text-emerald-600">
                ¥{(selectedAmount + calculateBonus(selectedAmount)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={handleRecharge}
          disabled={!selectedAmount || loading}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold text-lg shadow-lg shadow-sky-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          立即充值
        </button>
        <button
          onClick={() => navigate('/recharge/history')}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          <History className="w-5 h-5" />
          充值记录
        </button>
      </div>

      {/* 温馨提示 */}
      <div className="card p-5 bg-amber-50 border-amber-200">
        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          温馨提示
        </h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 充值金额将实时到账，可在个人中心查看余额</li>
          <li>• 赠送金额与充值金额使用规则相同</li>
          <li>• 如遇支付问题，请联系客服处理</li>
        </ul>
      </div>

      {/* 支付弹窗 */}
      {payModalVisible && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">扫码支付</h3>
              <button
                onClick={handleCancelPay}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 text-center">
              {/* 支付方式标识 */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                  selectedMethod === 'alipay' ? 'bg-[#1677ff]' : 'bg-[#07c160]'
                }`}>
                  {selectedMethod === 'alipay' ? '支' : '微'}
                </div>
                <span className="font-medium text-slate-700">
                  {selectedMethod === 'alipay' ? '支付宝扫码支付' : '微信扫码支付'}
                </span>
              </div>

              {/* 二维码 */}
              <div className="w-48 h-48 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                <img
                  src={currentOrder.qrCodeUrl}
                  alt="支付二维码"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              {/* 支付金额 */}
              <div className="mb-4">
                <p className="text-sm text-slate-500">支付金额</p>
                <p className="text-3xl font-bold text-slate-900">¥{currentOrder.amount}</p>
              </div>

              {/* 等待提示 */}
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                等待支付中...
              </div>

              {/* 模拟支付按钮 */}
              <button
                onClick={handleMockPay}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                🧪 模拟支付（测试用）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recharge;
