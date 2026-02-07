import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { Loader2, X, Smartphone, RefreshCw } from 'lucide-react';
import { useLoginModalStore } from '../../store/useLoginModalStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';

type TabType = 'wechat' | 'phone';

const LoginModal = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isOpen, redirectPath, closeLoginModal } = useLoginModalStore();
  const { setAuth } = useAuthStore();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabType>('wechat');

  // 短信登录
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [smsError, setSmsError] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsLoginLoading, setSmsLoginLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsAvailable, setSmsAvailable] = useState(false);

  // 微信登录
  const [wechatAvailable, setWechatAvailable] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatQrCodeUrl, setWechatQrCodeUrl] = useState('');
  const [wechatSceneStr, setWechatSceneStr] = useState('');
  const [wechatPolling, setWechatPolling] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);

  // 协议
  const [agreedToTerms, setAgreedToTerms] = useState(true); // 默认勾选
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');

  // 推广码
  const referralCode = localStorage.getItem('referral_code') || '';

  // 检测是否在微信浏览器中
  const isWechatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };

  // 检查登录服务状态
  useEffect(() => {
    if (!isOpen) return;

    const checkStatus = async () => {
      try {
        const [smsRes, wechatRes, agreementsRes] = await Promise.all([
          api.get<{ success: boolean; data: { available: boolean } }>('/auth/sms/status').catch(() => null),
          api.get<{ success: boolean; data: { available: boolean } }>('/auth/wechat/available').catch(() => null),
          api.get<{ success: boolean; data: { termsOfService: string; privacyPolicy: string } }>('/system-config/agreements').catch(() => null)
        ]);

        if (smsRes?.success) setSmsAvailable(smsRes.data.available);
        if (wechatRes?.success) setWechatAvailable(wechatRes.data.available);
        if (agreementsRes?.success) {
          setTermsContent(agreementsRes.data.termsOfService || '');
          setPrivacyContent(agreementsRes.data.privacyPolicy || '');
        }
      } catch (error) {
        console.log('登录服务状态检查失败', error);
      }
    };

    checkStatus();
  }, [isOpen]);

  // 获取微信二维码
  const fetchWechatQrCode = useCallback(async () => {
    if (!wechatAvailable) return;

    // 微信浏览器内直接跳转 OAuth
    if (isWechatBrowser()) {
      const redirect = redirectPath || '/';
      window.location.href = `/api/auth/wechat/oauth?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    setWechatLoading(true);
    setQrExpired(false);
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string; sceneStr: string; expireSeconds: number } }>('/auth/wechat/qrcode');
      if (res.success && res.data.qrCodeUrl) {
        setWechatQrCodeUrl(res.data.qrCodeUrl);
        setWechatSceneStr(res.data.sceneStr);
        setWechatPolling(true);
      }
    } catch (error) {
      console.error('获取微信二维码失败:', error);
    } finally {
      setWechatLoading(false);
    }
  }, [wechatAvailable, redirectPath]);

  // 打开弹窗时自动获取微信二维码
  useEffect(() => {
    if (isOpen && activeTab === 'wechat' && wechatAvailable && !wechatQrCodeUrl && !wechatLoading) {
      fetchWechatQrCode();
    }
  }, [isOpen, activeTab, wechatAvailable, wechatQrCodeUrl, wechatLoading, fetchWechatQrCode]);

  // 切换到微信 Tab 时获取二维码
  useEffect(() => {
    if (activeTab === 'wechat' && wechatAvailable && !wechatQrCodeUrl && !wechatLoading && isOpen) {
      fetchWechatQrCode();
    }
  }, [activeTab, wechatAvailable, wechatQrCodeUrl, wechatLoading, isOpen, fetchWechatQrCode]);

  // 微信登录轮询
  useEffect(() => {
    if (!wechatPolling || !wechatSceneStr) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            status: 'pending' | 'expired' | 'confirmed';
            token?: string;
            user?: any;
            isNewUser?: boolean;
          }
        }>(`/auth/wechat/status?sceneStr=${wechatSceneStr}`);

        if (res.success) {
          if (res.data.status === 'confirmed' && res.data.token && res.data.user) {
            setWechatPolling(false);
            setAuth(res.data.token, res.data.user);
            message.success(res.data.isNewUser ? '注册成功，欢迎使用！' : '登录成功！');
            closeLoginModal();
            if (redirectPath) navigate(redirectPath);
          } else if (res.data.status === 'expired') {
            setWechatPolling(false);
            setQrExpired(true);
          }
        }
      } catch (error) {
        console.error('轮询微信登录状态失败:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [wechatPolling, wechatSceneStr, setAuth, closeLoginModal, navigate, redirectPath, message]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 关闭弹窗时重置状态
  const handleClose = () => {
    setWechatPolling(false);
    setWechatQrCodeUrl('');
    setWechatSceneStr('');
    setQrExpired(false);
    setPhone('');
    setSmsCode('');
    setPhoneError('');
    setSmsError('');
    closeLoginModal();
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setPhoneError('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError('手机号格式不正确');
      return;
    }
    setPhoneError('');

    setSmsLoading(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/auth/sms/send', { phone });
      if (res.success) {
        message.success('验证码已发送');
        setCountdown(60);
      } else {
        message.error(res.error || res.message || '发送失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '发送验证码失败');
    } finally {
      setSmsLoading(false);
    }
  };

  // 短信登录
  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      message.warning('请先阅读并同意服务条款和隐私政策');
      return;
    }

    let hasError = false;
    if (!phone) {
      setPhoneError('请输入手机号');
      hasError = true;
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError('手机号格式不正确');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (!smsCode) {
      setSmsError('请输入验证码');
      hasError = true;
    } else if (!/^\d{6}$/.test(smsCode)) {
      setSmsError('验证码为6位数字');
      hasError = true;
    } else {
      setSmsError('');
    }

    if (hasError) return;

    setSmsLoginLoading(true);
    try {
      const requestData: { phone: string; code: string; referral_code?: string } = { phone, code: smsCode };
      if (referralCode) requestData.referral_code = referralCode;

      const res = await api.post<{
        success: boolean;
        data?: { token: string; user: any; isNewUser?: boolean };
        error?: string;
        message?: string;
      }>('/auth/sms/login', requestData);

      if (res.success && res.data) {
        setAuth(res.data.token, res.data.user);
        if (res.data.isNewUser) {
          message.success('注册成功，欢迎使用！');
          localStorage.removeItem('referral_code');
        } else {
          message.success('登录成功！');
        }
        handleClose();
        if (redirectPath) navigate(redirectPath);
      } else {
        message.error(res.error || res.message || '登录失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '登录失败');
    } finally {
      setSmsLoginLoading(false);
    }
  };

  // 刷新二维码
  const handleRefreshQrCode = () => {
    setWechatQrCodeUrl('');
    setWechatSceneStr('');
    setQrExpired(false);
    fetchWechatQrCode();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* 弹窗主体 */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Tab 切换 */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('wechat')}
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors relative ${
                activeTab === 'wechat'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              微信扫码登录
              {activeTab === 'wechat' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors relative ${
                activeTab === 'phone'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              手机号快捷登录
              {activeTab === 'phone' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="p-8">
            <div className="flex gap-8">
              {/* 左侧 - 微信二维码 */}
              <div className={`flex-1 flex flex-col items-center ${activeTab !== 'wechat' ? 'hidden sm:flex' : ''}`}>
                <div className="w-48 h-48 bg-slate-50 rounded-xl border-2 border-slate-100 flex items-center justify-center relative overflow-hidden">
                  {wechatLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : qrExpired ? (
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-2">二维码已过期</p>
                      <button
                        onClick={handleRefreshQrCode}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        点击刷新
                      </button>
                    </div>
                  ) : wechatQrCodeUrl ? (
                    <img src={wechatQrCodeUrl} alt="微信登录二维码" className="w-full h-full object-contain" />
                  ) : !wechatAvailable ? (
                    <p className="text-sm text-slate-400 text-center px-4">微信登录暂不可用</p>
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  )}
                </div>

                {wechatPolling && !qrExpired && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>请使用微信扫描二维码</span>
                  </div>
                )}

                {!wechatPolling && !qrExpired && wechatQrCodeUrl && (
                  <button
                    onClick={handleRefreshQrCode}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    刷新二维码
                  </button>
                )}
              </div>

              {/* 分割线 */}
              <div className={`hidden sm:block w-px bg-slate-100 ${activeTab !== 'wechat' ? '' : ''}`} />

              {/* 右侧 - 手机号登录 */}
              <div className={`flex-1 ${activeTab !== 'phone' ? 'hidden sm:block' : ''}`}>
                <form onSubmit={handleSmsLogin} className="space-y-4">
                  {/* 手机号 */}
                  <div>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm">
                        +86
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          className={`w-full px-4 py-3 bg-white border rounded-r-lg outline-none transition-all text-sm ${
                            phoneError
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }`}
                          placeholder="请输入手机号"
                        />
                        <Smartphone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
                  </div>

                  {/* 验证码 */}
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`flex-1 px-4 py-3 bg-white border rounded-lg outline-none transition-all text-sm ${
                          smsError
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                        placeholder="请输入验证码"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={smsLoading || countdown > 0 || !smsAvailable}
                        className={`px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          countdown > 0 || !smsAvailable
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {smsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : countdown > 0 ? (
                          `${countdown}s`
                        ) : (
                          '发送验证码'
                        )}
                      </button>
                    </div>
                    {smsError && <p className="mt-1 text-xs text-red-500">{smsError}</p>}
                  </div>

                  {/* 登录按钮 */}
                  <button
                    type="submit"
                    disabled={smsLoginLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {smsLoginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '登录'}
                  </button>

                  <p className="text-center text-xs text-slate-400">未注册将自动注册</p>
                </form>
              </div>
            </div>

            {/* 协议勾选 */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-start justify-center gap-2">
              <input
                type="checkbox"
                id="agreeTermsModal"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agreeTermsModal" className="text-xs text-slate-500 cursor-pointer">
                已阅读同意
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                  className="text-blue-600 hover:text-blue-700 mx-1"
                >
                  《服务条款》
                </button>
                和
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}
                  className="text-blue-600 hover:text-blue-700 mx-1"
                >
                  《隐私政策》
                </button>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 服务条款弹窗 */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4" onClick={() => setShowTermsModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">服务条款</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                {termsContent || '暂无内容'}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setShowTermsModal(false)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors">
                我已阅读
              </button>
            </div>
            <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 隐私政策弹窗 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4" onClick={() => setShowPrivacyModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">隐私政策</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                {privacyContent || '暂无内容'}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setShowPrivacyModal(false)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors">
                我已阅读
              </button>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;
