import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Wallet,
  User,
  Gift,
  LogOut,
  ChevronDown,
  Crown
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLoginModalStore } from '../../store/useLoginModalStore';
import { useState, useRef, useEffect } from 'react';

export const DesktopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isMember, refreshUser } = useAuthStore();
  const { openLoginModal } = useLoginModalStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastRefreshRef = useRef<number>(0);

  // 路由切换时刷新用户数据（限制最小间隔30秒）
  useEffect(() => {
    if (isAuthenticated) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      // 至少间隔30秒才刷新，避免频繁请求
      if (timeSinceLastRefresh > 30000) {
        lastRefreshRef.current = now;
        refreshUser();
      }
    }
  }, [location.pathname, isAuthenticated]);

  // 页面重新获得焦点时刷新用户数据（用户从其他标签页切回来）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        // 至少间隔30秒才刷新
        if (timeSinceLastRefresh > 30000) {
          lastRefreshRef.current = now;
          refreshUser();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refreshUser]);

  const handleLogout = () => {
    logout();
    window.location.href = '/smartapi/login';
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // 完全按照 d2.html 的样式：所有链接都是 text-slate-600，激活状态只加 active 类
  const navLinkClass = (path: string) => {
    return `nav-link px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors ${isActive(path) ? 'active' : ''}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 cursor-pointer">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="创作魔方" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">创作魔方</span>
          </NavLink>

          {/* 主导航 */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" className={navLinkClass('/')} end>
              首页
            </NavLink>
            {/* 视频提取暂时隐藏
            <NavLink to="/video-extract" className={navLinkClass('/video-extract')}>
              视频提取
            </NavLink>
            */}
            <NavLink to="/workflow-store" className={navLinkClass('/workflow-store')}>
              工作流商店
            </NavLink>
            <NavLink to="/course" className={navLinkClass('/course')}>
              课程中心
            </NavLink>
            <NavLink to="/plugin-market" className={navLinkClass('/plugin-market')}>
              插件市场
            </NavLink>
            <NavLink to="/prompt-market" className={navLinkClass('/prompt-market')}>
              提示词市场
            </NavLink>
            <NavLink to="/jianying-helper" className={navLinkClass('/jianying-helper')}>
              剪映小助手
            </NavLink>
            <NavLink to="/referral" className={navLinkClass('/referral')}>
              推广赚钱
            </NavLink>
          </div>

          {/* 右侧按钮 */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                {/* 余额显示（充值金 + 赠金） */}
                <button
                  onClick={() => navigate('/recharge')}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  <span>¥{(Number(user.balance || 0) + Number(user.bonus_balance || 0)).toFixed(2)}</span>
                </button>

                {/* 用户下拉菜单 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                        {user.nickname?.charAt(0) || user.username?.charAt(0) || 'U'}
                      </div>
                      {isMember() && (
                        <div className="absolute -top-1 -right-1 px-1 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold rounded shadow-sm">
                          PRO
                        </div>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      <NavLink
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        个人中心
                      </NavLink>
                      <NavLink
                        to="/membership"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Crown className="w-4 h-4" />
                        会员中心
                      </NavLink>
                      <NavLink
                        to="/recharge"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Wallet className="w-4 h-4" />
                        充值中心
                      </NavLink>
                      <NavLink
                        to="/commission"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Gift className="w-4 h-4" />
                        我的佣金
                      </NavLink>
                      <div className="border-t border-slate-100 my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => openLoginModal()}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  登录
                </button>
                <button
                  onClick={() => openLoginModal()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all shadow-sm shadow-blue-600/20"
                >
                  免费注册
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
