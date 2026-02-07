import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import OAuthCallback from './pages/Auth/OAuthCallback';
import FollowGuide from './pages/Auth/FollowGuide';
import VideoExtract from './pages/VideoExtract';
import WorkflowStore from './pages/WorkflowStore';
import WorkflowDetail from './pages/WorkflowStore/WorkflowDetail';
import PluginMarket from './pages/PluginMarket';
import PluginDetail from './pages/PluginMarket/PluginDetail';
import PromptMarket from './pages/PromptMarket';
import Recharge from './pages/Recharge';
import PaymentResult from './pages/Recharge/PaymentResult';
import Profile from './pages/Profile';
import Security from './pages/Profile/Security';
import CourseLanding from './pages/Course/CourseLanding';
import CourseTrial from './pages/Course';
import Preview from './pages/Course/Preview';
import Payment from './pages/Course/Payment';
import Referral from './pages/Referral';
import Commission from './pages/Commission';
import JianyingHelper from './pages/JianyingHelper';
import MarketDetail from './pages/MarketDetail';
import Membership from './pages/Membership';
import Orders from './pages/Orders';
import Transactions from './pages/Transactions';
import Invoice from './pages/Invoice';

export const router = createBrowserRouter([
  // 支付结果页面（独立页面，不在App布局内）
  {
    path: '/payment/result',
    element: <PaymentResult />
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'video-extract',
        element: <VideoExtract />
      },
      {
        path: 'workflow-store',
        element: <WorkflowStore />
      },
      {
        path: 'workflow-store/:id',
        element: <WorkflowDetail />
      },
      {
        path: 'plugin-market',
        element: <PluginMarket />
      },
      {
        path: 'plugin-market/:id',
        element: <PluginDetail />
      },
      {
        path: 'prompt-market',
        element: <PromptMarket />
      },
      {
        path: 'recharge',
        element: <Recharge />
      },
      {
        path: 'profile',
        element: <Profile />
      },
      {
        path: 'profile/security',
        element: <Security />
      },
      {
        path: 'course',
        element: <CourseLanding />
      },
      {
        path: 'course/trial',
        element: <CourseTrial />
      },
      {
        path: 'course/preview',
        element: <Preview />
      },
      {
        path: 'course/payment',
        element: <Payment />
      },
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />
      },
      {
        path: 'oauth-callback',
        element: <OAuthCallback />
      },
      {
        path: 'follow-guide',
        element: <FollowGuide />
      },
      {
        path: 'referral',
        element: <Referral />
      },
      {
        path: 'commission',
        element: <Commission />
      },
      {
        path: 'jianying-helper',
        element: <JianyingHelper />
      },
      {
        path: 'market/:slug',
        element: <MarketDetail />
      },
      {
        path: 'membership',
        element: <Membership />
      },
      {
        path: 'orders',
        element: <Orders />
      },
      {
        path: 'transactions',
        element: <Transactions />
      },
      {
        path: 'invoice',
        element: <Invoice />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
], {
  basename: '/smartapi'
});
