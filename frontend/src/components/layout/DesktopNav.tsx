import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Video,
  Store,
  Puzzle,
  Wallet,
  User,
  GraduationCap,
  Gift,
  LogOut,
  ChevronDown,
  MessageSquareText,
  Clapperboard
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useState, useRef, useEffect } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  tag?: 'hot' | 'new' | 'soon';
  requireAuth?: boolean;
}

const NavItem = ({ to, icon, label, tag, requireAuth }: NavItemProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const needsAuth = requireAuth && !isAuthenticated;

  return (
    <NavLink
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-gradient-to-r from-sky-400 to-emerald-400 text-white shadow-md shadow-sky-200/50'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      onClick={(e) => {
        if (needsAuth) {
          e.preventDefault();
          navigate('/login', { state: { from: to } });
        }
      }}
    >
      {icon}
      <span>{label}</span>
      {tag === 'hot' && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded leading-none">HOT</span>}
      {tag === 'new' && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded leading-none">NEW</span>}
      {tag === 'soon' && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded leading-none">SOON</span>}
    </NavLink>
  );
};

export const DesktopNav = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 xl:px-6 overflow-visible">
        <div className="flex items-center h-16 gap-6 overflow-visible">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center text-white font-black text-base">
              S
            </div>
            <div className="hidden xl:block">
              <h1 className="font-bold text-base text-slate-900 leading-tight">SmartAPI</h1>
              <p className="text-[10px] text-slate-500 leading-tight">智能API服务平台</p>
            </div>
          </NavLink>

          {/* 主导航 */}
          <nav className="flex items-center gap-0.5 flex-1 justify-center">
            <NavItem
              to="/"
              icon={<Home className="w-4 h-4" />}
              label="首页"
            />
            <NavItem
              to="/video-extract"
              icon={<Video className="w-4 h-4" />}
              label="视频文案提取"
              tag="hot"
              requireAuth
            />
            <NavItem
              to="/prompt-market"
              icon={<MessageSquareText className="w-4 h-4" />}
              label="提示词市场"
              tag="new"
            />
            <NavItem
              to="/plugin-market"
              icon={<Puzzle className="w-4 h-4" />}
              label="插件市场"
            />
            <NavItem
              to="/workflow-store"
              icon={<Store className="w-4 h-4" />}
              label="工作流商店"
              tag="soon"
            />
            <NavItem
              to="/jianying-helper"
              icon={<Clapperboard className="w-4 h-4" />}
              label="剪映小助手"
              tag="new"
            />
            <NavItem
              to="/course"
              icon={<GraduationCap className="w-4 h-4" />}
              label="课程中心"
            />
          </nav>

          {/* 用户区域 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated && user ? (
              <>
                {/* 余额显示 */}
                <NavLink
                  to="/recharge"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  <span>¥{Number(user.balance || 0).toFixed(2)}</span>
                </NavLink>

                {/* 用户下拉菜单 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-xs">
                      {user.nickname?.charAt(0) || user.username?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm font-medium text-slate-700 hidden xl:inline">
                      {user.nickname || user.username}
                    </span>
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
                        to="/recharge"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Wallet className="w-4 h-4" />
                        充值中心
                      </NavLink>
                      <NavLink
                        to="/referral"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Gift className="w-4 h-4" />
                        推广返佣
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
              <div className="flex items-center gap-1.5">
                <NavLink
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  登录
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-emerald-400 text-white text-sm font-medium shadow-md shadow-sky-200/50 hover:shadow-lg transition-shadow"
                >
                  注册
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
