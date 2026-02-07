import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import {
  User,
  Wallet,
  Copy,
  RefreshCw,
  BookOpen,
  Gift,
  FileText,
  Key,
  ChevronRight,
  Loader2,
  Check,
  Calendar,
  Activity,
  ShoppingBag,
  Banknote,
  Crown,
  GraduationCap,
  Clock,
  Infinity,
  X,
  Link,
  Unlink,
  Users
} from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  balance: number;
  bonus_balance: number; // 赠金余额
  commission_balance: number; // 可提现余额
  email?: string;
  phone?: string;
  membership_type?: 'none' | 'yearly' | 'course' | null;
  membership_expiry?: string | null;
  is_course_student?: boolean;
  wechat_openid?: string | null;
}

interface ApiKeyInfo {
  api_key: string;
  key_name: string;
  status: string;
  created_at: string;
  last_used_at?: string;
  total_calls: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { refreshUser } = useAuthStore();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 微信绑定相关状态
  const [showBindWechatModal, setShowBindWechatModal] = useState(false);
  const [bindQrCodeUrl, setBindQrCodeUrl] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [unbindLoading, setUnbindLoading] = useState(false);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

  // 手机号绑定相关状态
  const [showBindPhoneModal, setShowBindPhoneModal] = useState(false);
  const [bindPhoneNumber, setBindPhoneNumber] = useState('');
  const [bindPhoneCode, setBindPhoneCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [bindingPhone, setBindingPhone] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 推荐人绑定相关状态
  const [referrerInfo, setReferrerInfo] = useState<{ nickname: string; avatar?: string } | null>(null);
  const [hasReferrer, setHasReferrer] = useState(false);
  const [showBindReferrerModal, setShowBindReferrerModal] = useState(false);
  const [bindReferralCode, setBindReferralCode] = useState('');
  const [bindingReferrer, setBindingReferrer] = useState(false);

  // 课程二维码相关状态
  const [showCourseQrModal, setShowCourseQrModal] = useState(false);
  const [courseQrCodeUrl, setCourseQrCodeUrl] = useState('');
  const [courseQrLoading, setCourseQrLoading] = useState(false);

  // 计算剩余天数
  const calculateDaysLeft = (expiryDate: string | null | undefined): number => {
    if (!expiryDate) return 0;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 检查用户会员状态
  const isCourseStudent = userInfo?.membership_type === 'course' || userInfo?.is_course_student;
  const isYearlyMember = userInfo?.membership_type === 'yearly';
  const yearlyDaysLeft = isYearlyMember ? calculateDaysLeft(userInfo?.membership_expiry) : 0;
  const isYearlyExpired = isYearlyMember && yearlyDaysLeft === 0;

  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  // 页面重新获得焦点时刷新数据（用户从其他标签页切回来）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // 至少间隔30秒才刷新
        if (now - lastFetchRef.current > 30000) {
          fetchUserData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      lastFetchRef.current = Date.now();

      // 获取用户信息
      const userRes = await api.get<{ success: boolean; data: UserInfo }>('/auth/me');
      if (userRes.success) {
        setUserInfo(userRes.data);
        // 同步更新 store，确保顶部导航栏等其他组件也能获取最新数据
        refreshUser();
      }

      // 获取API Key信息
      const apiKeyRes = await api.get<{ success: boolean; data: ApiKeyInfo }>('/apikey');
      if (apiKeyRes.success) {
        setApiKeyInfo(apiKeyRes.data);
      }

      // 获取推荐人信息
      const referrerRes = await api.get<{ success: boolean; data: { hasReferrer: boolean; referrer: { nickname: string; avatar?: string } | null } }>('/commission/referrer');
      if (referrerRes.success) {
        setHasReferrer(referrerRes.data.hasReferrer);
        setReferrerInfo(referrerRes.data.referrer);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch user data:', error);
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKeyInfo?.api_key) {
      navigator.clipboard.writeText(apiKeyInfo.api_key);
      message.success('API密钥已复制到剪贴板');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      setRegenerating(true);
      const res = await api.post<{ success: boolean; data: ApiKeyInfo }>('/apikey/regenerate');
      if (res.success) {
        setApiKeyInfo(res.data);
        message.success('API密钥刷新成功');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '刷新API密钥失败');
    } finally {
      setRegenerating(false);
      setShowConfirmModal(false);
    }
  };

  // 打开绑定微信弹窗
  const handleOpenBindWechat = async () => {
    setShowBindWechatModal(true);
    setBindLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string; sceneStr: string; expireSeconds: number } }>('/auth/bindWechat/qrcode');
      if (res.success) {
        setBindQrCodeUrl(res.data.qrCodeUrl);
        // 开始轮询
        startBindPolling(res.data.sceneStr);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '获取二维码失败');
      setShowBindWechatModal(false);
    } finally {
      setBindLoading(false);
    }
  };

  // 绑定轮询
  const startBindPolling = (sceneStr: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get<{ success: boolean; data: { status: string; message?: string }; message?: string }>(`/auth/bindWechat/status?sceneStr=${sceneStr}`);
        if (res.success) {
          if (res.data.status === 'success') {
            clearInterval(pollInterval);
            message.success({ content: '绑定微信成功', duration: 5 });
            setShowBindWechatModal(false);
            fetchUserData(); // 刷新用户信息
          } else if (res.data.status === 'expired') {
            clearInterval(pollInterval);
            message.warning({ content: '二维码已过期，请重新获取', duration: 5 });
            setShowBindWechatModal(false);
          } else if (res.data.status === 'bindFailed') {
            // 绑定失败（如微信已绑定其他账号）
            clearInterval(pollInterval);
            message.error({ content: res.data.message || '绑定失败', duration: 5 });
            setShowBindWechatModal(false);
          }
        }
      } catch (error: unknown) {
        // 处理网络错误
        const err = error as { response?: { data?: { message?: string } } };
        const errorMsg = err.response?.data?.message;
        if (errorMsg) {
          clearInterval(pollInterval);
          message.error({ content: errorMsg, duration: 5 });
          setShowBindWechatModal(false);
        }
        // 其他网络错误忽略，继续轮询
      }
    }, 2000);

    // 5分钟后自动停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);

    // 关闭弹窗时停止轮询
    return () => clearInterval(pollInterval);
  };

  // 解绑微信
  const handleUnbindWechat = async () => {
    setUnbindLoading(true);
    try {
      const res = await api.post<{ success: boolean; message?: string }>('/auth/unbindWechat');
      if (res.success) {
        message.success('解绑微信成功');
        fetchUserData(); // 刷新用户信息
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '解绑微信失败');
    } finally {
      setUnbindLoading(false);
      setShowUnbindConfirm(false);
    }
  };

  // 打开绑定手机号弹窗
  const handleOpenBindPhone = () => {
    setBindPhoneNumber('');
    setBindPhoneCode('');
    setCountdown(0);
    setShowBindPhoneModal(true);
  };

  // 发送绑定手机验证码
  const handleSendBindCode = async () => {
    if (!bindPhoneNumber) {
      message.warning('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(bindPhoneNumber)) {
      message.warning('请输入正确的手机号');
      return;
    }

    setSendingCode(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/auth/sms/send-bind-code', {
        phone: bindPhoneNumber
      });
      if (res.success) {
        message.success('验证码已发送');
        // 开始60秒倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(res.error || '发送验证码失败');
      }
    } catch (error: unknown) {
      // axios 拦截器已经将 response.data 直接 reject，所以 error 就是返回的数据对象
      const err = error as { error?: string; message?: string };
      message.error(err.error || err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  // 绑定手机号
  const handleBindPhone = async () => {
    if (!bindPhoneNumber || !bindPhoneCode) {
      message.warning('请输入手机号和验证码');
      return;
    }

    setBindingPhone(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/auth/sms/bind-phone', {
        phone: bindPhoneNumber,
        code: bindPhoneCode
      });
      if (res.success) {
        message.success('绑定手机号成功');
        setShowBindPhoneModal(false);
        fetchUserData(); // 刷新用户信息
      } else {
        message.error(res.error || '绑定失败');
      }
    } catch (error: unknown) {
      // axios 拦截器已经将 response.data 直接 reject，所以 error 就是返回的数据对象
      const err = error as { error?: string; message?: string };
      message.error(err.error || err.message || '绑定手机号失败');
    } finally {
      setBindingPhone(false);
    }
  };

  // 打开绑定推荐人弹窗
  const handleOpenBindReferrer = () => {
    setBindReferralCode('');
    setShowBindReferrerModal(true);
  };

  // 获取课程群二维码
  const handleShowCourseQr = async () => {
    setShowCourseQrModal(true);
    setCourseQrLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string }; message?: string }>('/system-config/course-qr-code');
      if (res.success) {
        setCourseQrCodeUrl(res.data.qrCodeUrl);
      } else {
        message.error(res.message || '获取二维码失败');
        setShowCourseQrModal(false);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      message.error(err.response?.data?.message || err.message || '获取二维码失败');
      setShowCourseQrModal(false);
    } finally {
      setCourseQrLoading(false);
    }
  };

  // 绑定推荐人
  const handleBindReferrer = async () => {
    if (!bindReferralCode) {
      message.warning('请输入推荐码');
      return;
    }

    setBindingReferrer(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/commission/bind-referrer', {
        referralCode: bindReferralCode.trim().toUpperCase()
      });
      if (res.success) {
        message.success(res.message || '绑定推荐人成功');
        setShowBindReferrerModal(false);
        fetchUserData(); // 刷新用户信息
      } else {
        message.error(res.error || res.message || '绑定失败');
      }
    } catch (error: unknown) {
      const err = error as { error?: string; message?: string };
      message.error(err.error || err.message || '绑定推荐人失败');
    } finally {
      setBindingReferrer(false);
    }
  };

  const featureCards = [
    {
      title: '交易记录',
      description: '查看充值、消费、订单等全部交易记录',
      icon: Activity,
      color: 'sky',
      action: '立即查看',
      onClick: () => navigate('/transactions')
    },
    {
      title: '我的订单',
      description: '查看课程购买记录和订单详情',
      icon: ShoppingBag,
      color: 'orange',
      action: '立即查看',
      onClick: () => navigate('/orders')
    },
    {
      title: '推广赚钱',
      description: '分享推广，赚取最高50%佣金',
      icon: Gift,
      color: 'emerald',
      action: '立即查看',
      onClick: () => navigate('/referral')
    },
    {
      title: '使用教程',
      description: '查看详细的插件使用教程，全面的开发指南',
      icon: BookOpen,
      color: 'sky',
      action: '立即查看',
      onClick: () => window.open('https://ai.feishu.cn/wiki/GCbNwEAvQizebFkZuEGcs4WTn9e', '_blank')
    },
    {
      title: '开发票',
      description: '在线申请发票服务，支持普通和专用发票',
      icon: FileText,
      color: 'violet',
      action: '立即申请',
      onClick: () => navigate('/invoice')
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* 左侧：个人信息卡片 */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4 lg:space-y-6">
          {/* 用户信息 */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-sky-200 overflow-hidden flex-shrink-0">
                {userInfo?.avatar_url ? (
                  <img src={userInfo.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mb-1">
                  {userInfo?.nickname || userInfo?.username}
                </h2>
                <p className="text-sm text-slate-500 truncate mb-2">@{userInfo?.username}</p>

                {/* 会员标识 - 可以同时显示多个 */}
                <div className="flex flex-wrap gap-2">
                  {isCourseStudent && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      课程学员
                    </span>
                  )}
                  {isYearlyMember && !isYearlyExpired && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      年度会员
                    </span>
                  )}
                  {!isCourseStudent && !isYearlyMember && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 text-slate-600">
                      普通用户
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 余额区域 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 消费余额 */}
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Wallet className="w-4 h-4 text-sky-500" />
                  <span className="text-xs sm:text-sm">消费余额</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                  ¥{(Number(userInfo?.balance || 0) + Number(userInfo?.bonus_balance || 0)).toFixed(2)}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400">
                  {Number(userInfo?.bonus_balance || 0) > 0
                    ? `含赠金 ¥${Number(userInfo?.bonus_balance || 0).toFixed(2)}`
                    : '仅限平台消费'}
                </div>
              </div>
              {/* 可提现余额 */}
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs sm:text-sm">可提现</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600 mb-1">
                  ¥{Number(userInfo?.commission_balance || 0).toFixed(2)}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-500">推广返现</div>
              </div>
            </div>

            {/* 会员状态详情 */}
            {(isCourseStudent || isYearlyMember) && (
              <div className="mb-4 space-y-2">
                {/* 课程会员详情 */}
                {isCourseStudent && (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">课程学员会员</p>
                          <div className="flex items-center gap-1 text-xs text-purple-600">
                            <Infinity className="w-3 h-3" />
                            <span>永久有效</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleShowCourseQr}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      >
                        加入课程群
                      </button>
                    </div>
                  </div>
                )}

                {/* 年度会员详情 */}
                {isYearlyMember && !isYearlyExpired && (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">年度会员</p>
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="w-3 h-3" />
                            <span>
                              {yearlyDaysLeft > 0 ? (
                                yearlyDaysLeft > 30 ? (
                                  `剩余 ${yearlyDaysLeft} 天`
                                ) : (
                                  <span className="font-semibold text-orange-600">
                                    剩余 {yearlyDaysLeft} 天
                                  </span>
                                )
                              ) : (
                                '已过期'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {yearlyDaysLeft <= 30 && yearlyDaysLeft > 0 && (
                        <button
                          onClick={() => navigate('/membership')}
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                        >
                          续费
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 账号绑定状态 */}
            <div className="mb-4 space-y-2">
              {/* 手机号绑定状态 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12" y2="18"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">手机号</p>
                      <p className="text-xs text-slate-500">
                        {userInfo?.phone ? userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定'}
                      </p>
                    </div>
                  </div>
                  {!userInfo?.phone && (
                    <button
                      onClick={handleOpenBindPhone}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                      绑定
                    </button>
                  )}
                </div>
              </div>

              {/* 微信绑定状态 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.492.492 0 0 1 .176-.554C23.244 18.614 24 16.866 24 14.985c0-2.96-2.4-5.59-6.062-6.127zm-3.04 2.607c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.983.97-.983z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">微信账号</p>
                      <p className="text-xs text-slate-500">
                        {userInfo?.wechat_openid ? '已绑定' : '未绑定'}
                      </p>
                    </div>
                  </div>
                  {userInfo?.wechat_openid ? (
                    // 只有绑定了手机号的用户才能解绑微信，否则解绑后无法登录
                    userInfo?.phone ? (
                      <button
                        onClick={() => setShowUnbindConfirm(true)}
                        disabled={unbindLoading}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        解绑
                      </button>
                    ) : null
                  ) : (
                    <button
                      onClick={handleOpenBindWechat}
                      disabled={bindLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <Link className="w-3.5 h-3.5" />
                      绑定
                    </button>
                  )}
                </div>
              </div>

              {/* 推荐人绑定状态 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">推荐人</p>
                      <p className="text-xs text-slate-500">
                        {hasReferrer ? referrerInfo?.nickname || '已绑定' : '未绑定'}
                      </p>
                    </div>
                  </div>
                  {!hasReferrer && (
                    <button
                      onClick={handleOpenBindReferrer}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                      绑定
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 充值按钮 */}
            <button
              onClick={() => navigate('/recharge')}
              className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold text-sm sm:text-base shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow mb-4"
            >
              立即充值
            </button>

            {/* API密钥 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Key className="w-4 h-4 text-orange-500" />
                  API 密钥
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                <p className="text-sm font-mono text-slate-600 truncate mb-2">
                  {apiKeyInfo?.api_key || '暂无密钥'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyApiKey}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={regenerating}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {regenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    刷新
                  </button>
                </div>
              </div>
              {apiKeyInfo && (
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    调用 {apiKeyInfo.total_calls} 次
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(apiKeyInfo.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：功能入口 */}
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">快捷功能</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {featureCards.map((card, index) => (
              <div
                key={index}
                onClick={card.onClick}
                className="card p-4 sm:p-6 cursor-pointer group"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${card.color}-100 text-${card.color}-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  {card.title}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3">{card.description}</p>
                <span className={`text-xs sm:text-sm font-medium text-${card.color}-600`}>
                  {card.action} →
                </span>
              </div>
            ))}
          </div>

          {/* 快速入口 */}
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-4 sm:mt-6 mb-3 sm:mb-4">常用功能</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {[
              { label: '交易记录', path: '/transactions', color: 'sky' },
              { label: '视频提取', path: '/video-extract', color: 'violet' },
              { label: '工作流', path: '/workflow-store', color: 'amber' },
              { label: '充值中心', path: '/recharge', color: 'pink' }
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`p-3 sm:p-4 rounded-xl bg-${item.color}-50 hover:bg-${item.color}-100 border border-${item.color}-200 text-${item.color}-700 font-medium text-sm sm:text-base transition-colors`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">确认刷新API密钥？</h3>
              <p className="text-sm text-slate-500 mb-6">
                刷新后，旧的API密钥将立即失效，请确保已更新所有使用该密钥的应用。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleRegenerateApiKey}
                  disabled={regenerating}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {regenerating ? '刷新中...' : '确认刷新'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 绑定微信弹窗 */}
      {showBindWechatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">绑定微信</h3>
                <button
                  onClick={() => setShowBindWechatModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="text-center">
                {bindLoading ? (
                  <div className="py-12">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">正在获取二维码...</p>
                  </div>
                ) : bindQrCodeUrl ? (
                  <>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block mb-4">
                      <img
                        src={bindQrCodeUrl}
                        alt="绑定微信二维码"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="text-sm text-slate-600 mb-2">请使用微信扫描二维码</p>
                    <p className="text-xs text-slate-400">二维码有效期5分钟</p>
                  </>
                ) : (
                  <div className="py-12">
                    <p className="text-sm text-red-500">获取二维码失败，请重试</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 解绑微信确认弹窗 */}
      {showUnbindConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">确认解绑微信？</h3>
              <p className="text-sm text-slate-500 mb-6">
                解绑后将无法使用微信登录此账号。如需重新绑定，需要再次扫码。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnbindConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUnbindWechat}
                  disabled={unbindLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-medium shadow-lg shadow-red-200 hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {unbindLoading ? '解绑中...' : '确认解绑'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 绑定手机号弹窗 */}
      {showBindPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">绑定手机号</h3>
                <button
                  onClick={() => setShowBindPhoneModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                绑定手机号后，您可以使用手机号登录账号
              </p>
              <div className="space-y-4">
                {/* 手机号输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
                  <input
                    type="tel"
                    value={bindPhoneNumber}
                    onChange={(e) => setBindPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                  />
                </div>
                {/* 验证码输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bindPhoneCode}
                      onChange={(e) => setBindPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="请输入验证码"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                    />
                    <button
                      onClick={handleSendBindCode}
                      disabled={sendingCode || countdown > 0}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBindPhoneModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBindPhone}
                  disabled={bindingPhone || !bindPhoneNumber || !bindPhoneCode}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-medium shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {bindingPhone ? '绑定中...' : '确认绑定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 绑定推荐人弹窗 */}
      {showBindReferrerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">绑定推荐人</h3>
                <button
                  onClick={() => setShowBindReferrerModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                输入推荐人的推荐码完成绑定。绑定后您的消费将为推荐人带来收益。
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700">
                  注意：仅支持注册7天内且未消费的用户绑定推荐人，绑定后无法更改。
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">推荐码</label>
                <input
                  type="text"
                  value={bindReferralCode}
                  onChange={(e) => setBindReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="请输入6位推荐码"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-center text-lg font-mono tracking-widest"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBindReferrerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBindReferrer}
                  disabled={bindingReferrer || bindReferralCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-shadow disabled:opacity-50"
                >
                  {bindingReferrer ? '绑定中...' : '确认绑定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 课程群二维码弹窗 */}
      {showCourseQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">加入课程学习群</h3>
                <button
                  onClick={() => setShowCourseQrModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="text-center">
                {courseQrLoading ? (
                  <div className="py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">正在获取二维码...</p>
                  </div>
                ) : courseQrCodeUrl ? (
                  <>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block mb-4">
                      <img
                        src={courseQrCodeUrl}
                        alt="课程群二维码"
                        className="w-56 h-56 object-contain"
                      />
                    </div>
                    <p className="text-sm text-slate-600 mb-2">扫描二维码加入课程学习群</p>
                    <p className="text-xs text-slate-400">与其他学员交流学习心得</p>
                  </>
                ) : (
                  <div className="py-12">
                    <p className="text-sm text-red-500">获取二维码失败，请稍后重试</p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowCourseQrModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
