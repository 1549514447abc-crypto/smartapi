import { useEffect, useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/layout/Sidebar';
import { DesktopNav } from './components/layout/DesktopNav';
import LoginModal from './components/LoginModal';

function App() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 应用启动时从localStorage加载用户信息
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // 全局保存推荐码到 localStorage（任何页面带 ref 参数都会保存）
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referral_code', ref);
      console.log('[App] 保存推荐码到 localStorage:', ref);
    }
  }, [searchParams]);

  // 路由变化时关闭移动端侧边栏
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // 登录和注册页面不显示侧边栏和顶栏
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <>
        <Outlet />
        <LoginModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* 全局登录弹窗 */}
      <LoginModal />
      {/* 电脑端顶部导航 */}
      <DesktopNav />

      {/* 移动端侧边栏 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* 移动端顶部栏 */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="创作魔方" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-slate-900">创作魔方</span>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 lg:px-8 xl:px-12 2xl:px-16 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;
