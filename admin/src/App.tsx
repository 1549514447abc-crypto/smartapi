import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserCategories from './pages/UserCategories';
import Prompts from './pages/Prompts';
import Plugins from './pages/Plugins';
import PluginCategories from './pages/PluginCategories';
import Workflows from './pages/Workflows';
import WorkflowCategories from './pages/WorkflowCategories';
import Settings from './pages/Settings';
import Finance from './pages/Finance';
import UserFinance from './pages/UserFinance';
import Transactions from './pages/Transactions';
import SystemMonitor from './pages/SystemMonitor';
import Pricing from './pages/Pricing';
import Invoice from './pages/Invoice';
import Withdrawals from './pages/Withdrawals';
import useAuthStore from './store/useAuthStore';

// 路由守卫组件
const PrivateRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/user-categories" element={<UserCategories />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/user-finance" element={<UserFinance />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/prompts" element={<Prompts />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/plugin-categories" element={<PluginCategories />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/workflow-categories" element={<WorkflowCategories />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/invoice" element={<Invoice />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/monitor" element={<SystemMonitor />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
