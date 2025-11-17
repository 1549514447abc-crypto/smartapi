import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VideoExtract from './pages/VideoExtract';
import WorkflowStore from './pages/WorkflowStore';
import PluginMarket from './pages/PluginMarket';
import PluginDetail from './pages/PluginMarket/PluginDetail';
import Recharge from './pages/Recharge';
import Profile from './pages/Profile';
import Course from './pages/Course';
import Preview from './pages/Course/Preview';
import Payment from './pages/Course/Payment';

export const router = createBrowserRouter([
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
        path: 'plugin-market',
        element: <PluginMarket />
      },
      {
        path: 'plugin-market/:id',
        element: <PluginDetail />
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
        path: 'course',
        element: <Course />
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
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
], {
  basename: '/smartapi'
});
