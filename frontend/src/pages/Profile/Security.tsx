import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Security = () => {
  const navigate = useNavigate();

  // State
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Form state for change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error state
  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Check if user has password
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { hasPassword: boolean } }>('/auth/has-password');
        if (res.success) {
          setHasPassword(res.data.hasPassword);
        }
      } catch (error) {
        console.error('Failed to check password status:', error);
        message.error('获取密码状态失败');
      } finally {
        setLoading(false);
      }
    };
    checkPassword();
  }, []);

  // Handle set password (for users without password)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    if (!newPassword) {
      setNewPasswordError('请输入密码');
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('密码至少6个字符');
      hasError = true;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('请确认密码');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('两次密码输入不一致');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>(
        '/auth/set-password',
        { newPassword }
      );

      if (res.success) {
        message.success('密码设置成功');
        setHasPassword(true);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        message.error(res.error || res.message || '设置失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '密码设置失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle change password (for users with password)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    if (!oldPassword) {
      setOldPasswordError('请输入当前密码');
      hasError = true;
    } else {
      setOldPasswordError('');
    }

    if (!newPassword) {
      setNewPasswordError('请输入新密码');
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('新密码至少6个字符');
      hasError = true;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('请确认新密码');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('两次密码输入不一致');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>(
        '/auth/change-password',
        { oldPassword, newPassword }
      );

      if (res.success) {
        message.success('密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        message.error(res.error || res.message || '修改失败');
      }
    } catch (error: any) {
      message.error(error?.error || error?.message || '密码修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">账号安全</h1>
          <p className="text-sm text-slate-500">管理您的账号密码</p>
        </div>
      </div>

      {/* Password Card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {hasPassword ? '修改密码' : '设置密码'}
            </h2>
            <p className="text-sm text-slate-500">
              {hasPassword
                ? '定期修改密码可以提高账号安全性'
                : '设置密码后可以使用用户名+密码登录'}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${
          hasPassword ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {hasPassword ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">已设置密码</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">尚未设置密码（当前使用手机验证码登录）</span>
            </>
          )}
        </div>

        {/* Password Form */}
        <form onSubmit={hasPassword ? handleChangePassword : handleSetPassword} className="space-y-4">
          {/* Old password (only for change password) */}
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                当前密码
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                    oldPasswordError
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="请输入当前密码"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
              </div>
              {oldPasswordError && (
                <p className="mt-1 text-sm text-red-500">{oldPasswordError}</p>
              )}
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {hasPassword ? '新密码' : '密码'}
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                  newPasswordError
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                }`}
                placeholder={hasPassword ? '请输入新密码（至少6位）' : '请输入密码（至少6位）'}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {newPasswordError && (
              <p className="mt-1 text-sm text-red-500">{newPasswordError}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              确认{hasPassword ? '新' : ''}密码
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl outline-none transition-all placeholder-slate-400 text-slate-700 ${
                  confirmPasswordError
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                }`}
                placeholder={`请再次输入${hasPassword ? '新' : ''}密码`}
              />
            </div>
            {confirmPasswordError && (
              <p className="mt-1 text-sm text-red-500">{confirmPasswordError}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              hasPassword ? '确认修改' : '设置密码'
            )}
          </button>
        </form>

        {/* Forgot password link (only for users with password) */}
        {hasPassword && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              忘记当前密码？通过手机验证码重置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;
