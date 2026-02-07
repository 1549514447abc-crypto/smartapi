import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, InputNumber, Table, Tag, Spin, App } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';
import {
  Users,
  Gift,
  Wallet,
  Copy,
  Check,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  X
} from 'lucide-react';

interface CommissionStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  availableBalance: number;
  pendingBalance: number; // 待结算余额
  totalEarned: number; // 累计获得佣金
  totalWithdrawn: number; // 累计提现佣金
  commissionRateCourse?: number;
  commissionRateMembership?: number;
  settleMinutes?: number; // 结算周期（分钟）
}

interface ReferralInfo {
  referralCode: string;
  shareUrl: string;
}

interface WithdrawalConfig {
  minWithdrawalAmount: number;
  maxDailyWithdrawal: number;
  maxSingleTransfer: number;
}

interface WithdrawalRecord {
  id: number;
  amount: number;
  status: string;
  rejectReason?: string;
  successAmount?: number;
  failAmount?: number;
  createdAt: string;
  reviewedAt?: string;
  packageInfo?: string; // 用于调起用户确认收款
  transferCreatedAt?: string; // 转账创建时间，用于计算过期倒计时
}

// 计算剩余时间（24小时过期）
const calculateRemainingTime = (transferCreatedAt: string): { hours: number; minutes: number; seconds: number; expired: boolean; totalSeconds: number } => {
  const createdTime = new Date(transferCreatedAt).getTime();
  const expireTime = createdTime + 24 * 60 * 60 * 1000; // 24小时后过期
  const now = Date.now();
  const remaining = expireTime - now;

  if (remaining <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, expired: false, totalSeconds };
};

// 格式化倒计时显示
const formatCountdown = (time: { hours: number; minutes: number; seconds: number; expired: boolean }): string => {
  if (time.expired) return '已过期';
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
};

