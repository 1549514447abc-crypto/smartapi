import { useState, useEffect } from 'react';
import { Button, Card, message, Statistic, Input } from 'antd';
import { CopyOutlined, GiftOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';
import './Referral.css';

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_commission: number;
  pending_commission: number;
  commission_rate: number;
}

const Referral = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchReferralStats();
      generateReferralCode();
    }
  }, [user]);

  const generateReferralCode = () => {
    // 生成推广码：用户ID的base64编码
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
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    message.success('推广码已复制到剪贴板');
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
      <div className="referral-container">
        <div className="referral-hero">
          <h1>请先登录查看推广信息</h1>
          <Button type="primary" size="large" href="/smartapi/login">
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  const nextTier = getNextTier();

  return (
    <div className="referral-container">
      {/* Hero Section */}
      <div className="referral-hero">
        <h1>0成本0投入，打造长期被动收益！</h1>
        <p className="hero-subtitle">享受30%-50%高额返佣，直接到账余额积分</p>
        <p className="hero-description">
          0成本0投入，不用你会用只要你会推！<br/>
          别人学技术，你直接卖工具赚积分，打造真正的长期被动收益！
        </p>

        <div className="commission-highlight">
          <div className={`commission-step ${getCommissionRate() === 30 ? 'active' : ''}`}>
            <div className="step-number">30%</div>
            <div className="step-title">新手佣金</div>
            <div className="step-desc">立即开始</div>
          </div>
          <div className={`commission-step ${getCommissionRate() === 40 ? 'active' : ''}`}>
            <div className="step-number">40%</div>
            <div className="step-title">进阶佣金</div>
            <div className="step-desc">推广10人达成</div>
          </div>
          <div className={`commission-step ${getCommissionRate() === 50 ? 'active' : ''}`}>
            <div className="step-number">50%</div>
            <div className="step-title">高级佣金</div>
            <div className="step-desc">推广20人达成</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="referral-stats-container">
        <Card className="stat-card">
          <Statistic
            title="累计推广人数"
            value={stats?.total_referrals || 0}
            prefix={<TeamOutlined />}
            suffix="人"
          />
        </Card>
        <Card className="stat-card">
          <Statistic
            title="活跃用户"
            value={stats?.active_referrals || 0}
            prefix={<GiftOutlined />}
            suffix="人"
          />
        </Card>
        <Card className="stat-card">
          <Statistic
            title="累计获得积分"
            value={stats?.total_commission || 0}
            prefix={<WalletOutlined />}
            precision={2}
            suffix="元"
          />
        </Card>
        <Card className="stat-card highlight">
          <Statistic
            title="当前佣金比例"
            value={getCommissionRate()}
            suffix="%"
          />
          {nextTier && (
            <div className="next-tier-hint">
              再推广 {nextTier.count - (stats?.total_referrals || 0)} 人，升级至 {nextTier.level} ({nextTier.rate}%)
            </div>
          )}
        </Card>
      </div>

      {/* Referral Link Section */}
      <Card title="📣 我的推广链接" className="referral-link-card">
        <div className="link-section">
          <div className="link-label">推广链接：</div>
          <Input
            value={`${window.location.origin}/smartapi/register?ref=${referralCode}`}
            readOnly
            addonAfter={
              <Button type="link" icon={<CopyOutlined />} onClick={copyReferralLink}>
                复制
              </Button>
            }
          />
        </div>
        <div className="link-section">
          <div className="link-label">推广码：</div>
          <Input
            value={referralCode}
            readOnly
            style={{ maxWidth: '300px' }}
            addonAfter={
              <Button type="link" icon={<CopyOutlined />} onClick={copyReferralCode}>
                复制
              </Button>
            }
          />
        </div>
        <div className="referral-hint">
          💡 分享推广链接或推广码给好友，好友注册并充值后，您将自动获得佣金积分！
        </div>
      </Card>

      {/* Commission Tiers */}
      <Card title="💰 阶梯式佣金体系" className="tiers-card">
        <div className="commission-tiers">
          <div className="tier-card">
            <div className="tier-percentage">30%</div>
            <h3 className="tier-title">新手佣金</h3>
            <div className="tier-condition">达成条件：立即获得</div>
            <ul className="tier-features">
              <li>免费获得专属推广链接</li>
              <li>每推广1个付费用户获得30%佣金</li>
              <li>享受用户首次充值30%返佣</li>
              <li>佣金自动转入账户余额</li>
              <li>0成本启动，人人可参与</li>
            </ul>
          </div>

          <div className={`tier-card ${getCommissionRate() >= 40 ? 'recommended' : ''}`}>
            {getCommissionRate() >= 40 && <div className="tier-badge">当前等级</div>}
            <div className="tier-percentage">40%</div>
            <h3 className="tier-title">进阶佣金</h3>
            <div className="tier-condition">达成条件：累计推广10个付费用户</div>
            <ul className="tier-features">
              <li>佣金提升至40%，收入大幅增长</li>
              <li>享受所有新推广用户40%返佣</li>
              <li>推广数据实时查看</li>
              <li>积分即时到账，随时可用</li>
              <li>专属推广策略指导</li>
            </ul>
          </div>

          <div className={`tier-card ${getCommissionRate() === 50 ? 'recommended' : ''}`}>
            {getCommissionRate() === 50 && <div className="tier-badge">当前等级</div>}
            <div className="tier-percentage">50%</div>
            <h3 className="tier-title">高级佣金</h3>
            <div className="tier-condition">达成条件：累计推广20个付费用户</div>
            <ul className="tier-features">
              <li>最高50%佣金率，收益最大化</li>
              <li>享受所有新推广用户50%返佣</li>
              <li>VIP推广者专属标识</li>
              <li>月度收益分析报告</li>
              <li>推广策略深度定制服务</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Benefits Section */}
      <Card title="🌟 为什么选择创作魔方推广" className="benefits-card">
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">🚀</div>
            <h4 className="benefit-title">踩在AI风口上赚钱</h4>
            <p className="benefit-desc">现在推广=踩在风口上赚钱，错过这波要等下个时代！AI工具市场正在爆发</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">💡</div>
            <h4 className="benefit-title">不用你会用，只要你会推</h4>
            <p className="benefit-desc">零学习成本，人人都能推！不需要懂技术，会分享就能赚钱</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <h4 className="benefit-title">积分到账，即刻可用</h4>
            <p className="benefit-desc">佣金自动转为账户余额，可直接用于平台消费，无需提现，免除税务烦恼</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">🎯</div>
            <h4 className="benefit-title">0成本0投入，上手即赚</h4>
            <p className="benefit-desc">适合所有人兼职创业，无需投资无需囤货，分享链接就有收入</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Referral;
