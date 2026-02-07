import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';
import {
  Loader2,
  Smartphone,
  X
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const { message } = App.useApp();

  // 从 location.state 获取跳转参数
  const locationState = location.state as { referralCode?: string; from?: string } | null;

  // 推广码来源优先级：location.state > URL参数 > localStorage
  const getInitialReferralCode = () => {
    // 1. 从其他页面跳转过来的
    if (locationState?.referralCode) return locationState.referralCode;
    // 2. URL 参数（直接访问 /login?ref=XXX）
    const urlRef = searchParams.get('ref');
    if (urlRef) {
      localStorage.setItem('referral_code', urlRef); // 同时保存到 localStorage
      return urlRef;
    }
    // 3. localStorage（从首页或其他页面带 ref 参数访问后保存的）
    return localStorage.getItem('referral_code') || '';
  };

  const [referralCode] = useState(getInitialReferralCode());

  // 短信登录表单
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
  const [wechatQrModalVisible, setWechatQrModalVisible] = useState(false);
  const [wechatQrCodeUrl, setWechatQrCodeUrl] = useState('');
  const [wechatSceneStr, setWechatSceneStr] = useState('');
  const [wechatPolling, setWechatPolling] = useState(false);
  const [wechatAutoTriggered, setWechatAutoTriggered] = useState(false);

  // 协议勾选
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');

  // 检测是否在微信浏览器中
  const isWechatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };

  // 检查短信和微信登录是否可用，并获取协议内容
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        console.log('[登录页] 开始检查登录服务状态...');
        const [smsRes, wechatRes, agreementsRes] = await Promise.all([
          api.get<{ success: boolean; data: { available: boolean } }>('/auth/sms/status').catch(() => null),
          api.get<{ success: boolean; data: { available: boolean } }>('/auth/wechat/available').catch(() => null),
          api.get<{ success: boolean; data: { termsOfService: string; privacyPolicy: string } }>('/system-config/agreements').catch(() => null)
        ]);

        console.log('[登录页] 短信服务状态:', smsRes);
        console.log('[登录页] 微信服务状态:', wechatRes);

        if (smsRes?.success) {
          setSmsAvailable(smsRes.data.available);
        }
        if (wechatRes?.success) {
          setWechatAvailable(wechatRes.data.available);
          console.log('[登录页] 设置 wechatAvailable =', wechatRes.data.available);
        }
        if (agreementsRes?.success) {
          setTermsContent(agreementsRes.data.termsOfService || '');
          setPrivacyContent(agreementsRes.data.privacyPolicy || '');
        }
      } catch (error) {
        console.log('登录服务状态检查失败', error);
      }
    };
    checkLoginStatus();
  }, []);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 用户勾选协议后自动弹出微信二维码
  useEffect(() => {
    // 当用户勾选协议、微信可用、且还没自动触发过时，自动弹出微信二维码
    if (agreedToTerms && wechatAvailable && !wechatAutoTriggered && !wechatQrModalVisible) {
      setWechatAutoTriggered(true);

      // 如果在微信浏览器中，跳转到OAuth授权
      if (isWechatBrowser()) {
        const redirect = locationState?.from || '/';
        window.location.href = `/api/auth/wechat/oauth?redirect=${encodeURIComponent(redirect)}`;
        return;
      }

      // 非微信浏览器，延迟300ms弹出二维码
      setTimeout(async () => {
        setWechatLoading(true);
        try {
          const res = await api.get<{ success: boolean; data: { qrCodeUrl: string; sceneStr: string; expireSeconds: number } }>('/auth/wechat/qrcode');
          if (res.success && res.data.qrCodeUrl) {
            setWechatQrCodeUrl(res.data.qrCodeUrl);
            setWechatSceneStr(res.data.sceneStr);
            setWechatQrModalVisible(true);
            setWechatPolling(true);
          }
        } catch (error) {
          console.log('自动获取微信二维码失败:', error);
        } finally {
          setWechatLoading(false);
        }
      }, 300);
    }
  }, [agreedToTerms, wechatAvailable, wechatAutoTriggered, wechatQrModalVisible]);

  // 发送验证码
  const handleSendCode = async () => {
    // 验证手机号
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

  // 短信登录/注册
  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查是否同意协议
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
      // 构建请求参数（统一入口，未注册自动注册）
      const requestData: { phone: string; code: string; referral_code?: string } = {
        phone,
        code: smsCode
      };

      // 如果有推荐码，传递给后端
      if (referralCode) {
        requestData.referral_code = referralCode;
      }

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
          // 注册成功后清除 localStorage 中的推荐码
          localStorage.removeItem('referral_code');
        } else {
          message.success('登录成功！');
          // 老用户如果带了推荐码，提示推荐码不生效
          if (referralCode && !res.data.user?.referred_by_user_id) {
            setTimeout(() => {
              message.info('推荐码仅对新用户有效，如需绑定推荐人请前往个人中心');
            }, 500);
          }
        }
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from);
      } else {
        message.error(res.error || res.message || '登录失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '登录失败');
    } finally {
      setSmsLoginLoading(false);
    }
  };

  // 微信登录 - 获取二维码或跳转OAuth
  const handleWechatLogin = async () => {
    if (!wechatAvailable) {
      message.warning('微信登录服务暂不可用');
      return;
    }

    // 检查是否同意协议
    if (!agreedToTerms) {
      message.warning('请先阅读并同意服务条款和隐私政策');
      return;
    }

    // 如果在微信浏览器中，跳转到OAuth授权
    if (isWechatBrowser()) {
      const redirect = locationState?.from || '/';
      window.location.href = `/api/auth/wechat/oauth?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    // 非微信浏览器，显示二维码
    setWechatLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string; sceneStr: string; expireSeconds: number } }>('/auth/wechat/qrcode');
      if (res.success && res.data.qrCodeUrl) {
        setWechatQrCodeUrl(res.data.qrCodeUrl);
        setWechatSceneStr(res.data.sceneStr);
        setWechatQrModalVisible(true);
        setWechatPolling(true);
      } else {
        message.error('获取微信登录二维码失败');
      }
    } catch (error) {
      message.error('微信登录失败');
    } finally {
      setWechatLoading(false);
    }
  };

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
            // 登录成功
            setWechatPolling(false);
            setWechatQrModalVisible(false);
            setAuth(res.data.token, res.data.user);
            message.success(res.data.isNewUser ? '微信注册成功！' : '微信登录成功！');
            navigate('/');
          } else if (res.data.status === 'expired') {
            // 二维码过期
            setWechatPolling(false);
            message.warning('二维码已过期，请重新获取');
            setWechatQrModalVisible(false);
          }
          // pending 状态继续轮询
        }
      } catch (error) {
        console.error('轮询微信登录状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [wechatPolling, wechatSceneStr, setAuth, navigate]);

  // 关闭微信登录弹窗
  const handleCloseWechatModal = () => {
    setWechatQrModalVisible(false);
    setWechatPolling(false);
    setWechatQrCodeUrl('');
    setWechatSceneStr('');
  };

  return (
    <div className="h-screen bg-white font-sans text-slate-900 antialiased overflow-hidden">
      <div className="flex w-full h-full">
        {/* 左侧品牌区域 - 使用背景图 */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}login-bg.png`}
            alt="创作魔方"
            className="w-full h-full object-cover"
          />
          {/* 底部版权 - 悬浮在图片上 */}
          <div className="absolute bottom-6 left-0 right-0 text-center text-sm" style={{ color: '#666' }}>
            <p>© 2025 长沙芯跃科技有限公司</p>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">湘ICP备2025140799号</a>
          </div>
        </div>

        {/* 右侧登录表单 - 白色背景 */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white relative">
          {/* 移动端 Logo */}
          <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="创作魔方" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold text-slate-900">创作魔方</span>
          </div>

          <div className="w-full max-w-[400px]">
            {/* 标题 */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">欢迎回来</h1>
              <p className="text-slate-500">请选择登录方式</p>
            </div>

            {/* 短信登录表单 */}
            <form onSubmit={handleSmsLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    手机号
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                        phoneError
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                      placeholder="请输入手机号"
                    />
                    <Smartphone className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-500">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                          smsError
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                        }`}
                        placeholder="请输入6位验证码"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={smsLoading || countdown > 0 || !smsAvailable}
                      className={`px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                        countdown > 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : smsAvailable
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {smsLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : smsAvailable ? (
                        '获取验证码'
                      ) : (
                        '暂不可用'
                      )}
                    </button>
                  </div>
                  {smsError && (
                    <p className="mt-1 text-sm text-red-500">{smsError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={smsLoginLoading}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {smsLoginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    '登录'
                  )}
                </button>

                <p className="text-center text-xs text-slate-400">
                  未注册将自动注册
                </p>
              </form>

            {/* 分割线 */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400">或者通过以下方式登录</span>
              </div>
            </div>

            {/* 微信登录按钮 */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleWechatLogin}
                disabled={wechatLoading || !wechatAvailable}
                className={`flex items-center justify-center gap-2 px-8 py-2.5 border border-slate-200 rounded-xl transition-colors font-medium ${
                  wechatAvailable
                    ? 'hover:bg-slate-50 text-slate-600'
                    : 'opacity-50 cursor-not-allowed text-slate-400'
                }`}
              >
                {wechatLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-[#07C160]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.694 13.908c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.73 0 1.392.567 1.392 1.392 0 .827-.662 1.393-1.392 1.393zm6.658 0c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.732 0 1.393.567 1.393 1.392 0 .827-.66 1.393-1.393 1.393zM12 2C6.477 2 2 6.136 2 11.238c0 2.872 1.417 5.438 3.647 7.116-.16.896-.583 2.502-.667 2.858-.11.458.384.625.668.455.517-.308 3.525-2.228 4.093-2.658.74.205 1.517.316 2.31.316 5.474 0 9.95-4.135 9.95-9.237C22.002 4.965 17.525 2 12 2z"/>
                  </svg>
                )}
                微信登录
              </button>
            </div>

            {/* 协议勾选 - 微信登录下方60px */}
            <div className="mt-[60px] flex items-start justify-center gap-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-sm text-slate-500 cursor-pointer">
                我已阅读并同意
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                  className="text-blue-600 hover:text-blue-700 underline mx-1.5 font-medium"
                >
                  《服务条款》
                </button>
                和
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}
                  className="text-blue-600 hover:text-blue-700 underline mx-1.5 font-medium"
                >
                  《隐私政策》
                </button>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 微信登录二维码弹窗 */}
      {wechatQrModalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseWechatModal}>
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <svg className="w-8 h-8 text-[#07C160]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.694 13.908c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.73 0 1.392.567 1.392 1.392 0 .827-.662 1.393-1.392 1.393zm6.658 0c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.732 0 1.393.567 1.393 1.392 0 .827-.66 1.393-1.393 1.393zM12 2C6.477 2 2 6.136 2 11.238c0 2.872 1.417 5.438 3.647 7.116-.16.896-.583 2.502-.667 2.858-.11.458.384.625.668.455.517-.308 3.525-2.228 4.093-2.658.74.205 1.517.316 2.31.316 5.474 0 9.95-4.135 9.95-9.237C22.002 4.965 17.525 2 12 2z"/>
                </svg>
                <h3 className="text-xl font-bold text-slate-800">微信扫码登录</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">请使用微信扫描二维码关注公众号完成登录</p>

              {/* 二维码 */}
              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-4">
                {wechatQrCodeUrl ? (
                  <img
                    src={wechatQrCodeUrl}
                    alt="微信登录二维码"
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                )}
              </div>

              {/* 状态提示 */}
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                {wechatPolling && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>等待扫码中...</span>
                  </>
                )}
              </div>

              {/* 刷新按钮 */}
              <button
                onClick={handleWechatLogin}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                刷新二维码
              </button>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={handleCloseWechatModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 服务条款弹窗 */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTermsModal(false)}>
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">服务条款</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                {termsContent || '暂无内容'}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                我已阅读
              </button>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 隐私政策弹窗 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPrivacyModal(false)}>
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">隐私政策</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                {privacyContent || '暂无内容'}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                我已阅读
              </button>
            </div>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
