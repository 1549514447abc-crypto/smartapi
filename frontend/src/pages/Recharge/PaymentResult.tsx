import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/request';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';

type PaymentStatus = 'loading' | 'success' | 'pending' | 'failed';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [countdown, setCountdown] = useState(5);

  const orderNo = searchParams.get('orderNo') || '';

  useEffect(() => {
    if (!orderNo) {
      setStatus('failed');
      return;
    }

    const checkOrder = async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: { status: string };
        }>(`/recharge/order/${orderNo}`);

        if (response.success) {
          if (response.data.status === 'success') {
            setStatus('success');
          } else if (response.data.status === 'pending') {
            setStatus('pending');
            // 继续轮询
            setTimeout(checkOrder, 2000);
          } else {
            setStatus('failed');
          }
        } else {
          setStatus('failed');
        }
      } catch (error) {
        console.error('查询订单失败:', error);
        setStatus('failed');
      }
    };

    checkOrder();
  }, [orderNo]);

  // 成功后倒计时关闭
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (status === 'success' && countdown === 0) {
      handleClose();
    }
  }, [status, countdown]);

  const handleClose = () => {
    // 尝试关闭窗口
    window.close();
    // 如果无法关闭（不是通过 window.open 打开的），跳转到充值页
    setTimeout(() => {
      window.location.href = '/smartapi/recharge';
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-sky-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">查询支付结果...</h2>
            <p className="text-slate-500">请稍候</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">支付处理中</h2>
            <p className="text-slate-500">正在确认支付结果，请稍候...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">支付成功</h2>
            <p className="text-slate-500 mb-6">充值已到账，感谢您的支持！</p>
            <p className="text-sm text-slate-400 mb-4">
              {countdown > 0 ? `${countdown} 秒后自动关闭...` : '正在关闭...'}
            </p>
            <button
              onClick={handleClose}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
            >
              <X className="w-5 h-5" />
              关闭窗口
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">支付失败</h2>
            <p className="text-slate-500 mb-6">订单未完成或已取消</p>
            <button
              onClick={handleClose}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition-colors"
            >
              关闭窗口
            </button>
          </>
        )}

        {orderNo && (
          <p className="mt-6 text-xs text-slate-400">
            订单号：{orderNo}
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
