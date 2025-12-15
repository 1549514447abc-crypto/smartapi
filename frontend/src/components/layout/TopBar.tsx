import { useNavigate } from 'react-router-dom';
import { Bell, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const TopBar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-orange-200/70 hidden lg:block">
      <div className="flex items-center justify-end px-6 py-4">
        {/* 右侧按钮 */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* 通知按钮 */}
              <button className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* 余额显示 */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600">
                  ¥{Number(user?.balance || 0).toFixed(2)}
                </span>
              </div>

              {/* 充值按钮 */}
              <button
                onClick={() => navigate('/recharge')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white text-sm font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow"
              >
                充值
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white text-sm font-semibold shadow-lg shadow-sky-200"
              >
                免费注册
              </button>
            </>
          )}
        </div>
      </div>

      {/* 跑马灯通知 */}
      <div className="overflow-hidden border-t border-orange-200/70 bg-gradient-to-r from-orange-50 via-amber-50 to-sky-50">
        <div className="flex ticker whitespace-nowrap text-sm py-2 gap-8 px-6">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-emerald-600">新功能</span>
            <span className="text-slate-600">视频文案提取支持异步处理，更快更稳定</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-orange-600">限时优惠</span>
            <span className="text-slate-600">充值满100送20，活动进行中</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-sky-600">新上线</span>
            <span className="text-slate-600">插件市场全新改版，更多优质插件等你发现</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-pink-600">推广返佣</span>
            <span className="text-slate-600">邀请好友最高返佣30%</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-emerald-600">新功能</span>
            <span className="text-slate-600">视频文案提取支持异步处理，更快更稳定</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-orange-600">限时优惠</span>
            <span className="text-slate-600">充值满100送20，活动进行中</span>
          </span>
        </div>
      </div>
    </header>
  );
};
