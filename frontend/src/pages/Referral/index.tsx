import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';
import {
  Users,
  Gift,
  Wallet,
  Copy,
  Zap,
  Target,
  Rocket,
  Lightbulb,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface CommissionStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  availableBalance: number;
  pendingBalance: number; // 待结算余额（15天内）
  totalEarned: number; // 累计获得佣金
  totalWithdrawn: number; // 累计提现佣金
  commissionRate: number;
  commissionRateCourse: number;
  commissionRateMembership: number;
}

interface ReferralInfo {
  referralCode: string;
  shareUrl: string;
}

const Referral = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  // 获取佣金比例（从后端获取，默认10%）
  const courseRate = stats?.commissionRateCourse || 10;
  const membershipRate = stats?.commissionRateMembership || 10;

  // 佣金规则配置
  const COMMISSION_RULES = [
    { type: '课程购买', rate: `${courseRate}%`, enabled: true },
    { type: '会员购买', rate: `${membershipRate}%`, enabled: true },
    { type: '充值金额', rate: '-', enabled: false },
    { type: '购买插件', rate: '-', enabled: false },
  ];

  useEffect(() => {
    if (user) {
      fetchReferralStats();
      fetchReferralCode();
    }
  }, [user]);

  // 监听页面可见性，当用户切换回页面时自动刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchReferralStats();
        fetchReferralCode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const fetchReferralCode = async () => {
    try {
      const response = await api.get<{ success: boolean; data: ReferralInfo }>('/commission/referral-code');
      if (response.success) {
        setReferralInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
    }
  };

  const fetchReferralStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: CommissionStats }>('/commission/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
    }
  };

  const copyReferralLink = () => {
    if (!referralInfo) return;
    navigator.clipboard.writeText(referralInfo.shareUrl);
    message.success('推广链接已复制到剪贴板');
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyReferralCode = () => {
    if (!referralInfo) return;
    navigator.clipboard.writeText(referralInfo.referralCode);
    message.success('推广码已复制到剪贴板');
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  // 预留用于后续升级功能
  // const getCommissionRate = () => {
  //   if (!stats) return 30;
  //   return stats.commission_rate || 30;
  // };

  // const getNextTier = () => {
  //   if (!stats) return { level: '进阶', count: 10, rate: 40 };
  //   if (stats.total_referrals < 10) return { level: '进阶', count: 10, rate: 40 };
  //   if (stats.total_referrals < 20) return { level: '高级', count: 20, rate: 50 };
  //   return null;
  // };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">请先登录</h2>
          <p className="text-slate-500 mb-6">登录后即可查看推广信息</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="card p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-br from-pink-200 via-orange-200 to-amber-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-gradient-to-tr from-emerald-200 to-sky-200 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-50"></div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <span className="tag tag-hot">HOT</span>
            <span className="text-xs sm:text-sm text-slate-500">推广返利计划</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">
            推荐好友购课，赚取赠送金！
          </h1>
          <p className="text-sm sm:text-lg text-slate-600 mb-2">
            好友购买课程/会员，你获得 <span className="text-lg sm:text-2xl font-bold text-orange-500 relative z-10">{courseRate}%</span> 赠送金返利
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
            赠送金可用于调用插件、购买平台产品，邀请越多，赠送金越多！
          </p>

          {/* Commission Rules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {COMMISSION_RULES.map((rule) => (
              <div
                key={rule.type}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                  rule.enabled
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className={`text-xl sm:text-2xl font-bold mb-1 ${rule.enabled ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {rule.rate}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${rule.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                  {rule.type}
                </div>
                <div className={`text-[10px] sm:text-xs mt-1 ${rule.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {rule.enabled ? '返赠送金' : '不返利'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-500">累计推广</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.totalReferrals || 0} <span className="text-xs sm:text-sm font-normal text-slate-400">人</span></div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-500">已购课用户</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.activeReferrals || 0} <span className="text-xs sm:text-sm font-normal text-slate-400">人</span></div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-500">累计赠送金</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600">¥{(stats?.totalCommission || 0).toFixed(2)} </div>
        </div>

        <div className="card p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-500">返利比例</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{courseRate}%</div>
          <div className="text-[10px] sm:text-xs text-emerald-500 mt-1">
            课程{courseRate !== membershipRate ? ` / 会员${membershipRate}%` : '/会员购买'}
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
          我的推广链接
        </h3>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-2">推广链接</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={referralInfo?.shareUrl || ''}
                readOnly
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-700 truncate"
              />
              <button
                onClick={copyReferralLink}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm ${
                  copied === 'link'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-sky-400 to-emerald-400 text-white shadow-lg shadow-sky-200 hover:shadow-xl'
                }`}
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? '已复制' : '复制链接'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-2">推广码</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={referralInfo?.referralCode || ''}
                readOnly
                className="flex-1 sm:flex-none sm:w-64 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-700 font-mono tracking-widest"
              />
              <button
                onClick={copyReferralCode}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm ${
                  copied === 'code'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'code' ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-xs sm:text-sm text-emerald-700 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              分享推广链接给好友，好友购买课程或会员后，您将自动获得{courseRate}%赠送金返利！
            </p>
          </div>
        </div>
      </div>

      {/* 返利规则 */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          赠送金返利规则
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* 返赠送金场景 */}
          <div className="p-4 sm:p-5 rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-slate-900">返赠送金场景</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white">
                <span className="text-sm text-slate-700">好友购买课程</span>
                <span className="text-lg font-bold text-emerald-600">{courseRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white">
                <span className="text-sm text-slate-700">好友购买会员</span>
                <span className="text-lg font-bold text-emerald-600">{membershipRate}%</span>
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-3">
              例：好友购买¥999课程，你获得¥{Math.floor(999 * courseRate / 100)}赠送金
            </p>
          </div>

          {/* 不返利场景 */}
          <div className="p-4 sm:p-5 rounded-xl border-2 border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs">-</span>
              <span className="font-semibold text-slate-500">不返利场景</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
                <span className="text-sm text-slate-400">好友充值余额</span>
                <span className="text-lg font-bold text-slate-300">-</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
                <span className="text-sm text-slate-400">好友购买插件</span>
                <span className="text-lg font-bold text-slate-300">-</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              这些场景暂不参与返利
            </p>
          </div>
        </div>

        {/* 赠送金用途说明 */}
        <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200">
          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            赠送金用途
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-sky-500" />
              调用平台插件抵扣费用
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-sky-500" />
              购买网站产品抵扣费用
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          推广优势
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            {
              icon: Rocket,
              title: 'AI课程正当时',
              desc: '现在推广=踩在风口上赚钱！AI工具市场正在爆发',
              color: 'sky'
            },
            {
              icon: Lightbulb,
              title: '分享即收益',
              desc: '零学习成本，人人都能推！会分享就能赚赠送金',
              color: 'amber'
            },
            {
              icon: Wallet,
              title: '赠送金即刻可用',
              desc: '赠送金自动到账，可直接用于平台消费抵扣',
              color: 'emerald'
            },
            {
              icon: Target,
              title: '0成本0投入',
              desc: '无需投资无需囤货，分享链接就有收益',
              color: 'pink'
            }
          ].map((benefit, idx) => (
            <div key={idx} className="p-3 sm:p-5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${benefit.color}-100 text-${benefit.color}-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 mb-0.5 sm:mb-1 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <span className="truncate">{benefit.title}</span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">{benefit.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Referral;
