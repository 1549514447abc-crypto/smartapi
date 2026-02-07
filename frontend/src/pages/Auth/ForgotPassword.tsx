import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  Lock,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Form state
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Error state
  const [phoneError, setPhoneError] = useState('');
  const [smsError, setSmsError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // Loading state
  const [smsLoading, setSmsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Success state
  const [resetSuccess, setResetSuccess] = useState(false);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send SMS code
  const handleSendCode = async () => {
    // Validate phone
    if (!phone) {
      setPhoneError('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError('手机号格式不正确');
      return;
    }
    setPhoneError('');

    setSmsLoading(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>(
        '/auth/sms/send-reset-code',
        { phone }
      );
      if (res.success) {
        message.success('验证码已发送');
        setCountdown(60);
      } else {
        message.error(res.error || res.message || '发送失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '发送验证码失败');
    } finally {
      setSmsLoading(false);
    }
  };

  // Submit reset password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    // Validate phone
    if (!phone) {
      setPhoneError('请输入手机号');
      hasError = true;
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError('手机号格式不正确');
      hasError = true;
    } else {
      setPhoneError('');
    }

    // Validate SMS code
    if (!smsCode) {
      setSmsError('请输入验证码');
      hasError = true;
    } else if (!/^\d{6}$/.test(smsCode)) {
      setSmsError('验证码为6位数字');
      hasError = true;
    } else {
      setSmsError('');
    }

    // Validate password
    if (!newPassword) {
      setPasswordError('请输入新密码');
      hasError = true;
    } else if (newPassword.length < 6) {
      setPasswordError('密码至少6个字符');
      hasError = true;
    } else {
      setPasswordError('');
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmError('请确认新密码');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setConfirmError('两次密码输入不一致');
      hasError = true;
    } else {
      setConfirmError('');
    }

    if (hasError) return;

    setSubmitLoading(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>(
        '/auth/sms/reset-password',
        { phone, code: smsCode, newPassword }
      );

      if (res.success) {
        setResetSuccess(true);
      } else {
        message.error(res.error || res.message || '重置失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '密码重置失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Success view
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">密码重置成功</h2>
          <p className="text-slate-500 mb-6">您的密码已成功重置，请使用新密码登录</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回登录
        </button>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">重置密码</h1>
            <p className="text-slate-500">通过手机验证码重置您的密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                手机号
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                    phoneError
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="请输入注册时使用的手机号"
                />
                <Smartphone className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
              </div>
              {phoneError && (
                <p className="mt-1 text-sm text-red-500">{phoneError}</p>
              )}
            </div>

            {/* SMS code input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                验证码
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                      smsError
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                    }`}
                    placeholder="请输入6位验证码"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={smsLoading || countdown > 0}
                  className={`px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    countdown > 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {smsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    '获取验证码'
                  )}
                </button>
              </div>
              {smsError && (
                <p className="mt-1 text-sm text-red-500">{smsError}</p>
              )}
            </div>

            {/* New password input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                新密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                    passwordError
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="请输入新密码（至少6位）"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            {/* Confirm password input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                确认新密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                    confirmError
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="请再次输入新密码"
                />
              </div>
              {confirmError && (
                <p className="mt-1 text-sm text-red-500">{confirmError}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {submitLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                '重置密码'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          想起密码了？
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-blue-600 hover:text-blue-700 ml-1"
          >
            返回登录
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
