import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  User,
  Wallet,
  Copy,
  RefreshCw,
  BookOpen,
  Gift,
  CheckCircle,
  FileText,
  Key,
  ChevronRight,
  Loader2,
  Check,
  Zap,
  Calendar,
  Activity
} from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  balance: number;
  email?: string;
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // 获取用户信息
      const userRes = await api.get<{ success: boolean; data: UserInfo }>('/auth/me');
      if (userRes.success) {
        setUserInfo(userRes.data);
      }

      // 获取API Key信息
      const apiKeyRes = await api.get<{ success: boolean; data: ApiKeyInfo }>('/apikey');
      if (apiKeyRes.success) {
        setApiKeyInfo(apiKeyRes.data);
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

  const featureCards = [
    {
      title: '使用教程',
      description: '查看详细的API使用教程，全面的开发指南',
      icon: BookOpen,
      color: 'sky',
      action: '立即查看',
      onClick: () => navigate('/course')
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
      title: '每日签到',
      description: '每日签到领取奖励，连续签到获得更多',
      icon: CheckCircle,
      color: 'orange',
      action: '立即签到',
      onClick: () => message.info('签到功能开发中')
    },
    {
      title: '开发票',
      description: '在线申请发票服务，支持普通和专用发票',
      icon: FileText,
      color: 'violet',
      action: '立即申请',
      onClick: () => message.info('发票功能开发中')
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
    <div className="space-y-6">
      <div className="flex gap-6">
        {/* 左侧：个人信息卡片 */}
        <div className="w-80 flex-shrink-0 space-y-6">
          {/* 用户信息 */}
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-sky-200 overflow-hidden">
                {userInfo?.avatar_url ? (
                  <img src={userInfo.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userInfo?.nickname || userInfo?.username}
                </h2>
                <p className="text-sm text-slate-500">@{userInfo?.username}</p>
              </div>
            </div>

            {/* 余额 */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm">账户余额</span>
                </div>
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-3">
                ¥{userInfo?.balance?.toFixed(2) || '0.00'}
              </div>
              <button
                onClick={() => navigate('/recharge')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow"
              >
                立即充值
              </button>
            </div>

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
          <h3 className="text-lg font-semibold text-slate-900 mb-4">快捷功能</h3>
          <div className="grid grid-cols-2 gap-4">
            {featureCards.map((card, index) => (
              <div
                key={index}
                onClick={card.onClick}
                className="card p-6 cursor-pointer group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${card.color}-100 text-${card.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  {card.title}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-sm text-slate-500 mb-3">{card.description}</p>
                <span className={`text-sm font-medium text-${card.color}-600`}>
                  {card.action} →
                </span>
              </div>
            ))}
          </div>

          {/* 快速入口 */}
          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-4">常用功能</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '视频提取', path: '/video-extract', color: 'sky' },
              { label: '插件市场', path: '/plugin-market', color: 'emerald' },
              { label: '工作流', path: '/workflow-store', color: 'amber' },
              { label: '充值记录', path: '/recharge/history', color: 'pink' }
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`p-4 rounded-xl bg-${item.color}-50 hover:bg-${item.color}-100 border border-${item.color}-200 text-${item.color}-700 font-medium transition-colors`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">
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
    </div>
  );
};

export default Profile;
