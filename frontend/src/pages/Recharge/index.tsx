import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import QRCode from 'qrcode';
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
  X,
  PenLine,
  Clock,
  CheckCircle
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
  payType?: string;
  payUrl?: string;
  codeUrl?: string;
  qrCodeUrl?: string;
  jsapiParams?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
  h5Url?: string;
  expireTime?: string;
  expireMinutes?: number;
}

// 检测是否在微信浏览器中
const isWeChatBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
};

// 检测是否在移动设备上
const isMobile = (): boolean => {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
};

const Recharge = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuthStore();
  const [config, setConfig] = useState<RechargeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('alipay');
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrder | null>(null);
  const [pollingTimer, setPollingTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // 倒计时相关
  const [countdown, setCountdown] = useState<number>(0);
  const [countdownActive, setCountdownActive] = useState(false);

  // 自定义金额相关状态
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState('');

  // 支付成功弹窗状态
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successAmount, setSuccessAmount] = useState<{ paid: number; bonus: number }>({ paid: 0, bonus: 0 });

  // JSAPI支付状态
  const [jsapiPaying, setJsapiPaying] = useState(false);

  // 从全局 store 获取余额
  const userBalance = user?.balance || 0;

  // 是否在微信浏览器中
  const inWeChatBrowser = isWeChatBrowser();
  // 用户是否已绑定微信（有openid）
  const hasWeChatOpenid = !!user?.wechat_openid;

  // 加载充值配置
  useEffect(() => {
    fetchConfig();
    refreshUser();

    // 处理继续支付参数
    const continueOrder = searchParams.get('continueOrder');
    if (continueOrder) {
      handleContinueOrder(continueOrder);
    }
  }, []);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
    };
  }, [pollingTimer]);

  // 倒计时 effect
  useEffect(() => {
    if (!countdownActive || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCountdownActive(false);
          handleCancelPay();
          message.warning('支付已超时，请重新创建订单');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, countdown > 0]);

  // 处理继续支付
  const handleContinueOrder = async (orderNo: string) => {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          orderNo: string;
          amount: number;
          bonusAmount: number;
          totalAmount: number;
          paymentMethod: string;
          status: string;
          remainingMinutes: number;
          expireMinutes: number;
          payUrl?: string;
          codeUrl?: string;
        };
      }>(`/recharge/continue/${orderNo}`);

      if (response.success && response.data.status === 'pending') {
        const order = response.data;
        message.info(`继续支付订单，剩余 ${order.remainingMinutes} 分钟`);

        // 直接使用返回的支付链接，不创建新订单
        setCurrentOrder({
          orderNo: order.orderNo,
          amount: order.amount,
          bonusAmount: order.bonusAmount,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod
        });

        if (order.paymentMethod === 'alipay' && order.payUrl) {
          // 支付宝：新窗口打开
          const div = document.createElement('div');
          div.innerHTML = order.payUrl;
          const form = div.querySelector('form');
          if (form) {
            form.setAttribute('target', '_blank');
            document.body.appendChild(div);
            form.submit();
            setTimeout(() => document.body.removeChild(div), 100);
          } else if (order.payUrl.startsWith('http')) {
            window.open(order.payUrl, '_blank');
          }
          setPayModalVisible(true);
          startCountdown(order.expireMinutes || order.remainingMinutes);
          startPolling(order.orderNo);
        } else if (order.paymentMethod === 'wechat' && order.codeUrl) {
          // 微信：显示二维码
          try {
            const qrDataUrl = await QRCode.toDataURL(order.codeUrl, {
              width: 256,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
            });
            setQrCodeDataUrl(qrDataUrl);
          } catch (e) {
            setQrCodeDataUrl(order.codeUrl);
          }
          setPayModalVisible(true);
          startCountdown(order.expireMinutes || order.remainingMinutes);
          startPolling(order.orderNo);
        } else {
          message.error('获取支付链接失败，请重新创建订单');
        }
      } else if (response.data.status === 'success') {
        message.success('该订单已支付成功');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取订单信息失败');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get<{ success: boolean; data: RechargeConfig }>('/recharge/config');
      if (response.success) {
        setConfig(response.data);
        if (response.data.bonusRules.length > 3) {
          setSelectedAmount(response.data.bonusRules[3].amount);
        } else if (response.data.bonusRules.length > 0) {
          setSelectedAmount(response.data.bonusRules[0].amount);
        }
      }
    } catch (error) {
      message.error('加载充值配置失败');
    }
  };

  // 计算赠金
  const calculateBonus = (amount: number): number => {
    if (!config || !amount) return 0;
    const sortedRules = [...config.bonusRules].sort((a, b) => b.amount - a.amount);
    for (const rule of sortedRules) {
      if (amount >= rule.amount) {
        if (rule.bonusRate > 0) {
          return amount * rule.bonusRate;
        }
        return rule.bonusAmount;
      }
    }
    return 0;
  };

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustomAmount(false);
    setCustomAmountInput('');
  };

  const handleSelectCustom = () => {
    setIsCustomAmount(true);
    setSelectedAmount(null);
  };

  const handleCustomAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setCustomAmountInput(formatted);
    const numValue = parseFloat(formatted);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue);
    } else {
      setSelectedAmount(null);
    }
  };

  const getRechargeAmount = (): number | null => {
    if (isCustomAmount) {
      const amount = parseFloat(customAmountInput);
      return isNaN(amount) ? null : amount;
    }
    return selectedAmount;
  };

  const validateAmount = (): string | null => {
    const amount = getRechargeAmount();
    if (!amount) return '请输入充值金额';
    if (config) {
      if (amount < config.minAmount) return `最低充值金额为${config.minAmount}元`;
      if (amount > config.maxAmount) return `单次最高充值${config.maxAmount}元`;
    }
    return null;
  };

  // 格式化倒计时
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始倒计时
  const startCountdown = (minutes: number = 15) => {
    setCountdown(minutes * 60);
    setCountdownActive(true);
  };

  // 调用微信JSAPI支付
  const invokeWeChatJsapiPay = (params: RechargeOrder['jsapiParams']): Promise<boolean> => {
    return new Promise((resolve) => {
      const invokePayment = () => {
        console.log('[JSAPI支付] 调起微信支付，参数:', params);
        (window as any).WeixinJSBridge.invoke(
          'getBrandWCPayRequest',
          {
            appId: params!.appId,
            timeStamp: params!.timeStamp,
            nonceStr: params!.nonceStr,
            package: params!.package,
            signType: params!.signType,
            paySign: params!.paySign
          },
          (res: any) => {
            console.log('[JSAPI支付] 支付结果:', res);
            if (res.err_msg === 'get_brand_wcpay_request:ok') {
              // 支付成功
              resolve(true);
            } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
              // 用户取消
              message.info('支付已取消');
              resolve(false);
            } else {
              // 支付失败
              message.error('支付失败，请重试');
              resolve(false);
            }
          }
        );
      };

      // 检查WeixinJSBridge是否已就绪
      if (typeof (window as any).WeixinJSBridge !== 'undefined') {
        invokePayment();
      } else {
        // 等待WeixinJSBridge就绪
        document.addEventListener('WeixinJSBridgeReady', invokePayment, false);
      }
    });
  };

  const handleRechargeWithAmount = async (amount: number, method: string) => {
    setLoading(true);
    setQrCodeDataUrl('');

    // 确定支付类型：微信浏览器+有openid 使用JSAPI，否则使用Native
    let payType = 'native';
    if (method === 'wechat') {
      if (inWeChatBrowser && hasWeChatOpenid) {
        payType = 'jsapi';
      } else if (isMobile() && !inWeChatBrowser) {
        // 手机浏览器（非微信）使用H5支付
        // 暂时先用Native，因为H5支付需要额外配置
        payType = 'native';
      }
    }

    try {
      const response = await api.post<{
        success: boolean;
        data: RechargeOrder;
      }>('/recharge/create', {
        amount: amount,
        paymentMethod: method,
        payType: payType
      });

      if (response.success) {
        const order = response.data;
        setCurrentOrder(order);

        if (method === 'alipay' && order.payUrl) {
          // 支付宝支付
          if (inWeChatBrowser) {
            // 在微信浏览器里无法直接跳转支付宝，显示引导弹窗
            setPayModalVisible(true);
            startCountdown(order.expireMinutes || 15);
            startPolling(order.orderNo);
            message.info('请点击右上角"..."选择"在浏览器中打开"完成支付');
          } else {
            // PC端和移动端：新窗口打开
            message.loading('正在跳转到支付宝...', 2);

            const div = document.createElement('div');
            div.innerHTML = order.payUrl;
            const form = div.querySelector('form');
            if (form) {
              form.setAttribute('target', '_blank');
              document.body.appendChild(div);
              form.submit();
              setTimeout(() => document.body.removeChild(div), 100);
            } else if (order.payUrl.startsWith('http')) {
              window.open(order.payUrl, '_blank');
            }

            // 显示等待弹窗
            setPayModalVisible(true);
            startCountdown(order.expireMinutes || 15);
            startPolling(order.orderNo);
          }
        } else if (method === 'wechat') {
          // 微信支付
          if (order.jsapiParams) {
            // JSAPI支付（微信内浏览器直接调起支付）
            setJsapiPaying(true);
            message.loading('正在调起微信支付...', 1);

            const success = await invokeWeChatJsapiPay(order.jsapiParams);
            setJsapiPaying(false);

            if (success) {
              // 支付成功，刷新用户信息
              const paidAmount = order.amount;
              const bonusAmount = order.bonusAmount;

              await refreshUser();
              setSuccessAmount({ paid: paidAmount, bonus: bonusAmount });
              setSuccessModalVisible(true);
              setCurrentOrder(null);
            }
            // 支付取消或失败，不做额外处理，用户可以重新点击支付
          } else if (order.h5Url) {
            // H5支付（手机浏览器跳转）
            window.location.href = order.h5Url;
          } else {
            // Native支付（显示二维码）
            const qrUrl = order.codeUrl || order.qrCodeUrl;
            if (qrUrl) {
              try {
                const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                  width: 256,
                  margin: 2,
                  color: { dark: '#000000', light: '#ffffff' }
                });
                setQrCodeDataUrl(qrDataUrl);
              } catch (e) {
                // 如果是直接的图片URL，直接使用
                setQrCodeDataUrl(qrUrl);
              }
            }
            setPayModalVisible(true);
            startCountdown(order.expireMinutes || 15);
            startPolling(order.orderNo);
          }
        }
      } else {
        message.error('创建订单失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const error = validateAmount();
    if (error) {
      message.warning(error);
      return;
    }
    const amount = getRechargeAmount();
    if (!amount) return;

    // 如果是微信浏览器但没绑定微信，提示用户先绑定
    if (selectedMethod === 'wechat' && inWeChatBrowser && !hasWeChatOpenid) {
      message.warning('请先在个人中心绑定微信账号后再支付');
      navigate('/profile');
      return;
    }

    await handleRechargeWithAmount(amount, selectedMethod);
  };

  // 轮询订单状态
  const startPolling = (orderNo: string) => {
    const timer = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: {
            status: string;
            amount_paid?: string;
            bonus_amount?: string;
          };
        }>(`/recharge/order/${orderNo}`);

        if (response.success && response.data.status === 'success') {
          clearInterval(timer);
          setPollingTimer(null);
          setCountdownActive(false);
          setPayModalVisible(false);
          setQrCodeDataUrl('');

          // 从 API 响应获取金额信息
          const paidAmount = parseFloat(response.data.amount_paid || '0');
          const bonusAmount = parseFloat(response.data.bonus_amount || '0');

          // 刷新用户信息
          await refreshUser();

          // 设置成功状态并显示弹窗
          setSuccessAmount({ paid: paidAmount, bonus: bonusAmount });
          setSuccessModalVisible(true);
          setCurrentOrder(null);
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
      }
    }, 2000);

    setPollingTimer(timer);
  };

  const handleCancelPay = () => {
    // 关闭弹窗但继续后台轮询
    setCountdownActive(false);
    setPayModalVisible(false);
    setQrCodeDataUrl('');

    // 提示用户
    message.info('如已完成支付，系统将自动确认并更新余额');

    // 注意：不停止轮询，继续检测支付结果
    // 如果用户真的支付了，轮询会检测到并显示成功弹窗
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  const displayAmount = getRechargeAmount();
  const displayBonus = displayAmount ? calculateBonus(displayAmount) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* 标题区域 */}
      <div className="card p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
              <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">账户充值</h1>
              <p className="text-xs sm:text-sm text-slate-500">充值即享好礼，满100送20</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end bg-emerald-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-slate-500">当前余额</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">¥{Number(userBalance || 0).toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 充值金额选择 */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
          选择充值金额
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {config.bonusRules.map((rule, index) => (
            <button
              key={`${rule.amount}-${index}`}
              onClick={() => handleSelectPreset(rule.amount)}
              className={`relative p-2.5 sm:p-4 rounded-xl border-2 transition-all ${
                !isCustomAmount && selectedAmount === rule.amount
                  ? 'border-sky-400 bg-sky-50 shadow-lg shadow-sky-100'
                  : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
              }`}
            >
              {!isCustomAmount && selectedAmount === rule.amount && (
                <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
              )}
              <div className="text-lg sm:text-2xl font-bold text-slate-900">¥{rule.amount}</div>
              {rule.bonusAmount > 0 && (
                <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 text-white font-medium">
                  <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  送{rule.bonusAmount.toFixed(0)}元
                </div>
              )}
            </button>
          ))}
          {/* 自定义金额按钮 */}
          <button
            onClick={handleSelectCustom}
            className={`relative p-2.5 sm:p-4 rounded-xl border-2 transition-all ${
              isCustomAmount
                ? 'border-sky-400 bg-sky-50 shadow-lg shadow-sky-100'
                : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
            }`}
          >
            {isCustomAmount && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            )}
            <div className="flex flex-col items-center justify-center">
              <PenLine className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 mb-1" />
              <div className="text-sm sm:text-base font-semibold text-slate-700">自定义</div>
            </div>
          </button>
        </div>
        {/* 自定义金额输入框 */}
        {isCustomAmount && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-700">¥</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmountInput}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder={`输入金额（${config.minAmount}-${config.maxAmount}元）`}
                className="flex-1 text-xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-400 placeholder:text-base placeholder:font-normal"
                autoFocus
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>最低{config.minAmount}元起充</span>
              <span>单次最高{config.maxAmount}元</span>
            </div>
            {displayAmount && displayBonus > 0 && (
              <div className="mt-2 flex items-center gap-1 text-sm text-orange-600">
                <Gift className="w-4 h-4" />
                <span>可获赠 ¥{displayBonus.toFixed(0)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 支付方式选择 */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          选择支付方式
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <button
            onClick={() => setSelectedMethod('alipay')}
            className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all ${
              selectedMethod === 'alipay'
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 hover:border-sky-200'
            }`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#1677ff] text-white flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
              支
            </div>
            <div className="text-left min-w-0">
              <div className="font-semibold text-slate-900 text-sm sm:text-base">支付宝</div>
              <div className="text-xs sm:text-sm text-slate-500 hidden sm:block">推荐使用</div>
            </div>
            {selectedMethod === 'alipay' && (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 ml-auto flex-shrink-0" />
            )}
          </button>
          <button
            onClick={() => setSelectedMethod('wechat')}
            className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all ${
              selectedMethod === 'wechat'
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 hover:border-sky-200'
            }`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#07c160] text-white flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
              微
            </div>
            <div className="text-left min-w-0">
              <div className="font-semibold text-slate-900 text-sm sm:text-base">微信支付</div>
              <div className="text-xs sm:text-sm text-slate-500 hidden sm:block">扫码支付</div>
            </div>
            {selectedMethod === 'wechat' && (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 ml-auto flex-shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* 充值汇总 */}
      {displayAmount && displayAmount > 0 && (
        <div className="card p-4 sm:p-6 bg-gradient-to-r from-slate-50 to-sky-50">
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">充值金额</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">¥{displayAmount}</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">赠送金额</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-500">
                +¥{displayBonus.toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">实际到账</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                ¥{(displayAmount + displayBonus).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={handleRecharge}
          disabled={!displayAmount || loading || jsapiPaying}
          className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold text-base sm:text-lg shadow-lg shadow-sky-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || jsapiPaying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {jsapiPaying ? '支付中...' : '立即充值'}
        </button>
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          <History className="w-5 h-5" />
          交易记录
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
          <li>• 自定义金额同样享受对应档位的赠金优惠</li>
          <li>• 如遇支付问题，请联系客服处理</li>
        </ul>
      </div>

      {/* 支付弹窗 */}
      {payModalVisible && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {currentOrder.paymentMethod === 'alipay' ? '等待支付' : '微信扫码支付'}
              </h3>
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
                  currentOrder.paymentMethod === 'alipay' ? 'bg-[#1677ff]' : 'bg-[#07c160]'
                }`}>
                  {currentOrder.paymentMethod === 'alipay' ? '支' : '微'}
                </div>
                <span className="font-medium text-slate-700">
                  {currentOrder.paymentMethod === 'alipay'
                    ? (inWeChatBrowser ? '请在浏览器中打开' : '请在新窗口完成支付')
                    : '请使用微信扫一扫'}
                </span>
              </div>

              {/* 微信二维码 */}
              {currentOrder.paymentMethod === 'wechat' && (
                <div className="w-56 h-56 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center border-2 border-slate-100 p-2">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="微信支付二维码"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  )}
                </div>
              )}

              {/* 支付宝等待提示 - 区分微信浏览器和其他浏览器 */}
              {currentOrder.paymentMethod === 'alipay' && inWeChatBrowser && (
                <div className="w-64 mx-auto mb-4 bg-orange-50 rounded-xl p-4 flex flex-col items-center">
                  <div className="w-16 h-16 mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-orange-700 font-medium mb-2">微信内无法直接跳转支付宝</p>
                  <p className="text-sm text-orange-600 mb-3">请点击右上角 "..." 选择</p>
                  <div className="bg-white rounded-lg px-4 py-2 border border-orange-200">
                    <span className="text-orange-700 font-medium">"在浏览器中打开"</span>
                  </div>
                  <p className="text-xs text-orange-500 mt-3">打开后即可完成支付宝支付</p>
                </div>
              )}

              {currentOrder.paymentMethod === 'alipay' && !inWeChatBrowser && (
                <div className="w-56 h-40 mx-auto mb-4 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-3" />
                  <p className="text-blue-600 font-medium">等待支付完成...</p>
                  <p className="text-sm text-blue-400 mt-1">请在新窗口中完成支付</p>
                </div>
              )}

              {/* 支付金额 */}
              <div className="mb-4">
                <p className="text-sm text-slate-500">支付金额</p>
                <p className="text-3xl font-bold text-emerald-600">¥{currentOrder.amount}</p>
                {currentOrder.bonusAmount > 0 && (
                  <p className="text-sm text-orange-500 mt-1">
                    赠送 ¥{currentOrder.bonusAmount}
                  </p>
                )}
              </div>

              {/* 倒计时 */}
              {countdownActive && countdown > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm mb-4">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-500' : 'text-orange-500'}`}>
                    {formatCountdown(countdown)}
                  </span>
                  <span className="text-slate-500">后订单过期</span>
                </div>
              )}

              {/* 等待提示 */}
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>支付完成后自动跳转...</span>
              </div>

              {/* 订单号 */}
              <p className="text-xs text-slate-400 mt-4">
                订单号: {currentOrder.orderNo}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 支付成功弹窗 */}
      {successModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">太棒了！</h2>
              <p className="text-lg text-slate-600 mb-4">
                充值成功，感谢您的支持
              </p>
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 mb-4">
                <p className="text-3xl font-bold text-emerald-600">
                  +¥{successAmount.paid}
                </p>
                {successAmount.bonus > 0 && (
                  <p className="text-sm text-orange-500 mt-2 font-medium">
                    额外赠送 ¥{successAmount.bonus} 已到账
                  </p>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-6">
                余额已更新，可立即使用
              </p>
              <button
                onClick={() => setSuccessModalVisible(false)}
                className="w-full py-3 rounded-xl text-white font-semibold text-lg"
                style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
              >
                好的
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recharge;
