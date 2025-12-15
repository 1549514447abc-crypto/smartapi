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
  X,
  MessageSquareText,
  Clapperboard
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  tag?: 'hot' | 'new' | 'soon';
  requireAuth?: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, tag, requireAuth, onClick }: NavItemProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  // 如果需要登录但未登录，点击时跳转到登录页
  const needsAuth = requireAuth && !isAuthenticated;

  return (
    <NavLink
      to={to}
      className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 ${isActive ? 'active' : ''}`}
      onClick={(e) => {
        if (needsAuth) {
          e.preventDefault();
          // 跳转到登录页，并记录原始目标页面
          navigate('/login', { state: { from: to } });
        } else {
          onClick?.();
        }
      }}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {tag === 'hot' && <span className="tag tag-hot ml-auto">HOT</span>}
      {tag === 'new' && <span className="tag tag-new ml-auto">NEW</span>}
      {tag === 'soon' && <span className="tag tag-soon ml-auto">SOON</span>}
    </NavLink>
  );
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/smartapi/login';
  };

  const handleNavClick = () => {
    // 移动端点击导航后关闭侧边栏
    if (window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <aside className={`lg:hidden sidebar w-64 min-h-screen fixed left-0 top-0 z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo区域 */}
      <div className="p-5 border-b border-orange-200/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center text-white font-black text-lg">
              S
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900">SmartAPI</h1>
              <p className="text-xs text-slate-500">智能API服务平台</p>
            </div>
          </div>
          {/* 移动端关闭按钮 */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 text-slate-600 overflow-y-auto">
        <NavItem
          to="/"
          icon={<Home className="w-5 h-5" />}
          label="首页"
          onClick={handleNavClick}
        />

        <div className="pt-5 pb-2">
          <p className="px-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            核心功能
          </p>
        </div>

        <NavItem
          to="/video-extract"
          icon={<Video className="w-5 h-5" />}
          label="视频文案提取"
          tag="hot"
          requireAuth
          onClick={handleNavClick}
        />
        <NavItem
          to="/prompt-market"
          icon={<MessageSquareText className="w-5 h-5" />}
          label="提示词市场"
          tag="new"
          onClick={handleNavClick}
        />
        <NavItem
          to="/plugin-market"
          icon={<Puzzle className="w-5 h-5" />}
          label="插件市场"
          onClick={handleNavClick}
        />
        <NavItem
          to="/workflow-store"
          icon={<Store className="w-5 h-5" />}
          label="工作流商店"
          tag="soon"
          onClick={handleNavClick}
        />
        <NavItem
          to="/jianying-helper"
          icon={<Clapperboard className="w-5 h-5" />}
          label="剪映小助手"
          tag="new"
          onClick={handleNavClick}
        />

        <div className="pt-5 pb-2">
          <p className="px-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            学习中心
          </p>
        </div>

        <NavItem
          to="/course"
          icon={<GraduationCap className="w-5 h-5" />}
          label="课程中心"
          onClick={handleNavClick}
        />

        <div className="pt-5 pb-2">
          <p className="px-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            账户管理
          </p>
        </div>

        <NavItem
          to="/recharge"
          icon={<Wallet className="w-5 h-5" />}
          label="充值中心"
          requireAuth
          onClick={handleNavClick}
        />
        <NavItem
          to="/referral"
          icon={<Gift className="w-5 h-5" />}
          label="推广返佣"
          requireAuth
          onClick={handleNavClick}
        />
        <NavItem
          to="/profile"
          icon={<User className="w-5 h-5" />}
          label="个人中心"
          requireAuth
          onClick={handleNavClick}
        />
      </nav>

      {/* 底部用户区域 */}
      <div className="p-4 border-t border-orange-200/70">
        {isAuthenticated && user ? (
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold">
                {user.nickname?.charAt(0) || user.username?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {user.nickname || user.username}
                </p>
                <p className="text-xs text-slate-500">
                  余额: ¥{Number(user.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500 mb-3 text-center">登录后解锁更多功能</p>
            <div className="flex gap-2">
              <NavLink
                to="/login"
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-emerald-400 text-white text-sm font-medium text-center shadow-lg shadow-sky-200"
              >
                登录
              </NavLink>
              <NavLink
                to="/register"
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium text-center border border-slate-200"
              >
                注册
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
