import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import type { RegisterRequest } from '../../types/auth';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Gift,
  Zap,
  Shield,
  Puzzle,
  Check
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const { register, loading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirm: ''
  });

  const validate = () => {
    const newErrors = { username: '', email: '', password: '', confirm: '' };
    let isValid = true;

    if (!formData.username) {
      newErrors.username = '请输入用户名';
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少3个字符';
      isValid = false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少6个字符';
      isValid = false;
    }

    if (!formData.confirm) {
      newErrors.confirm = '请确认密码';
      isValid = false;
    } else if (formData.password !== formData.confirm) {
      newErrors.confirm = '两次输入的密码不一致';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const registerData: RegisterRequest = {
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        referral_code: referralCode || undefined
      };
      await register(registerData);
      message.success('注册成功！');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err?.message || '注册失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-500 p-12 flex-col justify-between relative overflow-hidden">
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
            加入 SmartAPI<br />
            开启智能创作之旅
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-md">
            注册即可获得专属 API 密钥，免费体验全平台功能
          </p>

          {/* 特性列表 */}
          <div className="space-y-4">
            {[
              { icon: Gift, text: '新用户专属福利' },
              { icon: Zap, text: '即时开通，秒级响应' },
              { icon: Puzzle, text: '全平台功能免费试用' },
              { icon: Shield, text: '数据安全，隐私保护' }
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

      {/* 右侧注册表单 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
              S
            </div>
            <span className="text-2xl font-bold text-slate-900">SmartAPI</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">创建账号</h2>
            <p className="text-slate-500">加入创作魔方 Content Cube</p>
          </div>

          {/* 推广码提示 */}
          {referralCode && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-700 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                已使用推广码注册，享受专属优惠
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border ${
                    errors.username ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all`}
                  placeholder="请输入用户名"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                邮箱 <span className="text-slate-400">(可选)</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all`}
                  placeholder="请输入邮箱"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all`}
                  placeholder="请输入密码（至少6位）"
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm}
                  onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border ${
                    errors.confirm ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  } text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all`}
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="mt-1 text-sm text-red-500">{errors.confirm}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  注册
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-slate-500">已有账号？</span>
            <button
              onClick={() => navigate('/login')}
              className="ml-2 text-emerald-600 font-medium hover:text-emerald-700"
            >
              立即登录
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            <p className="flex items-center justify-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              注册即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
