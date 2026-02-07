import { useState, useEffect } from 'react';
import { message } from 'antd';
import QRCode from 'qrcode';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Smartphone,
  Clock
} from 'lucide-react';

export interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (orderNo?: string) => void;
  productType: 'membership' | 'course';
  productName: string;
  productPrice: number;
  productDescription?: string;
}

type PaymentMethod = 'alipay' | 'wechat';

interface RechargeOrder {
  orderNo: string;
  amount: number;
  bonusAmount: number;
  totalAmount: number;
  paymentMethod: string;
  payType?: string;
  payUrl?: string;
  codeUrl?: string;
  jsapiParams?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
  h5Url?: string;
  expireMinutes?: number;
}

// 检测是否在微信浏览器中
const isWeChatBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
};

const PaymentModal = ({
  visible,
  onClose,
  onSuccess,
  productType,
  productName,
  productPrice,
  productDescription
}: PaymentModalProps) => {
  const { refreshUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [jsapiPaying, setJsapiPaying] = useState(false);

  // 是否在微信浏览器中
  const inWeChatBrowser = isWeChatBrowser();
  // 用户是否已绑定微信
  const hasWeChatOpenid = !!user?.wechat_openid;

  // 监听支付方式切换，重置相关状态
  useEffect(() => {
    // 切换支付方式时，重置所有订单相关状态
    setRechargeOrder(null);
    setPolling(false);
    setQrCodeDataUrl('');
    setCountdown(0);
    setCountdownActive(false);
    setSkipPendingCheck(false);
    setShowConfirmDialog(false);
    setPendingOrderInfo(null);
  }, [paymentMethod]);
  const [rechargeOrder, setRechargeOrder] = useState<RechargeOrder | null>(null);
  const [polling, setPolling] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [autoPurchasing, setAutoPurchasing] = useState(false);

  // 倒计时相关
  const [countdown, setCountdown] = useState<number>(0);
  const [countdownActive, setCountdownActive] = useState(false);

  // 跳过pending订单检查标志
  const [skipPendingCheck, setSkipPendingCheck] = useState(false);

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOrderInfo, setPendingOrderInfo] = useState<{
    orderNo: string;
    paymentMethod: 'wechat' | 'alipay';
  } | null>(null);


  // 轮询查询充值订单状态
  useEffect(() => {
    if (!rechargeOrder || !polling) return;

    const timer = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: { status: string; amount: number; bonusAmount: number }
        }>(`/recharge/order/${rechargeOrder.orderNo}`);

        if (response.success && response.data.status === 'success') {
          setPolling(false);
          message.success(`充值成功！到账 ¥${response.data.amount + response.data.bonusAmount}`);

          // 充值成功后自动购买课程
          await handleAutoPurchase(rechargeOrder.orderNo);
        }
      } catch (error) {
        console.error('查询充值订单状态失败:', error);
      }
    }, 2000); // 每2秒查询一次

    return () => clearInterval(timer);
  }, [rechargeOrder, polling]);

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

  // 自动使用余额购买课程
  const handleAutoPurchase = async (rechargeOrderNo: string) => {
    setAutoPurchasing(true);
    setCountdownActive(false); // 停止倒计时
    try {
      // 先刷新用户信息获取最新余额
      await refreshUser();

      // 使用余额支付购买课程
      const response = await api.post<{ success: boolean; data: { orderNo: string } }>(
        `/payment/pay-by-balance`,
        {
          productType,
          amount: productPrice
        }
      );

      if (response.success) {
        message.success('购买成功！');
        await refreshUser();
        // 传递充值订单号（用于显示）
        onSuccess(rechargeOrderNo);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '购买失败，请手动使用余额购买');
      // 即使购买失败，充值已经成功了，刷新页面让用户看到余额
      await refreshUser();
      handleClose();
    } finally {
      setAutoPurchasing(false);
    }
  };

  // 倒计时 effect
  useEffect(() => {
    if (!countdownActive || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCountdownActive(false);
          handleClose();
          message.warning('支付已超时，请重新创建订单');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, countdown > 0]);

  // 关闭弹窗时停止轮询和倒计时
  useEffect(() => {
    if (!visible) {
      setPolling(false);
      setRechargeOrder(null);
      setQrCodeDataUrl('');
      setCountdown(0);
      setCountdownActive(false);
    }
  }, [visible]);

  // 检查是否有pending的课程购买订单（指定支付方式）
  const checkPendingOrder = async (paymentMethod: 'wechat' | 'alipay'): Promise<string | null> => {
    console.log('🔍 开始检查pending订单，支付方式:', paymentMethod);
    try {
      const response = await api.get<{
        success: boolean;
        data: { records: any[] }
      }>('/transactions/recharge');

      console.log('📡 API响应:', response);

      if (response.success && response.data.records) {
        console.log('📋 充值记录数:', response.data.records.length);

        // 查找pending状态、金额匹配且支付方式匹配的订单
        const pendingOrder = response.data.records.find((record: any) =>
          record.status === 'pending' &&
          Number(record.amount_paid) === productPrice &&
          record.payment_method === paymentMethod
        );

        console.log('🔎 找到pending订单:', pendingOrder);

        if (pendingOrder) {
          // 检查订单是否在15分钟内
          const createdAt = new Date(pendingOrder.created_at);
          const now = new Date();
          const timeDiff = now.getTime() - createdAt.getTime();
          const timeoutMs = 15 * 60 * 1000;

          console.log('⏰ 订单时间差:', timeDiff, 'ms, 超时阈值:', timeoutMs, 'ms');

          if (timeDiff < timeoutMs) {
            console.log('✅ 订单在有效期内，返回订单号:', pendingOrder.order_no);
            return pendingOrder.order_no;
          } else {
            console.log('⏱️ 订单已超时');
          }
        } else {
          console.log('❌ 没有找到匹配的pending订单（金额:', productPrice, '支付方式:', paymentMethod, ')');
        }
      }
    } catch (error) {
      console.error('❌ 检查pending订单失败:', error);
    }
    console.log('↩️ 返回 null');
    return null;
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
              resolve(true);
            } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
              message.info('支付已取消');
              resolve(false);
            } else {
              message.error('支付失败，请重试');
              resolve(false);
            }
          }
        );
      };

      if (typeof (window as any).WeixinJSBridge !== 'undefined') {
        invokePayment();
      } else {
        document.addEventListener('WeixinJSBridgeReady', invokePayment, false);
      }
    });
  };

  // 微信充值支付（先充值到余额，然后自动购买）
  // skipCheck 参数用于直接跳过 pending 订单检查（创建新订单时使用）
  const handleWechatRecharge = async (skipCheck: boolean = false) => {
    console.log('💳 开始微信充值支付流程...');
    console.log('🏷️ skipPendingCheck:', skipPendingCheck, 'skipCheck参数:', skipCheck);
    setLoading(true);
    try {
      // 先检查是否有pending订单（除非用户已选择跳过）
      const shouldSkip = skipCheck || skipPendingCheck;
      if (!shouldSkip) {
        console.log('🔍 准备检查pending订单（微信）...');
        const pendingOrderNo = await checkPendingOrder('wechat');
        console.log('📝 检查结果 pendingOrderNo:', pendingOrderNo);
        if (pendingOrderNo) {
          setLoading(false);
          console.log('🚀 准备显示确认对话框...');

          // 设置pending订单信息并显示确认对话框
          setPendingOrderInfo({
            orderNo: pendingOrderNo,
            paymentMethod: 'wechat'
          });
          setShowConfirmDialog(true);
          console.log('✨ 确认对话框已设置');
          return;
        }
      }

      // 重置跳过标志
      setSkipPendingCheck(false);

      console.log('📦 准备创建新订单，金额:', productPrice);

      // 确定支付类型：微信浏览器+有openid 使用JSAPI
      const payType = inWeChatBrowser && hasWeChatOpenid ? 'jsapi' : 'native';
      console.log('💳 支付类型:', payType, '微信浏览器:', inWeChatBrowser, '有openid:', hasWeChatOpenid);

      // 创建充值订单（充值课程价格的金额）
      const response = await api.post<{
        success: boolean;
        data: RechargeOrder;
      }>('/recharge/create', {
        amount: productPrice,
        paymentMethod: 'wechat',
        payType: payType
      });

      console.log('📨 创建订单响应:', response);

      if (!response.success) {
        console.error('❌ 订单创建失败: success=false');
        message.error('创建订单失败，请重试');
        return;
      }

      const order = response.data;

      // JSAPI支付（微信内浏览器直接调起）
      if (order.jsapiParams) {
        console.log('✅ JSAPI支付订单创建成功，订单号:', order.orderNo);
        setJsapiPaying(true);
        message.loading('正在调起微信支付...', 1);

        const success = await invokeWeChatJsapiPay(order.jsapiParams);
        setJsapiPaying(false);

        if (success) {
          // 充值成功后自动购买课程
          await handleAutoPurchase(order.orderNo);
        }
        return;
      }

      // Native支付（扫码）
      if (!order.codeUrl) {
        console.error('❌ 订单数据不完整:', order);
        message.error('获取支付二维码失败，请重试');
        return;
      }

      console.log('✅ 订单创建成功，订单号:', order.orderNo);

      setRechargeOrder(order);

      // 保存订单来源到localStorage
      const coursePurchaseOrders = JSON.parse(localStorage.getItem('coursePurchaseOrders') || '[]');
      coursePurchaseOrders.push({
        orderNo: order.orderNo,
        productType,
        productName,
        productPrice,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('coursePurchaseOrders', JSON.stringify(coursePurchaseOrders));

      // 生成二维码
      try {
        const qrDataUrl = await QRCode.toDataURL(order.codeUrl || '', {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (e) {
        console.error('生成二维码失败:', e);
        setQrCodeDataUrl(order.codeUrl || '');
      }

      setPolling(true);
      startCountdown(order.expireMinutes || 15);
      message.info('请使用微信扫描二维码完成支付');
    } catch (error: any) {
      console.error('创建订单异常:', error);
      message.error(error.response?.data?.error || error.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 继续支付pending订单
  const continuePendingOrder = async (orderNo: string, method: 'wechat' | 'alipay') => {
    console.log('🔄 开始继续支付订单:', orderNo, '支付方式:', method);

    // 微信浏览器内继续支付微信订单，需要重新创建 JSAPI 订单
    if (method === 'wechat' && inWeChatBrowser && hasWeChatOpenid) {
      console.log('💚 微信浏览器内继续支付，需要创建新的JSAPI订单');
      // 传递 skipCheck=true 跳过检查并创建新订单
      await handleWechatRecharge(true);
      return;
    }

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
          payUrl?: string;
          codeUrl?: string;
          expireMinutes: number;
          createdAt: string;
        }
      }>(`/recharge/continue/${orderNo}`);

      console.log('📨 继续支付API响应:', response);

      if (response.success && response.data.status === 'pending') {
        const order = response.data;
        console.log('✅ 订单状态正常，订单数据:', order);

        setRechargeOrder({
          orderNo: order.orderNo,
          amount: order.amount,
          bonusAmount: order.bonusAmount,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          payUrl: order.payUrl,
          codeUrl: order.codeUrl,
          expireMinutes: order.expireMinutes
        });

        if (method === 'wechat' && order.codeUrl) {
          console.log('💚 微信支付，准备生成二维码，codeUrl:', order.codeUrl);
          // 生成二维码
          try {
            const qrDataUrl = await QRCode.toDataURL(order.codeUrl, {
              width: 256,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
            });
            console.log('✅ 二维码生成成功');
            setQrCodeDataUrl(qrDataUrl);
          } catch (e) {
            console.error('❌ 二维码生成失败:', e);
            setQrCodeDataUrl(order.codeUrl || '');
          }
        } else if (method === 'alipay' && order.payUrl) {
          console.log('💙 支付宝支付');
          // 微信浏览器内不跳转，只显示提示
          if (!inWeChatBrowser) {
            // 非微信浏览器：新窗口打开
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
          }
          // 微信浏览器内会显示引导提示（在UI中处理）
        } else {
          console.warn('⚠️ 没有匹配的支付方式，method:', method, 'codeUrl:', order.codeUrl, 'payUrl:', order.payUrl);
        }

        // 基于订单创建时间计算剩余时间
        const orderCreatedAt = new Date(order.createdAt).getTime();
        const now = Date.now();
        const elapsedMs = now - orderCreatedAt;
        const totalTimeMs = 15 * 60 * 1000; // 15分钟
        const remainingMs = Math.max(0, totalTimeMs - elapsedMs);
        const remainingSeconds = Math.floor(remainingMs / 1000);

        console.log('⏱️ 订单创建时间:', new Date(order.createdAt).toLocaleString());
        console.log('⏱️ 已过时间:', Math.floor(elapsedMs / 1000), '秒');
        console.log('⏱️ 剩余时间:', remainingSeconds, '秒');

        setPolling(true);
        setCountdown(remainingSeconds);
        setCountdownActive(true);
        message.info(`继续支付订单 ${orderNo}`);
      } else {
        console.error('❌ 订单状态异常:', response);
      }
    } catch (error: any) {
      console.error('❌ 继续支付异常:', error);
      message.error(error.response?.data?.error || '获取订单信息失败');
      throw error;
    }
  };

  // 支付宝充值支付（先充值到余额，然后自动购买）
  // skipCheck 参数用于直接跳过 pending 订单检查（创建新订单时使用）
  const handleAlipayRecharge = async (skipCheck: boolean = false) => {
    console.log('💙 开始支付宝充值支付流程...');
    console.log('🏷️ skipPendingCheck:', skipPendingCheck, 'skipCheck参数:', skipCheck);
    setLoading(true);
    try {
      // 先检查是否有pending订单（除非用户已选择跳过）
      const shouldSkip = skipCheck || skipPendingCheck;
      if (!shouldSkip) {
        console.log('🔍 准备检查pending订单（支付宝）...');
        const pendingOrderNo = await checkPendingOrder('alipay');
        console.log('📝 检查结果 pendingOrderNo:', pendingOrderNo);
        if (pendingOrderNo) {
          setLoading(false);
          console.log('🚀 准备显示确认对话框...');

          // 设置pending订单信息并显示确认对话框
          setPendingOrderInfo({
            orderNo: pendingOrderNo,
            paymentMethod: 'alipay'
          });
          setShowConfirmDialog(true);
          console.log('✨ 确认对话框已设置');
          return;
        }
      }

      // 重置跳过标志
      setSkipPendingCheck(false);

      // 创建充值订单（充值课程价格的金额）
      const response = await api.post<{
        success: boolean;
        data: RechargeOrder;
      }>('/recharge/create', {
        amount: productPrice,
        paymentMethod: 'alipay'
      });

      if (!response.success) {
        message.error('创建订单失败，请重试');
        return;
      }

      if (!response.data || !response.data.payUrl) {
        message.error('获取支付链接失败，请重试');
        return;
      }

      const order = response.data;
      setRechargeOrder(order);

      // 保存订单来源到localStorage
      const coursePurchaseOrders = JSON.parse(localStorage.getItem('coursePurchaseOrders') || '[]');
      coursePurchaseOrders.push({
        orderNo: order.orderNo,
        productType,
        productName,
        productPrice,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('coursePurchaseOrders', JSON.stringify(coursePurchaseOrders));

      // 支付宝支付
      console.log('🚀 准备支付宝支付...');
      console.log('💰 支付链接 payUrl:', order.payUrl);

      if (inWeChatBrowser) {
        // 微信浏览器内不跳转，只显示引导提示
        console.log('⚠️ 微信浏览器内，显示引导提示');
        message.info('请点击右上角"..."选择"在浏览器中打开"');
      } else {
        // 非微信浏览器：新窗口打开
        const div = document.createElement('div');
        div.innerHTML = order.payUrl || '';
        const form = div.querySelector('form');
        console.log('📋 找到表单:', !!form);

        if (form) {
          console.log('✅ 使用表单提交方式');
          form.setAttribute('target', '_blank');
          document.body.appendChild(div);
          form.submit();
          setTimeout(() => document.body.removeChild(div), 100);
        } else if (order.payUrl && order.payUrl.startsWith('http')) {
          console.log('✅ 使用URL跳转方式:', order.payUrl);
          window.open(order.payUrl, '_blank');
        } else {
          console.error('❌ payUrl格式不正确，无法打开支付页面');
          console.error('payUrl内容:', order.payUrl);
        }
        message.info('请在新窗口完成支付宝支付');
      }

      setPolling(true);
      startCountdown(order.expireMinutes || 15);
    } catch (error: any) {
      console.error('创建订单异常:', error);
      message.error(error.response?.data?.error || error.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理支付按钮点击
  const handlePay = async () => {
    console.log('🎯 点击了支付按钮，支付方式:', paymentMethod);
    if (paymentMethod === 'wechat') {
      console.log('💚 使用微信支付');
      await handleWechatRecharge();
    } else if (paymentMethod === 'alipay') {
      console.log('💙 使用支付宝支付');
      await handleAlipayRecharge();
    }
    console.log('✨ 支付流程执行完毕');
  };

  // 重置状态
  const handleClose = () => {
    setRechargeOrder(null);
    setPolling(false);
    setPaymentMethod('wechat');
    setQrCodeDataUrl('');
    setCountdown(0);
    setCountdownActive(false);
    onClose();
  };

  // 确认对话框 - 继续支付
  const handleContinuePendingOrder = async () => {
    if (!pendingOrderInfo) return;

    console.log('✅ 用户选择继续支付，订单号:', pendingOrderInfo.orderNo);
    console.log('💳 支付方式:', pendingOrderInfo.paymentMethod);
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      await continuePendingOrder(pendingOrderInfo.orderNo, pendingOrderInfo.paymentMethod);
      console.log('✅ 继续支付完成');
    } catch (error) {
      console.error('❌ 继续支付失败:', error);
    } finally {
      setLoading(false);
      setPendingOrderInfo(null);
    }
  };

  // 确认对话框 - 创建新订单
  const handleCreateNewOrder = async () => {
    if (!pendingOrderInfo) return;

    // 先保存支付方式，因为后面会清除 pendingOrderInfo
    const payMethod = pendingOrderInfo.paymentMethod;

    console.log('🆕 用户选择创建新订单，支付方式:', payMethod);
    setShowConfirmDialog(false);
    setPendingOrderInfo(null);

    // 直接调用并传递 skipCheck=true 跳过检查（解决状态异步更新问题）
    if (payMethod === 'wechat') {
      await handleWechatRecharge(true);
    } else {
      await handleAlipayRecharge(true);
    }
  };

  if (!visible) return null;

  // 如果已经生成充值订单，显示支付界面
  if (rechargeOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-bold text-lg text-slate-900">
              {paymentMethod === 'wechat' ? '微信支付' : '支付宝支付'}
            </h3>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 text-center">
            {autoPurchasing ? (
              // 自动购买中
              <div className="py-8">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-900 mb-2">充值成功！</p>
                <p className="text-sm text-slate-600">正在自动购买课程...</p>
              </div>
            ) : (
              <>
                {/* 金额显示 */}
                <div className="mb-6">
                  <p className="text-slate-600 mb-2">充值金额</p>
                  <p className="text-3xl font-bold text-slate-900">¥{rechargeOrder.amount}</p>
                  {rechargeOrder.bonusAmount > 0 && (
                    <p className="text-sm text-emerald-600 mt-2">
                      赠送 ¥{rechargeOrder.bonusAmount} 到账 ¥{rechargeOrder.totalAmount}
                    </p>
                  )}
                </div>

                {/* 支付宝显示提示，微信显示二维码 */}
                {paymentMethod === 'wechat' && qrCodeDataUrl && (
                  <>
                    {/* 二维码 */}
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block mb-4">
                      <img src={qrCodeDataUrl} alt="微信支付" className="w-52 h-52" />
                    </div>

                    {/* 提示文字 */}
                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="flex items-center justify-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        请使用微信扫一扫
                      </p>
                      <p className="text-xs text-slate-400">
                        订单号：{rechargeOrder.orderNo}
                      </p>
                    </div>
                  </>
                )}

                {paymentMethod === 'alipay' && inWeChatBrowser && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-orange-700">
                        微信内无法直接跳转支付宝
                      </p>
                      <p className="text-sm text-orange-600">
                        请点击右上角 "..." 选择
                      </p>
                      <div className="bg-white rounded-lg px-4 py-2 border border-orange-200 inline-block">
                        <span className="text-orange-700 font-medium">"在浏览器中打开"</span>
                      </div>
                      <p className="text-xs text-orange-500 mt-2">
                        打开后即可完成支付宝支付
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        订单号：{rechargeOrder.orderNo}
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'alipay' && !inWeChatBrowser && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-900">
                        请在新窗口完成支付
                      </p>
                      <p className="text-sm text-slate-600">
                        支付完成后将自动到账并购买课程
                      </p>
                      <p className="text-xs text-slate-400">
                        订单号：{rechargeOrder.orderNo}
                      </p>
                    </div>
                  </div>
                )}

                {/* 倒计时和等待支付提示 */}
                {polling && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sky-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">等待支付中...</span>
                    </div>
                    {countdownActive && countdown > 0 && (
                      <div className="flex items-center justify-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-mono">{formatCountdown(countdown)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 说明文字 */}
                <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-xs text-amber-700 mb-1 font-semibold">温馨提示</p>
                  <p className="text-xs text-amber-600">
                    支付完成后，系统将自动为您充值余额并购买课程，无需手动操作
                  </p>
                </div>

                {/* 返回按钮 */}
                <button
                  onClick={handleClose}
                  className="mt-4 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                >
                  返回
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 支付方式选择界面
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-lg text-slate-900">选择支付方式</h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {/* 商品信息 */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">{productName}</span>
              <span className="text-2xl font-bold text-slate-900">¥{productPrice}</span>
            </div>
            {productDescription && (
              <p className="text-sm text-slate-500">{productDescription}</p>
            )}
          </div>

          {/* 支付方式选择 */}
          <div className="space-y-3 mb-6">
            {/* 微信支付 */}
            <div
              onClick={() => setPaymentMethod('wechat')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'wechat'
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  paymentMethod === 'wechat'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.8,9.8c-0.7,0-1.3,0.6-1.3,1.3s0.6,1.3,1.3,1.3s1.3-0.6,1.3-1.3S19.5,9.8,18.8,9.8z M14.9,9.8 c-0.7,0-1.3,0.6-1.3,1.3s0.6,1.3,1.3,1.3s1.3-0.6,1.3-1.3S15.6,9.8,14.9,9.8z M23.3,13.5c0.1-0.4,0.2-0.8,0.2-1.2 c0-3.2-2.9-5.9-6.5-6.4c-0.4-3.5-4.2-6.3-8.8-6.3C3.6-0.4,0,3.2,0,7.8c0,2.4,1.2,4.6,3.1,6.1L2.4,17l3.8-2 c0.9,0.3,1.9,0.5,2.9,0.5c0.4,0,0.8,0,1.2-0.1c0.1,0.5,0.3,1,0.5,1.5c0.9,2.2,3,3.8,5.5,4.1c0.7,0.2,1.4,0.3,2.1,0.3 c0.9,0,1.8-0.2,2.6-0.4l3.3,1.7l-0.6-3.1C23.1,17.8,24,15.7,23.3,13.5z M11.6,13.6c-0.7,0-1.4-0.1-2-0.3l-2.4,1.3l0.4-2 C6.4,11.5,5.6,9.8,5.6,7.9c0-3.1,2.9-5.7,6.5-5.7c3.6,0,6.5,2.6,6.5,5.7C18.6,11,15.7,13.6,11.6,13.6z M20.7,17.5l0.4,2.2 l-2.1-1.1c-0.6,0.2-1.3,0.3-2,0.3c-0.6,0-1.2-0.1-1.7-0.3c2.4-0.7,4.2-2.7,4.2-5.1c0-0.4-0.1-0.8-0.2-1.2 C21.3,13.3,22.1,15.3,20.7,17.5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">微信支付</div>
                  <div className="text-sm text-slate-500">充值后自动购买</div>
                </div>
                {paymentMethod === 'wechat' && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>

            {/* 支付宝支付 */}
            <div
              onClick={() => setPaymentMethod('alipay')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'alipay'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  paymentMethod === 'alipay'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">支付宝</div>
                  <div className="text-sm text-slate-500">充值后自动购买</div>
                </div>
                {paymentMethod === 'alipay' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </div>
          </div>

          {/* 支付说明 */}
          <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-700 text-sm mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">支付流程</p>
              <p className="text-sky-600">先充值 ¥{productPrice} 到账户，支付成功后自动购买</p>
            </div>
          </div>

          {/* 按钮区域 */}
          <button
            onClick={handlePay}
            disabled={loading || jsapiPaying}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              paymentMethod === 'wechat'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200'
                : 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-blue-200'
            }`}
          >
            {loading || jsapiPaying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {paymentMethod === 'wechat' && <Smartphone className="w-5 h-5" />}
                {paymentMethod === 'alipay' && <CreditCard className="w-5 h-5" />}
                确认支付 ¥{productPrice}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && pendingOrderInfo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold text-lg">发现未支付订单</h3>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                您有一个未支付的订单，是否继续该订单支付？
              </p>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">订单号</p>
                <p className="font-mono font-semibold text-slate-900 break-all">
                  {pendingOrderInfo.orderNo}
                </p>
              </div>

              {/* 按钮组 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateNewOrder}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  创建新订单
                </button>
                <button
                  onClick={handleContinuePendingOrder}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold hover:from-sky-600 hover:to-blue-600 transition-all shadow-lg shadow-sky-200"
                >
                  继续支付
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentModal;
