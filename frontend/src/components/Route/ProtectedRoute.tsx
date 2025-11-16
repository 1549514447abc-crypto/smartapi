import { type ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      // 重定向到登录页面，并保存当前路径
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [isAuthenticated, navigate, location]);

  // 如果已登录，显示内容；否则返回null（因为会重定向）
  return isAuthenticated ? <>{children}</> : null;
};
