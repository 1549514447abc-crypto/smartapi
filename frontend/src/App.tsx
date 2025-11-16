import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuthStore } from './store/useAuthStore';
import { Header } from './components/layout/Header';

const { Content } = Layout;

function App() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);

  // 应用启动时从localStorage加载用户信息
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Header />
      <Content style={{ background: '#ffffff' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}

export default App;
