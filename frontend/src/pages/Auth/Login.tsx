import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import type { LoginRequest } from '../../types/auth';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Puzzle
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  });

  const validate = () => {
    const newErrors = { username: '', password: '' };
    let isValid = true;

    if (!formData.username) {
      newErrors.username = '请输入用户名';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(formData as LoginRequest);
      message.success('登录成功！');
      const from = (location.state as { from?: string })?.from || '/';
      navigate(from);
    } catch (error: unknown) {
      const err = error as { message?: string; error?: string };
      const errorMessage = err?.message || err?.error || '登录失败，请检查用户名和密码';
      message.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-400 via-emerald-400 to-teal-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-xl">
              S
            </div>
            <span className="text-2xl font-bold text-white">SmartAPI</span>
          </div>
        </div>

        {/* 主内容 */}
        <div className="relative">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            智能内容创作平台<br />
            让创作更高效
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-md">
            为内容创作者提供专业工具，覆盖视频文案提取、API插件市场、自动化工作流等核心功能
          </p>

          {/* 特性列表 */}
          <div className="space-y-4">
            {[
              { icon: Zap, text: '秒级视频文案提取' },
              { icon: Puzzle, text: '56+ 优质API插件' },
              { icon: Shield, text: '安全稳定，数据加密' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <item.icon className="w-4 h-4" />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="relative text-white/60 text-sm">
          <p>SmartAPI © 2025 All rights reserved.</p>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-sky-50">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
              S
            </div>
            <span className="text-2xl font-bold text-slate-900">SmartAPI</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎回来</h2>
            <p className="text-slate-500">登录到创作魔方 Content Cube</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border ${
                    errors.username ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all`}
                  placeholder="请输入用户名"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all`}
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold text-lg shadow-lg shadow-sky-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  登录
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-slate-500">还没有账号？</span>
            <button
              onClick={() => navigate('/register')}
              className="ml-2 text-sky-600 font-medium hover:text-sky-700"
            >
              立即注册
            </button>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              测试账号：admin / 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
