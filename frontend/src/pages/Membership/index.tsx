import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import PaymentModal from '../../components/PaymentModal';
import { api } from '../../api/request';
import {
  Crown,
  Check,
  Zap,
  Download,
  FileText,
  Sparkles,
  Shield,
  Clock,
  GraduationCap,
  Infinity,
  ArrowUp,
  Loader2
} from 'lucide-react';

const Membership = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuthStore();
  const [yearlyPaymentVisible, setYearlyPaymentVisible] = useState(false);
  const [coursePaymentVisible, setCoursePaymentVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [prices, setPrices] = useState({
    yearlyMembershipPrice: 299,
    coursePrice: 799
  });
  const [upgradePrice, setUpgradePrice] = useState<number | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // 页面加载时刷新用户信息，确保会员状态是最新的
  useEffect(() => {
    if (isAuthenticated) {
      lastRefreshRef.current = Date.now();
      refreshUser();
    }
  }, []);

  // 页面重新获得焦点时刷新用户数据（用户从其他标签页切回来）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        const now = Date.now();
        // 至少间隔30秒才刷新
        if (now - lastRefreshRef.current > 30000) {
          lastRefreshRef.current = now;
          refreshUser();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refreshUser]);

  // 获取价格配置
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { yearlyMembershipPrice: number; coursePrice: number } }>('/system-config/prices');
        if (res.success) {
          setPrices({
            yearlyMembershipPrice: res.data.yearlyMembershipPrice || 299,
            coursePrice: res.data.coursePrice || 799
          });
        }
      } catch (error) {
        console.error('获取价格配置失败:', error);
      }
    };
    fetchPrices();
  }, []);

  // 获取升级价格
  useEffect(() => {
    const fetchUpgradePrice = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { upgradePrice: number } }>('/payment/upgrade-price');
        if (res.success) {
          setUpgradePrice(res.data.upgradePrice);
        }
      } catch (error) {
        console.error('获取升级价格失败:', error);
      }
    };
    fetchUpgradePrice();
  }, []);

  // 检查用户会员状态
  const isCourseStudent = user?.membership_type === 'course' || user?.is_course_student;
  const isYearlyMember = user?.membership_type === 'yearly';
  const membershipExpiry = user?.membership_expiry ? new Date(user.membership_expiry) : null;
  const isYearlyExpired = membershipExpiry ? membershipExpiry < new Date() : true;

  // 处理年度会员购买
  const handleYearlyPurchase = () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/membership' } });
      return;
    }

    if (isYearlyMember && !isYearlyExpired) {
      message.info('您已经是年度会员了');
      return;
    }

    setYearlyPaymentVisible(true);
  };

  // 处理课程购买
  const handleCoursePurchase = () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/membership' } });
      return;
    }

    if (isCourseStudent) {
      message.info('您已经购买过课程了');
      return;
    }

    setCoursePaymentVisible(true);
  };

  const handleYearlyPaymentSuccess = (_orderNo?: string) => {
    message.success('恭喜您成为年度会员！');
    setYearlyPaymentVisible(false);
    window.location.reload();
  };

  const handleCoursePaymentSuccess = (_orderNo?: string) => {
    message.success('恭喜您成功购买课程！');
    setCoursePaymentVisible(false);
    window.location.reload();
  };

  // 处理会员升级
  const handleUpgrade = () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/membership' } });
      return;
    }
    setUpgradeModalVisible(true);
  };

  // 确认升级
  const confirmUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; data?: { orderNo: string } }>('/payment/upgrade-to-course');
      if (res.success) {
        message.success('升级成功，您已成为课程会员！');
        setUpgradeModalVisible(false);
        window.location.reload();
      } else {
        message.error(res.message || '升级失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '升级失败，请稍后重试');
    } finally {
      setUpgrading(false);
    }
  };

  // 检查是否可以升级（是年度会员且未过期，且不是课程会员）
  const canUpgrade = isYearlyMember && !isYearlyExpired && !isCourseStudent;

  return (
    <div className="space-y-6">
      {/* 顶部标题区 */}
      <div className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-200 to-pink-200 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-50"></div>

        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-purple-100 text-slate-700 text-sm font-bold mb-4">
            <Crown className="w-4 h-4" />
            会员套餐
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            选择适合您的会员套餐
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            年度会员或课程会员，两种方式解锁全部创作资源
          </p>
        </div>
      </div>

      {/* 两个会员卡片并排 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 年度会员卡片 */}
        <div className="card p-6 sm:p-8 border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
          <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">年度会员</h2>
                <p className="text-sm text-slate-500">一年期限 · 全站资源</p>
              </div>
            </div>

            {/* 权益列表 */}
            <div className="space-y-2.5 mb-6 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">下载全站工作流</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">下载全站提示词模板</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">专属会员标识</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">视频提取折扣价</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">期内新增资源免费</span>
              </div>
            </div>

            {/* 价格和按钮 */}
            <div className="text-center">
              <div className="mb-4">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">¥{prices.yearlyMembershipPrice}</span>
                  <span className="text-lg text-slate-400 mb-2">/年</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">平均每天不到 {(prices.yearlyMembershipPrice / 365).toFixed(2)} 元</p>
              </div>

              <button
                onClick={handleYearlyPurchase}
                disabled={isYearlyMember && !isYearlyExpired}
                className={`w-full px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  isYearlyMember && !isYearlyExpired
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isYearlyMember && !isYearlyExpired ? (
                  <>
                    <Check className="w-5 h-5" />
                    您已是会员
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    立即开通
                  </>
                )}
              </button>

              {/* 年度会员状态提示 */}
              {isYearlyMember && !isYearlyExpired && membershipExpiry && (
                <div className="mt-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-amber-900">有效期至</p>
                      <p className="text-xs text-amber-600">{membershipExpiry.toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 升级入口 - 仅年度会员且非课程会员显示 */}
              {canUpgrade && upgradePrice !== null && (
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <button
                    onClick={handleUpgrade}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUp className="w-5 h-5" />
                    补差价 ¥{upgradePrice} 升级为课程会员
                  </button>
                  <p className="text-xs text-amber-600 mt-2">升级后享有永久会员权限 + 完整课程学习</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 课程会员卡片 */}
        <div className="card p-6 sm:p-8 border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">
              超值推荐
            </span>
          </div>

          <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">课程会员</h2>
                <p className="text-sm text-slate-500">永久权限 · 课程学习</p>
              </div>
            </div>

            {/* 权益列表 */}
            <div className="space-y-2.5 mb-6 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700 font-semibold">包含完整课程学习内容</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Infinity className="w-3 h-3" />
                </div>
                <span className="text-slate-700 font-semibold">永久会员权限</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">下载全站工作流</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">下载全站提示词模板</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-slate-700">所有年度会员权益</span>
              </div>
            </div>

            {/* 价格和按钮 */}
            <div className="text-center">
              <div className="mb-4">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">¥{prices.coursePrice}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">一次购买，永久享有</p>
              </div>

              <button
                onClick={handleCoursePurchase}
                disabled={isCourseStudent}
                className={`w-full px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  isCourseStudent
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isCourseStudent ? (
                  <>
                    <Check className="w-5 h-5" />
                    已购买
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    立即购买
                  </>
                )}
              </button>

              {/* 课程会员状态提示 */}
              {isCourseStudent && (
                <div className="mt-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 border border-purple-300">
                    <Infinity className="w-4 h-4 text-purple-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-purple-900">课程学员会员</p>
                      <p className="text-xs text-purple-600">永久会员权限</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 会员权益详情 */}
      <div className="card p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          会员权益详情
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">工作流下载</h4>
            <p className="text-sm text-slate-500">
              全平台工作流免费下载，Coze、Dify、N8N、ComfyUI 等
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">提示词模板</h4>
            <p className="text-sm text-slate-500">
              100+ 精选提示词模板，覆盖各种创作场景
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">专属折扣</h4>
            <p className="text-sm text-slate-500">
              视频提取等功能享受会员专属折扣价格
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">持续更新</h4>
            <p className="text-sm text-slate-500">
              会员期内所有新增资源免费获取
            </p>
          </div>
        </div>
      </div>

      {/* 会员对比 */}
      <div className="card p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          会员对比
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 年度会员详情 */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">年度会员</h4>
                <p className="text-xs text-slate-500">¥{prices.yearlyMembershipPrice}/年</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">有效期：365天</p>
                  <p className="text-xs text-slate-600">从购买之日起计算，到期后需续费</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">适合人群</p>
                  <p className="text-xs text-slate-600">需要长期使用，但不需要课程学习的用户</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">权益范围</p>
                  <p className="text-xs text-slate-600">全站资源下载、会员标识、折扣价格</p>
                </div>
              </div>
            </div>
          </div>

          {/* 课程会员详情 */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">课程会员</h4>
                <p className="text-xs text-slate-500">¥{prices.coursePrice} 一次性</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Infinity className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">有效期：永久</p>
                  <p className="text-xs text-slate-600">一次购买，终身享有会员权益</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">适合人群</p>
                  <p className="text-xs text-slate-600">希望系统学习课程，并获得永久会员的用户</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">权益范围</p>
                  <p className="text-xs text-slate-600">全站资源下载 + 完整课程学习 + 永久会员</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 常见问题 */}
      <div className="card p-6 sm:p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          常见问题
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50">
            <h4 className="font-semibold text-slate-900 mb-2">年度会员和课程会员有什么区别？</h4>
            <p className="text-sm text-slate-600">
              年度会员（¥{prices.yearlyMembershipPrice}）有效期为365天，到期后需要续费；课程会员（¥{prices.coursePrice}）包含完整课程学习内容，且会员权益为永久有效，无需续费。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <h4 className="font-semibold text-slate-900 mb-2">购买课程会员包含哪些内容？</h4>
            <p className="text-sm text-slate-600">
              购买课程会员（¥{prices.coursePrice}）可获得：1）完整的AI创作实战课程学习内容；2）永久会员权益，包括全站工作流和提示词下载、会员专属折扣等。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <h4 className="font-semibold text-slate-900 mb-2">会员可以下载哪些资源？</h4>
            <p className="text-sm text-slate-600">
              所有会员（年度会员和课程会员）均可免费下载全站所有工作流和提示词资源，包括Coze、Dify、N8N、ComfyUI等各平台资源，不区分平台类型。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <h4 className="font-semibold text-slate-900 mb-2">年度会员可以升级为课程会员吗？</h4>
            <p className="text-sm text-slate-600">
              可以。如果您是年度会员（未过期），可以通过补差价（课程价格 - 年度会员价格 = ¥{prices.coursePrice - prices.yearlyMembershipPrice}）升级为课程会员，升级后享有永久会员权限和完整课程学习内容。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <h4 className="font-semibold text-slate-900 mb-2">如何开具发票？</h4>
            <p className="text-sm text-slate-600">
              购买后可在个人中心的"发票管理"中申请开票，我们会在7个工作日内将电子发票发送到您的邮箱。
            </p>
          </div>
        </div>
      </div>

      {/* 年度会员支付弹窗 */}
      <PaymentModal
        visible={yearlyPaymentVisible}
        onClose={() => setYearlyPaymentVisible(false)}
        onSuccess={handleYearlyPaymentSuccess}
        productType="membership"
        productName="年度会员"
        productPrice={prices.yearlyMembershipPrice}
        productDescription="有效期一年，全站工作流和提示词免费下载"
      />

      {/* 课程会员支付弹窗 */}
      <PaymentModal
        visible={coursePaymentVisible}
        onClose={() => setCoursePaymentVisible(false)}
        onSuccess={handleCoursePaymentSuccess}
        productType="course"
        productName="AI创作实战课程"
        productPrice={prices.coursePrice}
        productDescription="包含完整课程学习 + 永久会员权益"
      />

      {/* 升级确认弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-purple-500" />
            <span>升级为课程会员</span>
          </div>
        }
        open={upgradeModalVisible}
        onCancel={() => setUpgradeModalVisible(false)}
        footer={null}
        centered
      >
        <div className="py-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 mb-4">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">升级需支付差价</p>
              <p className="text-3xl font-bold text-purple-600">¥{upgradePrice}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">当前余额</span>
              <span className="font-semibold text-slate-900">
                ¥{(Number(user?.balance || 0) + Number(user?.bonus_balance || 0)).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">升级费用</span>
              <span className="font-semibold text-purple-600">-¥{upgradePrice}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">升级后余额</span>
              <span className="font-semibold text-slate-900">
                ¥{Math.max(0, (Number(user?.balance || 0) + Number(user?.bonus_balance || 0)) - (upgradePrice || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-6">
            <p className="text-sm text-emerald-700 font-medium mb-1">升级后您将获得：</p>
            <ul className="text-sm text-emerald-600 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                永久会员权限（无需续费）
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                完整课程学习内容
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                所有年度会员权益
              </li>
            </ul>
          </div>

          {(Number(user?.balance || 0) + Number(user?.bonus_balance || 0)) < (upgradePrice || 0) && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
              <p className="text-sm text-red-600">
                余额不足，请先 <a href="/recharge" className="text-red-700 font-semibold underline">充值</a>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setUpgradeModalVisible(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmUpgrade}
              disabled={upgrading || (Number(user?.balance || 0) + Number(user?.bonus_balance || 0)) < (upgradePrice || 0)}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                upgrading || (Number(user?.balance || 0) + Number(user?.bonus_balance || 0)) < (upgradePrice || 0)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
              }`}
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  升级中...
                </>
              ) : (
                <>
                  <ArrowUp className="w-5 h-5" />
                  确认升级
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Membership;
