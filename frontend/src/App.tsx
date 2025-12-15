import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/layout/Sidebar';
import { DesktopNav } from './components/layout/DesktopNav';

function App() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 应用启动时从localStorage加载用户信息
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // 路由变化时关闭移动端侧边栏
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // 登录和注册页面不显示侧边栏和顶栏
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* 电脑端顶部导航 */}
      <DesktopNav />

      {/* 移动端侧边栏 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* 移动端顶部栏 */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <span className="font-bold text-slate-900">SmartAPI</span>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;
