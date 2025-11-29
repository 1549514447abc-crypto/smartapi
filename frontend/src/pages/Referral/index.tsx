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
  TrendingUp,
  Zap,
  Target,
  Rocket,
  Lightbulb,
  Check,
  ChevronRight,
  Sparkles,
  Crown,
  Star
} from 'lucide-react';

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_commission: number;
  pending_commission: number;
  commission_rate: number;
}

const Referral = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
      generateReferralCode();
    }
  }, [user]);

  const generateReferralCode = () => {
    if (user?.id) {
      const code = btoa(`ref_${user.id}`);
      setReferralCode(code);
    }
  };

  const fetchReferralStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: ReferralStats }>('/referral/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/smartapi/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    message.success('推广链接已复制到剪贴板');
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    message.success('推广码已复制到剪贴板');
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const getCommissionRate = () => {
    if (!stats) return 30;
    return stats.commission_rate || 30;
  };

  const getNextTier = () => {
    if (!stats) return { level: '进阶', count: 10, rate: 40 };
    if (stats.total_referrals < 10) return { level: '进阶', count: 10, rate: 40 };
    if (stats.total_referrals < 20) return { level: '高级', count: 20, rate: 50 };
    return null;
  };

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

  const nextTier = getNextTier();
  const currentRate = getCommissionRate();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-200 via-orange-200 to-amber-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-200 to-sky-200 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-50"></div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="tag tag-hot">HOT</span>
            <span className="text-sm text-slate-500">全新升级推广系统</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            0成本0投入，打造长期被动收益！
          </h1>
          <p className="text-lg text-slate-600 mb-2">
            享受 <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">30%-50%</span> 高额返佣，直接到账余额积分
          </p>
          <p className="text-slate-500 mb-6">
            不用你会用只要你会推！别人学技术，你直接卖工具赚积分，打造真正的长期被动收益！
          </p>

          {/* Commission Steps */}
          <div className="flex gap-4">
            {[
              { rate: 30, title: '新手佣金', desc: '立即开始', icon: Star },
              { rate: 40, title: '进阶佣金', desc: '推广10人', icon: TrendingUp },
              { rate: 50, title: '高级佣金', desc: '推广20人', icon: Crown }
            ].map((tier, index) => (
              <div
                key={tier.rate}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  currentRate === tier.rate
                    ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg'
                    : 'border-slate-200 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <tier.icon className={`w-5 h-5 ${currentRate === tier.rate ? 'text-orange-500' : 'text-slate-400'}`} />
                  {currentRate === tier.rate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white">当前</span>
                  )}
                </div>
                <div className={`text-3xl font-bold mb-1 ${currentRate === tier.rate ? 'text-orange-600' : 'text-slate-400'}`}>
                  {tier.rate}%
                </div>
                <div className={`text-sm font-medium ${currentRate === tier.rate ? 'text-slate-900' : 'text-slate-500'}`}>
                  {tier.title}
                </div>
                <div className="text-xs text-slate-400">{tier.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">累计推广</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.total_referrals || 0} <span className="text-sm font-normal text-slate-400">人</span></div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">活跃用户</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.active_referrals || 0} <span className="text-sm font-normal text-slate-400">人</span></div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">累计佣金</div>
          </div>
          <div className="text-2xl font-bold text-orange-600">¥{(stats?.total_commission || 0).toFixed(2)}</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-pink-50 to-orange-50 border-pink-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">当前比例</div>
          </div>
          <div className="text-2xl font-bold text-pink-600">{currentRate}%</div>
          {nextTier && (
            <div className="text-xs text-pink-500 mt-1">
              再推{nextTier.count - (stats?.total_referrals || 0)}人升级
            </div>
          )}
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-500" />
          我的推广链接
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">推广链接</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/smartapi/register?ref=${referralCode}`}
                readOnly
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700"
              />
              <button
                onClick={copyReferralLink}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                  copied === 'link'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-sky-400 to-emerald-400 text-white shadow-lg shadow-sky-200 hover:shadow-xl'
                }`}
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">推广码</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="w-64 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-mono"
              />
              <button
                onClick={copyReferralCode}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
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

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              分享推广链接或推广码给好友，好友注册并充值后，您将自动获得佣金积分！
            </p>
          </div>
        </div>
      </div>

      {/* Commission Tiers */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-orange-500" />
          阶梯式佣金体系
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              rate: 30,
              title: '新手佣金',
              condition: '立即获得',
              features: ['免费获得专属推广链接', '每推广1个用户获30%佣金', '享受用户首次充值30%返佣', '佣金自动转入账户余额', '0成本启动，人人可参与'],
              color: 'sky'
            },
            {
              rate: 40,
              title: '进阶佣金',
              condition: '累计推广10个付费用户',
              features: ['佣金提升至40%', '享受所有新用户40%返佣', '推广数据实时查看', '积分即时到账', '专属推广策略指导'],
              color: 'orange'
            },
            {
              rate: 50,
              title: '高级佣金',
              condition: '累计推广20个付费用户',
              features: ['最高50%佣金率', '享受所有新用户50%返佣', 'VIP推广者专属标识', '月度收益分析报告', '推广策略深度定制'],
              color: 'pink'
            }
          ].map((tier) => (
            <div
              key={tier.rate}
              className={`p-5 rounded-xl border-2 transition-all ${
                currentRate === tier.rate
                  ? `border-${tier.color}-400 bg-gradient-to-br from-${tier.color}-50 to-white shadow-lg`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {currentRate === tier.rate && (
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-medium mb-3">
                  当前等级
                </span>
              )}
              <div className={`text-4xl font-bold mb-2 ${
                currentRate === tier.rate ? `text-${tier.color}-600` : 'text-slate-400'
              }`}>
                {tier.rate}%
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-1">{tier.title}</h4>
              <p className="text-sm text-slate-500 mb-4">达成条件：{tier.condition}</p>
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      currentRate === tier.rate ? 'text-emerald-500' : 'text-slate-400'
                    }`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          为什么选择创作魔方推广
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              icon: Rocket,
              title: '踩在AI风口上赚钱',
              desc: '现在推广=踩在风口上赚钱，错过这波要等下个时代！AI工具市场正在爆发',
              color: 'sky'
            },
            {
              icon: Lightbulb,
              title: '不用你会用，只要你会推',
              desc: '零学习成本，人人都能推！不需要懂技术，会分享就能赚钱',
              color: 'amber'
            },
            {
              icon: Wallet,
              title: '积分到账，即刻可用',
              desc: '佣金自动转为账户余额，可直接用于平台消费，无需提现，免除税务烦恼',
              color: 'emerald'
            },
            {
              icon: Target,
              title: '0成本0投入，上手即赚',
              desc: '适合所有人兼职创业，无需投资无需囤货，分享链接就有收入',
              color: 'pink'
            }
          ].map((benefit, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-${benefit.color}-100 text-${benefit.color}-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                    {benefit.title}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-sm text-slate-500">{benefit.desc}</p>
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
