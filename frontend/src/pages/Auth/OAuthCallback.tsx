import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';

/**
 * OAuth回调页面
 * 处理微信OAuth授权后的回调
 * URL: /oauth-callback?token=xxx&redirect=/commission
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const redirect = searchParams.get('redirect') || '/';

      console.log('[OAuth回调] token:', token ? '已获取' : '未获取');
      console.log('[OAuth回调] redirect:', redirect);

      if (!token) {
        setError('登录失败：未获取到token');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      try {
        // 先保存token到localStorage
        localStorage.setItem('token', token);

        // 用token获取用户信息
        const response = await api.get<{ success: boolean; data: any }>('/auth/me');

        if (response.success && response.data) {
          // 设置认证状态
          setAuth(token, response.data);
          console.log('[OAuth回调] 登录成功，用户:', response.data.username);

          // 跳转到目标页面
          navigate(redirect, { replace: true });
        } else {
          throw new Error('获取用户信息失败');
        }
      } catch (err: any) {
        console.error('[OAuth回调] 处理失败:', err);
        setError(err.message || '登录失败');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        {error ? (
          <div className="text-red-500">
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-slate-500 mt-2">正在跳转到登录页...</p>
          </div>
        ) : (
          <>
            <Spin size="large" />
            <p className="mt-4 text-slate-600">正在登录...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
