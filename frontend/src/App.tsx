import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';

function App() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);
  const location = useLocation();

  // 应用启动时从localStorage加载用户信息
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // 登录和注册页面不显示侧边栏和顶栏
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen">
        <TopBar />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;
