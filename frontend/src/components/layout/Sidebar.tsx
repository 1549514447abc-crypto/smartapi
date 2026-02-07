import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Store,
  Puzzle,
  Wallet,
  User,
  GraduationCap,
  Gift,
  LogOut,
  X,
  MessageSquareText,
  Clapperboard,
  Crown
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLoginModalStore } from '../../store/useLoginModalStore';

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
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useLoginModalStore();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  const needsAuth = requireAuth && !isAuthenticated;

  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      onClick={(e) => {
        if (needsAuth) {
          e.preventDefault();
          openLoginModal(to);
        } else {
          onClick?.();
        }
      }}
    >
      {icon}
      <span>{label}</span>
      {tag === 'hot' && <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded leading-none">HOT</span>}
      {tag === 'new' && <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded leading-none">NEW</span>}
      {tag === 'soon' && <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-slate-400 text-white rounded leading-none">SOON</span>}
    </NavLink>
  );
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const { user, isAuthenticated, logout, isMember } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/smartapi/login';
  };

  const handleNavClick = () => {
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

      <aside className={`lg:hidden w-72 min-h-screen fixed left-0 top-0 z-50 flex flex-col bg-white transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo区域 */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="创作魔方" className="w-10 h-10 rounded-xl" />
              <div>
                <h1 className="font-bold text-lg text-slate-900">创作魔方</h1>
                <p className="text-xs text-slate-500">AI创作平台</p>
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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem
            to="/"
            icon={<Home className="w-5 h-5" />}
            label="首页"
            onClick={handleNavClick}
          />

          <div className="pt-6 pb-2">
            <p className="px-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              核心功能
            </p>
          </div>

          {/* 视频提取暂时隐藏
          <NavItem
            to="/video-extract"
            icon={<Video className="w-5 h-5" />}
            label="视频文案提取"
            tag="hot"
            requireAuth
            onClick={handleNavClick}
          />
          */}
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
          <NavItem
            to="/referral"
            icon={<Gift className="w-5 h-5" />}
            label="推广赚钱"
            tag="hot"
            onClick={handleNavClick}
          />

          <div className="pt-6 pb-2">
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

          <div className="pt-6 pb-2">
            <p className="px-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              账户管理
            </p>
          </div>

          <NavItem
            to="/membership"
            icon={<Crown className="w-5 h-5" />}
            label="会员中心"
            tag="hot"
            onClick={handleNavClick}
          />
          <NavItem
            to="/recharge"
            icon={<Wallet className="w-5 h-5" />}
            label="充值中心"
            requireAuth
            onClick={handleNavClick}
          />
          <NavItem
            to="/commission"
            icon={<Gift className="w-5 h-5" />}
            label="我的佣金"
            tag="hot"
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
        <div className="p-4 border-t border-slate-200">
          {isAuthenticated && user ? (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold">
                    {user.nickname?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </div>
                  {isMember() && (
                    <div className="absolute -top-1 -right-1 px-1 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold rounded shadow-sm">
                      PRO
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-slate-900 truncate">
                      {user.nickname || user.username}
                    </p>
                    {isMember() && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-orange-600 text-[10px] font-semibold rounded">
                        {user.membership_type === 'course' ? '学员' : '会员'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    余额: ¥{(Number(user.balance || 0) + Number(user.bonus_balance || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 text-center">登录后解锁更多功能</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleNavClick();
                    useLoginModalStore.getState().openLoginModal();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium text-center hover:bg-slate-50 transition-colors"
                >
                  登录
                </button>
                <button
                  onClick={() => {
                    handleNavClick();
                    useLoginModalStore.getState().openLoginModal();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold text-center hover:bg-blue-500 transition-colors"
                >
                  注册
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