const Commission = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfig | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [wechatConfig, setWechatConfig] = useState<{ mchId: string; appId: string } | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState<number | null>(null);
  const [, setCountdownTick] = useState(0); // 用于触发倒计时更新

  // 绑定微信相关状态
  const [showBindWechatModal, setShowBindWechatModal] = useState(false);
  const [bindQrCodeUrl, setBindQrCodeUrl] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindPollingTimer, setBindPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [bindError, setBindError] = useState<string | null>(null); // 绑定错误信息

  // 倒计时定时器
  useEffect(() => {
    // 检查是否有需要倒计时的记录
    const hasPendingTransfer = withdrawals.some(w => w.status === 'processing' && w.packageInfo && w.transferCreatedAt);
    if (!hasPendingTransfer) return;

    const timer = setInterval(() => {
      setCountdownTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [withdrawals]);

  // 检测是否在微信浏览器中
  const isWechatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };

  // 调起微信确认收款页面
  const handleConfirmReceipt = async (record: WithdrawalRecord) => {
    console.log('[确认收款] 点击按钮，record:', record);
    console.log('[确认收款] packageInfo:', record.packageInfo);

    if (!record.packageInfo) {
      console.log('[确认收款] packageInfo为空');
      message.error('无法获取收款信息');
      return;
    }

    console.log('[确认收款] 检查是否在微信浏览器中...');
    console.log('[确认收款] userAgent:', navigator.userAgent);
    console.log('[确认收款] isWechatBrowser:', isWechatBrowser());

    if (!isWechatBrowser()) {
      console.log('[确认收款] 不在微信浏览器中，显示提示弹窗');
      modal.info({
        title: '请在微信中操作',
        content: (
          <div>
            <p>确认收款需要在微信中完成，请按以下步骤操作：</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>复制当前页面链接</li>
              <li>在微信中打开链接</li>
              <li>点击"确认收款"按钮</li>
            </ol>
          </div>
        ),
        okText: '我知道了'
      });
      return;
    }

    console.log('[确认收款] 在微信浏览器中，准备调用JSAPI');
    setConfirmingReceipt(record.id);

    try {
      // 调用微信JSAPI - 商家转账确认收款使用 requestMerchantTransfer
      console.log('[确认收款] 检查WeixinJSBridge:', typeof (window as any).WeixinJSBridge);

      const invokeConfirmReceipt = () => {
        console.log('[确认收款] 调用requestMerchantTransfer');
        console.log('[确认收款] mchId:', wechatConfig?.mchId);
        console.log('[确认收款] appId:', wechatConfig?.appId);
        console.log('[确认收款] package:', record.packageInfo);

        if (!wechatConfig?.mchId || !wechatConfig?.appId) {
          message.error('微信配置信息缺失');
          setConfirmingReceipt(null);
          return;
        }

        (window as any).WeixinJSBridge.invoke(
          'requestMerchantTransfer',
          {
            mchId: wechatConfig.mchId,
            appId: wechatConfig.appId,
            package: record.packageInfo
          },
          async (res: any) => {
            console.log('[确认收款] JSAPI回调:', res);
            setConfirmingReceipt(null);
            if (res.err_msg === 'requestMerchantTransfer:ok') {
              message.success('确认收款成功，正在更新状态...');
              // 调用后端刷新状态接口
              try {
                await api.post(`/commission/withdrawals/${record.id}/refresh`);
                console.log('[确认收款] 状态刷新成功');
              } catch (refreshError) {
                console.error('[确认收款] 刷新状态失败:', refreshError);
              }
              loadData(); // 刷新数据
            } else if (res.err_msg === 'requestMerchantTransfer:cancel') {
              message.info('已取消确认收款');
            } else {
              message.error('确认收款失败：' + (res.err_msg || '未知错误'));
            }
          }
        );
      };

      if (typeof (window as any).WeixinJSBridge !== 'undefined') {
        console.log('[确认收款] WeixinJSBridge存在');
        invokeConfirmReceipt();
      } else {
        // WeixinJSBridge 未就绪，等待ready事件
        console.log('[确认收款] 等待WeixinJSBridge就绪...');
        document.addEventListener('WeixinJSBridgeReady', invokeConfirmReceipt, false);
      }
    } catch (error: any) {
      console.error('[确认收款] 异常:', error);
      setConfirmingReceipt(null);
      message.error('调起收款页面失败：' + (error.message || '未知错误'));
    }
  };

  // 获取佣金比例（从后端获取，默认10%）
  const courseRate = stats?.commissionRateCourse || 10;
  const membershipRate = stats?.commissionRateMembership || 10;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // 监听页面可见性，当用户切换回页面时自动刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, codeRes, configRes, withdrawalsRes] = await Promise.all([
        api.get<{ success: boolean; data: CommissionStats }>('/commission/stats'),
        api.get<{ success: boolean; data: ReferralInfo }>('/commission/referral-code'),
        api.get<{ success: boolean; data: WithdrawalConfig }>('/commission/withdrawal-config'),
        api.get<{ success: boolean; data: { list: WithdrawalRecord[]; wechatConfig?: { mchId: string; appId: string } } }>('/commission/withdrawals')
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (codeRes.success) setReferralInfo(codeRes.data);
      if (configRes.success) setWithdrawalConfig(configRes.data);
      if (withdrawalsRes.success) {
        setWithdrawals(withdrawalsRes.data.list);
        if (withdrawalsRes.data.wechatConfig) {
          setWechatConfig(withdrawalsRes.data.wechatConfig);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!referralInfo) return;
    navigator.clipboard.writeText(referralInfo.shareUrl);
    message.success('推广链接已复制');
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyCode = () => {
    if (!referralInfo) return;
    navigator.clipboard.writeText(referralInfo.referralCode);
    message.success('推荐码已复制');
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  // 打开绑定微信弹窗
  const handleOpenBindWechat = async () => {
    setShowBindWechatModal(true);
    setBindLoading(true);
    setBindError(null); // 清除之前的错误
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string; sceneStr: string; expireSeconds: number } }>('/auth/bindWechat/qrcode');
      if (res.success) {
        setBindQrCodeUrl(res.data.qrCodeUrl);
        // 开始轮询
        startBindPolling(res.data.sceneStr);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取二维码失败');
      setShowBindWechatModal(false);
    } finally {
      setBindLoading(false);
    }
  };

  // 绑定轮询
  const startBindPolling = (sceneStr: string) => {
    // 清除之前的定时器
    if (bindPollingTimer) {
      clearInterval(bindPollingTimer);
    }

    const timer = setInterval(async () => {
      try {
        const res = await api.get<{ success: boolean; data: { status: string; message?: string } }>(`/auth/bindWechat/status?sceneStr=${sceneStr}`);
        if (res.success) {
          if (res.data.status === 'success') {
            clearInterval(timer);
            setBindPollingTimer(null);
            message.success('绑定微信成功，现在可以申请提现了');
            setShowBindWechatModal(false);
            // 刷新用户信息
            refreshUser();
          } else if (res.data.status === 'expired') {
            clearInterval(timer);
            setBindPollingTimer(null);
            message.warning('二维码已过期，请重新获取');
            setShowBindWechatModal(false);
          } else if (res.data.status === 'bindFailed') {
            clearInterval(timer);
            setBindPollingTimer(null);
            // 显示错误在弹窗内，不关闭弹窗
            setBindError(res.data.message || '绑定失败');
            setBindQrCodeUrl(''); // 清除二维码
          }
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.message;
        if (errorMsg) {
          clearInterval(timer);
          setBindPollingTimer(null);
          message.error(errorMsg);
          setShowBindWechatModal(false);
        }
      }
    }, 2000);

    setBindPollingTimer(timer);

    // 5分钟后自动停止轮询
    setTimeout(() => {
      clearInterval(timer);
      setBindPollingTimer(null);
    }, 5 * 60 * 1000);
  };

  // 关闭绑定弹窗
  const handleCloseBindWechat = () => {
    if (bindPollingTimer) {
      clearInterval(bindPollingTimer);
      setBindPollingTimer(null);
    }
    setShowBindWechatModal(false);
    setBindQrCodeUrl('');
    setBindError(null);
  };

  const handleWithdraw = async () => {
    const minAmount = withdrawalConfig?.minWithdrawalAmount || 10;
    const maxAmount = withdrawalConfig?.maxDailyWithdrawal || 2000;
    const availableBalance = stats?.availableBalance || 0;

    if (!withdrawAmount || withdrawAmount <= 0) {
      message.error('请输入提现金额');
      return;
    }

    if (withdrawAmount < minAmount) {
      message.error(`最低提现金额为 ¥${minAmount}`);
      return;
    }

    if (withdrawAmount > availableBalance) {
      message.error('提现金额不能超过可用余额');
      return;
    }

    if (withdrawAmount > maxAmount) {
      message.error(`单日最高提现金额为 ¥${maxAmount}`);
      return;
    }

    if (!user?.wechat_openid) {
      // 弹出绑定微信窗口
      setWithdrawModalVisible(false);
      handleOpenBindWechat();
      return;
    }

    setWithdrawing(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/commission/withdraw', {
        amount: withdrawAmount
      });
      if (res.success) {
        message.success('提现申请已提交');
        setWithdrawModalVisible(false);
        setWithdrawAmount(0);
        loadData();
      } else {
        message.error(res.message || '提现失败');
      }
    } catch (error: any) {
      message.error(error.message || '提现失败');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: { color: 'orange', icon: <Clock className="w-3 h-3" />, text: '待审核' },
      approved: { color: 'blue', icon: <CheckCircle className="w-3 h-3" />, text: '待转账' },
      processing: { color: 'cyan', icon: <RefreshCw className="w-3 h-3 animate-spin" />, text: '转账中' },
      success: { color: 'green', icon: <CheckCircle className="w-3 h-3" />, text: '已完成' },
      partial: { color: 'gold', icon: <AlertCircle className="w-3 h-3" />, text: '部分成功' },
      failed: { color: 'red', icon: <XCircle className="w-3 h-3" />, text: '失败' },
      rejected: { color: 'red', icon: <XCircle className="w-3 h-3" />, text: '已拒绝' }
    };
    const c = config[status] || config.pending;
    return (
      <Tag color={c.color} className="flex items-center gap-1">
        {c.icon} {c.text}
      </Tag>
    );
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">请先登录</h2>
          <p className="text-slate-500 mb-6">登录后查看佣金信息</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">累计推荐</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.totalReferrals || 0} 人</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">已消费用户</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.activeReferrals || 0} 人</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-500">累计获得佣金</div>
          </div>
          <div className="text-2xl font-bold text-blue-600">¥{(stats?.totalEarned || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* 余额卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">可提现余额</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle className="w-3 h-3" />
                已结算可提现
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-600">¥{(stats?.availableBalance || 0).toFixed(2)}</div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">待结算余额</div>
              <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" />
                {(() => {
                  const minutes = stats?.settleMinutes || 21600;
                  if (minutes >= 1440) {
                    return `${Math.round(minutes / 1440)}天后可提现`;
                  } else if (minutes >= 60) {
                    return `${Math.round(minutes / 60)}小时后可提现`;
                  } else {
                    return `${minutes}分钟后可提现`;
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-600">¥{(stats?.pendingBalance || 0).toFixed(2)}</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">累计提现</div>
              <div className="text-xs text-slate-400 mt-0.5">
                历史提现总额
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-700">¥{(stats?.totalWithdrawn || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* 提现按钮 */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">佣金提现</h3>
            <p className="text-sm text-slate-500 mt-1">
              最低提现 ¥{withdrawalConfig?.minWithdrawalAmount || 10}，单日最高 ¥{withdrawalConfig?.maxDailyWithdrawal || 2000}
            </p>
          </div>
          <button
            onClick={() => setWithdrawModalVisible(true)}
            disabled={!stats?.availableBalance || stats.availableBalance < (withdrawalConfig?.minWithdrawalAmount || 10)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ArrowUpRight className="w-5 h-5" />
            申请提现
          </button>
        </div>

        {!user?.wechat_openid && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              提现需要绑定微信账号
            </p>
            <button
              onClick={handleOpenBindWechat}
              className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z"/>
              </svg>
              立即绑定
            </button>
          </div>
        )}
      </div>

      {/* 推荐码 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-500" />
          我的推荐码
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">推荐码</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralInfo?.referralCode || ''}
                readOnly
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-lg font-mono tracking-widest"
              />
              <button
                onClick={copyCode}
                className={`px-5 py-3 rounded-xl font-medium transition-all ${
                  copied === 'code'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copied === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">推广链接</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralInfo?.shareUrl || ''}
                readOnly
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm truncate"
              />
              <button
                onClick={copyLink}
                className={`px-5 py-3 rounded-xl font-medium transition-all ${
                  copied === 'link'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-sky-400 to-emerald-400 text-white'
                }`}
              >
                {copied === 'link' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200">
          <p className="text-sm text-sky-700">
            分享推荐码或链接给好友，好友注册时填写您的推荐码，好友购买课程您将获得 {courseRate}% 佣金，购买会员获得 {membershipRate}% 佣金！
          </p>
        </div>
      </div>

      {/* 提现记录 */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          提现记录
        </h3>

        {/* 移动端使用卡片列表 */}
        <div className="block sm:hidden space-y-3">
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无提现记录</div>
          ) : (
            withdrawals.map((record) => {
              const countdown = record.transferCreatedAt ? calculateRemainingTime(record.transferCreatedAt) : null;
              return (
                <div key={record.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-slate-900">¥{Number(record.amount).toFixed(2)}</span>
                    {record.status === 'processing' && record.packageInfo ? (
                      <Tag color="orange" className="flex items-center gap-1 m-0">
                        <AlertCircle className="w-3 h-3" /> 待确认
                      </Tag>
                    ) : (
                      getStatusTag(record.status)
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </div>
                  {record.rejectReason && (
                    <div className="text-xs text-red-500 mb-2">{record.rejectReason}</div>
                  )}
                  {record.status === 'partial' && (
                    <div className="text-xs text-amber-600 mb-2">
                      成功 ¥{record.successAmount}，失败 ¥{record.failAmount}
                    </div>
                  )}
                  {record.status === 'processing' && record.packageInfo && countdown && (
                    <div className={`text-xs mb-2 flex items-center gap-1 ${countdown.expired ? 'text-red-500' : countdown.totalSeconds < 4 * 3600 ? 'text-orange-500' : 'text-slate-500'}`}>
                      <Clock className="w-3 h-3" />
                      {countdown.expired ? '收款已过期，佣金将自动退回' : `剩余 ${formatCountdown(countdown)} 过期`}
                    </div>
                  )}
                  {record.status === 'processing' && record.packageInfo && (
                    <button
                      onClick={() => handleConfirmReceipt(record)}
                      disabled={confirmingReceipt === record.id || countdown?.expired}
                      className="w-full mt-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {confirmingReceipt === record.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          确认中...
                        </>
                      ) : countdown?.expired ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          已过期
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          确认收款
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 桌面端使用表格 */}
        <div className="hidden sm:block">
          <Table
            dataSource={withdrawals}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '金额',
                dataIndex: 'amount',
                width: 100,
                render: (v: number) => <span className="font-semibold">¥{Number(v).toFixed(2)}</span>
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 120,
                render: (status: string, record: WithdrawalRecord) => {
                  // 如果是处理中且有packageInfo，显示"待确认收款"
                  if (status === 'processing' && record.packageInfo) {
                    return (
                      <Tag color="orange" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> 待确认收款
                      </Tag>
                    );
                  }
                  return getStatusTag(status);
                }
              },
              {
                title: '申请时间',
                dataIndex: 'createdAt',
                width: 180,
                render: (v: string) => new Date(v).toLocaleString('zh-CN')
              },
              {
                title: '备注/倒计时',
                dataIndex: 'rejectReason',
                render: (v: string, record: WithdrawalRecord) => {
                  // 如果有待确认的转账，显示倒计时
                  if (record.status === 'processing' && record.packageInfo && record.transferCreatedAt) {
                    const countdown = calculateRemainingTime(record.transferCreatedAt);
                    if (countdown.expired) {
                      return <span className="text-red-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 已过期</span>;
                    }
                    const isUrgent = countdown.totalSeconds < 4 * 3600;
                    return (
                      <span className={`flex items-center gap-1 ${isUrgent ? 'text-orange-500' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        剩余 {formatCountdown(countdown)}
                      </span>
                    );
                  }
                  if (v) return <span className="text-red-500">{v}</span>;
                  if (record.status === 'partial') {
                    return <span className="text-amber-600">成功 ¥{record.successAmount}，失败 ¥{record.failAmount}</span>;
                  }
                  return '-';
                }
              },
              {
                title: '操作',
                key: 'action',
                width: 120,
                render: (_: any, record: WithdrawalRecord) => {
                  // 只有处理中且有packageInfo的记录才显示确认收款按钮
                  if (record.status === 'processing' && record.packageInfo) {
                    const countdown = record.transferCreatedAt ? calculateRemainingTime(record.transferCreatedAt) : null;
                    const isExpired = countdown?.expired;
                    return (
                      <button
                        onClick={() => handleConfirmReceipt(record)}
                        disabled={confirmingReceipt === record.id || isExpired}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium hover:shadow-md disabled:opacity-50 transition-all flex items-center gap-1 whitespace-nowrap"
                      >
                        {confirmingReceipt === record.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            确认中
                          </>
                        ) : isExpired ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            已过期
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            确认收款
                          </>
                        )}
                      </button>
                    );
                  }
                  return null;
                }
              }
            ]}
            locale={{ emptyText: '暂无提现记录' }}
          />
        </div>
      </div>

      {/* 提现弹窗 */}
      <Modal
        title="申请提现"
        open={withdrawModalVisible}
        onCancel={() => setWithdrawModalVisible(false)}
        onOk={handleWithdraw}
        confirmLoading={withdrawing}
        okText="确认提现"
        cancelText="取消"
      >
        <div className="py-4">
          <div className="mb-4">
            <label className="block text-sm text-slate-500 mb-2">可提现余额</label>
            <div className="text-2xl font-bold text-emerald-600">¥{(stats?.availableBalance || 0).toFixed(2)}</div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-500 mb-2">提现金额</label>
            <InputNumber
              value={withdrawAmount}
              onChange={(v) => setWithdrawAmount(v || 0)}
              min={0.01}
              max={Math.min(stats?.availableBalance || 0, withdrawalConfig?.maxDailyWithdrawal || 2000)}
              precision={2}
              className="w-full"
              addonBefore="¥"
              placeholder={`最低 ¥${withdrawalConfig?.minWithdrawalAmount || 10}`}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-sm text-slate-600">
              • 最低提现金额：¥{withdrawalConfig?.minWithdrawalAmount || 10}
            </p>
            <p className="text-sm text-slate-600">
              • 单日最高提现：¥{withdrawalConfig?.maxDailyWithdrawal || 2000}
            </p>
            <p className="text-sm text-slate-600">
              • 提现将转入您绑定的微信账户
            </p>
          </div>
        </div>
      </Modal>

      {/* 绑定微信弹窗 */}
      {showBindWechatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">绑定微信</h3>
                <button
                  onClick={handleCloseBindWechat}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="text-center">
                {/* 绑定错误提示 */}
                {bindError ? (
                  <div className="py-6">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">绑定失败</h4>
                    <p className="text-sm text-red-600 mb-6 px-4">{bindError}</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleCloseBindWechat}
                        className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                      >
                        关闭
                      </button>
                      <button
                        onClick={handleOpenBindWechat}
                        className="px-6 py-2.5 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                      >
                        重新扫码
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-700 flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        提现需要绑定微信账号
                      </p>
                    </div>
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
                        <p className="text-xs text-slate-400">绑定成功后即可申请提现</p>
                        <p className="text-xs text-slate-400 mt-1">二维码有效期5分钟</p>
                      </>
                    ) : (
                      <div className="py-12">
                        <p className="text-sm text-red-500">获取二维码失败，请重试</p>
                        <button
                          onClick={handleOpenBindWechat}
                          className="mt-4 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          重新获取
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commission;
