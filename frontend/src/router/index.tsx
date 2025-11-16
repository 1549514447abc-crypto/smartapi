import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import App from '../App';
import { ProtectedRoute } from '../components/Route/ProtectedRoute';

// Lazy load pages
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const WorkflowStore = lazy(() => import('../pages/WorkflowStore'));
const PluginMarket = lazy(() => import('../pages/PluginMarket'));
const VideoExtract = lazy(() => import('../pages/VideoExtract'));
const Recharge = lazy(() => import('../pages/Recharge'));

// Loading component
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        )
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Login />
          </Suspense>
        )
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Register />
          </Suspense>
        )
      },
      {
        path: 'workflows',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <WorkflowStore />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: 'plugins',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <PluginMarket />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: 'video-extract',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <VideoExtract />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: 'recharge',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Recharge />
            </Suspense>
          </ProtectedRoute>
        )
      }
    ]
  }
]);
