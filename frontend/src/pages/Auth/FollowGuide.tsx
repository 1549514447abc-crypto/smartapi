import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, App } from 'antd';
import { CheckCircle, QrCode, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';

/**
 * 引导关注公众号页面
 * 用户通过微信OAuth登录但未关注公众号时，会跳转到此页面
 */
const FollowGuide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const { setToken, refreshUser } = useAuthStore();

  const [checking, setChecking] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loadingQR, setLoadingQR] = useState(true);

  // 从URL获取token和重定向地址
  const token = searchParams.get('token');
  const redirect = searchParams.get('redirect') || '/';

  // 初始化：保存token
  useEffect(() => {
    if (token && !initialized) {
      setToken(token);
      refreshUser();
      setInitialized(true);
    }
  }, [token, initialized, setToken, refreshUser]);

  // 获取公众号关注二维码
  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { qrCodeUrl: string } }>('/auth/wechat/follow-qrcode');
        if (res.success && res.data.qrCodeUrl) {
          setQrCodeUrl(res.data.qrCodeUrl);
        }
      } catch (error) {
        console.error('获取二维码失败:', error);
      } finally {
        setLoadingQR(false);
      }
    };
    fetchQRCode();
  }, []);

  // 检查是否已关注
  const handleCheckSubscription = async () => {
    if (!token) {
      message.error('登录信息已失效，请重新登录');
      navigate('/login');
      return;
    }

    setChecking(true);
    try {
      const res = await api.get<{ success: boolean; data: { subscribed: boolean } }>('/auth/wechat/subscription');

      if (res.success && res.data.subscribed) {
        message.success('关注成功！');
        // 已关注，跳转到目标页面
        navigate(redirect, { replace: true });
      } else {
        message.info('您还未关注公众号，请先长按识别二维码关注');
      }
    } catch (error: any) {
      console.error('检查关注状态失败:', error);
      message.error(error.message || '检查失败，请重试');
    } finally {
      setChecking(false);
    }
  };

  // 跳过关注，直接进入
  const handleSkip = () => {
    message.info('您可以稍后在个人中心关注公众号');
    navigate(redirect, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* 标题 */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">关注公众号</h1>
            <p className="text-slate-500">关注「创作魔方ContentCube」公众号，获取更好的服务体验</p>
          </div>

          {/* 公众号二维码 */}
          <div className="mb-6">
            <div className="bg-slate-50 rounded-xl p-4 inline-block min-w-[200px] min-h-[200px] flex items-center justify-center">
              {loadingQR ? (
                <Spin size="large" />
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="公众号二维码"
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="text-slate-400 text-sm">
                  <QrCode className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>二维码加载失败</p>
                  <p className="text-xs mt-1">请搜索「创作魔方ContentCube」关注</p>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-2">长按识别二维码关注</p>
          </div>

          {/* 关注福利说明 */}
          <div className="mb-6 text-left bg-emerald-50 rounded-xl p-4">
            <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              关注后可享受
            </h3>
            <ul className="text-sm text-emerald-700 space-y-1.5 pl-6">
              <li>• 第一时间获取新功能通知</li>
              <li>• 专属优惠活动推送</li>
              <li>• 在线客服支持</li>
              <li>• 佣金提现到账通知</li>
            </ul>
          </div>

          {/* 按钮组 */}
          <div className="space-y-3">
            <button
              onClick={handleCheckSubscription}
              disabled={checking}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  检查中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  我已关注
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 px-6 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
            >
              暂时跳过
            </button>
          </div>

          {/* 提示 */}
          <p className="mt-4 text-xs text-slate-400">
            关注后点击「我已关注」按钮继续
          </p>
        </div>
      </div>
    </div>
  );
};

export default FollowGuide;
