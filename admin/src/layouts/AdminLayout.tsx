import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Drawer } from 'antd';
import {
  DashboardOutlined,
  MessageOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  WalletOutlined,
  BarChartOutlined,
  BellOutlined,
  MonitorOutlined,
  DollarOutlined,
  MenuOutlined,
  CloseOutlined,
  SwapOutlined,
  FileTextOutlined,
  MoneyCollectOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1200);
  const [openKeys, setOpenKeys] = useState<string[]>(['plugins-menu', 'workflows-menu']); // 默认展开插件和工作流菜单
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1200;
      setIsMobile(mobile);
      setIsTablet(tablet);
      // 在中等宽度及以下自动折叠侧边栏
      if (mobile || tablet) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化检查

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 扩展菜单结构
  const menuItems = [
    {
      key: 'overview',
      type: 'group' as const,
      label: <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>概览</span>,
      children: [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: '数据概览',
        },
      ],
    },
    {
      key: 'users',
      type: 'group' as const,
      label: <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>用户管理</span>,
      children: [
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户列表',
        },
        {
          key: '/user-categories',
          icon: <BarChartOutlined />,
          label: '分佣设置',
        },
      ],
    },
    {
      key: 'finance',
      type: 'group' as const,
      label: <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>财务中心</span>,
      children: [
        {
          key: '/finance',
          icon: <BarChartOutlined />,
          label: '财务报表',
        },
        {
          key: '/user-finance',
          icon: <WalletOutlined />,
          label: '用户财务',
        },
        {
          key: '/transactions',
          icon: <SwapOutlined />,
          label: '交易记录',
        },
        {
          key: '/invoice',
          icon: <FileTextOutlined />,
          label: '开票管理',
        },
        {
          key: '/withdrawals',
          icon: <MoneyCollectOutlined />,
          label: '提现管理',
        },
      ],
    },
    {
      key: 'content',
      type: 'group' as const,
      label: <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>内容管理</span>,
      children: [
        {
          key: '/prompts',
          icon: <MessageOutlined />,
          label: '提示词管理',
        },
        {
          key: 'plugins-menu',
          icon: <AppstoreOutlined />,
          label: '插件管理',
          children: [
            {
              key: '/plugins',
              label: '插件列表',
            },
            {
              key: '/plugin-categories',
              label: '分类管理',
            },
          ],
        },
        {
          key: 'workflows-menu',
          icon: <BranchesOutlined />,
          label: '工作流管理',
          children: [
            {
              key: '/workflows',
              label: '工作流列表',
            },
            {
              key: '/workflow-categories',
              label: '分类管理',
            },
          ],
        },
      ],
    },
    {
      key: 'system',
      type: 'group' as const,
      label: <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>系统设置</span>,
      children: [
        {
          key: '/settings',
          icon: <SettingOutlined />,
          label: '基础配置',
        },
        {
          key: '/pricing',
          icon: <DollarOutlined />,
          label: '价格管理',
        },
        {
          key: '/monitor',
          icon: <MonitorOutlined />,
          label: '系统监控',
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  // 获取当前页面标题
  const getPageTitle = () => {
    const pathMap: Record<string, string> = {
      '/dashboard': '数据概览',
      '/users': '用户列表',
      '/user-categories': '分佣设置',
      '/finance': '财务报表',
      '/user-finance': '用户财务',
      '/transactions': '交易记录',
      '/invoice': '开票管理',
      '/withdrawals': '提现管理',
      '/prompts': '提示词管理',
      '/plugins': '插件列表',
      '/plugin-categories': '插件分类管理',
      '/workflows': '工作流列表',
      '/workflow-categories': '工作流分类管理',
      '/settings': '基础配置',
      '/pricing': '价格管理',
      '/monitor': '系统监控',
    };
    return pathMap[location.pathname] || '管理后台';
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // 处理子菜单展开/收起
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // 侧边栏内容
  const SiderContent = () => (
    <>
      {/* Logo */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #e2e8f0',
        gap: 10,
      }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="创作魔方"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
          创作魔方
        </span>
        {isMobile && (
          <CloseOutlined
            style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          border: 'none',
          marginTop: 8,
        }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          collapsedWidth={80}
          style={{
            background: '#fff',
            borderRight: '1px solid #e2e8f0',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 99,
            overflow: 'auto',
          }}
        >
          <SiderContent />
        </Sider>
      )}

      {/* 移动端侧边栏 Drawer */}
      <Drawer
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
        closable={false}
        styles={{ body: { padding: 0 } }}
        style={{ display: isMobile ? 'block' : 'none' }}
      >
        <SiderContent />
      </Drawer>

      {/* 主内容区 */}
      <Layout style={{
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
        transition: 'margin-left 0.2s'
      }}>
        {/* 顶部栏 - 使用 flex-wrap 自动换行 */}
        <Header style={{
          padding: '8px 12px',
          background: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 98,
          height: 'auto',
          minHeight: 56,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* 移动端菜单按钮 */}
            {isMobile ? (
              <div
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 6,
                  color: '#64748b',
                }}
              >
                <MenuOutlined style={{ fontSize: 16 }} />
              </div>
            ) : (
              /* 折叠按钮 */
              <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 6,
                  color: '#64748b',
                }}
              >
                {collapsed ? <MenuUnfoldOutlined style={{ fontSize: 16 }} /> : <MenuFoldOutlined style={{ fontSize: 16 }} />}
              </div>
            )}

            {/* 页面标题 */}
            <span style={{
              color: '#0f172a',
              fontWeight: 600,
              fontSize: 15,
            }}>
              {getPageTitle()}
            </span>
          </div>

          {/* 右侧工具栏 - 可换行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {/* 通知按钮 */}
            <Badge dot>
              <div style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 6,
                color: '#64748b',
              }}>
                <BellOutlined style={{ fontSize: 16 }} />
              </div>
            </Badge>

            {/* 用户信息 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
              }}>
                <Avatar
                  style={{ backgroundColor: '#0ea5e9' }}
                  icon={<UserOutlined />}
                  size={28}
                />
                <span style={{ color: '#0f172a', fontWeight: 500, fontSize: 13 }}>
                  {user?.nickname || user?.username || '管理员'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区 */}
        <Content style={{
          margin: (isMobile || isTablet) ? 12 : 24,
          padding: (isMobile || isTablet) ? 16 : 24,
          minHeight: 280,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
