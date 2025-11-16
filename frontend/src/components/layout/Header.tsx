import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import './Header.css';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  let dropdownTimer: NodeJS.Timeout;

  const showDropdown = () => {
    clearTimeout(dropdownTimer);
    setDropdownVisible(true);
  };

  const hideDropdownWithDelay = () => {
    dropdownTimer = setTimeout(() => {
      setDropdownVisible(false);
    }, 300);
  };

  const copyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id.toString());
      message.success('用户ID已复制到剪贴板');
    }
  };

  const copyToken = () => {
    message.success('API Token已复制到剪贴板');
    // TODO: Implement actual token copy from user center
  };

  const refreshToken = () => {
    message.info('API Token已更新');
    // TODO: Implement actual token refresh
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/');
  };

  const isActive = (path: string) => {
    // 处理 basename，移除 /smartapi 前缀
    const pathname = location.pathname.replace(/^\/smartapi/, '') || '/';
    return pathname === path;
  };

  const getUserInitial = () => {
    if (!user?.username) return 'U';
    return user.username[0].toUpperCase();
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/')}>
          创作魔方Content Cube
        </div>
        <ul className="nav-menu">
          <li className={isActive('/') ? 'active' : ''} onClick={() => navigate('/')}>
            首页
          </li>
          <li className={isActive('/ai-reduce') ? 'active' : ''} onClick={() => navigate('/ai-reduce')}>
            文章降AI率
          </li>
          <li className={isActive('/video-extract') ? 'active' : ''} onClick={() => navigate('/video-extract')}>
            视频文案提取
          </li>
          <li className={isActive('/prompt-generator') ? 'active' : ''} onClick={() => navigate('/prompt-generator')}>
            提示词生成器
          </li>
          <li className={isActive('/plugin-market') ? 'active' : ''} onClick={() => navigate('/plugin-market')}>
            插件市场
          </li>
          <li className={isActive('/workflow-store') ? 'active' : ''} onClick={() => navigate('/workflow-store')}>
            工作流商店
          </li>
          <li className={isActive('/course') ? 'active' : ''} onClick={() => navigate('/course')}>
            课程商店
          </li>
          <li className={isActive('/ai-toolbox') ? 'active' : ''} onClick={() => navigate('/ai-toolbox')}>
            智能体工具箱
          </li>
        </ul>
      </div>
      <div className="header-right">
        <Button
          className="promote-button"
          onClick={() => navigate('/promote')}
        >
          <span>💰</span>
          推广赚钱
        </Button>
        {user ? (
          <div
            className="user-dropdown"
            onMouseEnter={showDropdown}
            onMouseLeave={hideDropdownWithDelay}
          >
            <div className="user-avatar">{getUserInitial()}</div>
            <div className={`dropdown-content ${dropdownVisible ? 'show' : ''}`}>
              <div className="user-info-header">
                <div className="user-id">
                  ID: {user.id}
                  <button onClick={copyId} className="copy-btn">复制</button>
                </div>
                <div className="user-balance">余额: ¥0.00</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                  余额即将耗尽，前往充值
                </div>
                <button className="vip-button" onClick={() => navigate('/vip')}>
                  👑 成为会员
                </button>
              </div>

              <div className="api-token-section">
                <div className="api-token-title">API Token （插件密钥）</div>
                <input
                  type="password"
                  className="token-input"
                  value="sk-proj-****************"
                  readOnly
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={copyToken} className="token-btn">📋 复制</button>
                  <button onClick={refreshToken} className="token-btn refresh">🔄 更新</button>
                </div>
              </div>

              <div className="menu-grid">
                <div className="menu-item" onClick={() => navigate('/user-center')}>
                  <div className="menu-icon">👤</div>
                  <div className="menu-text">个人中心</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/vip')}>
                  <div className="menu-icon">👑</div>
                  <div className="menu-text">会员购买</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/recharge')}>
                  <div className="menu-icon">💳</div>
                  <div className="menu-text">个人充值</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/pricing')}>
                  <div className="menu-icon">📖</div>
                  <div className="menu-text">计费标准</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/tickets')}>
                  <div className="menu-icon">⚙️</div>
                  <div className="menu-text">工单系统</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/tasks')}>
                  <div className="menu-icon">📹</div>
                  <div className="menu-text">查看生成任务</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/consumption')}>
                  <div className="menu-icon">🕒</div>
                  <div className="menu-text">消费明细</div>
                </div>
                <div className="menu-item" onClick={() => navigate('/news')}>
                  <div className="menu-icon">📘</div>
                  <div className="menu-text">
                    官方动态 <span className="new-badge">新</span>
                  </div>
                </div>
                <div className="menu-item" onClick={handleLogout}>
                  <div className="menu-icon">🚪</div>
                  <div className="menu-text">退出登录</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            登录
          </Button>
        )}
      </div>
    </div>
  );
};
