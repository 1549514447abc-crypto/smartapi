import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  FileText,
  ArrowLeft,
  Building2,
  Mail,
  DollarSign,
  CheckCircle,
  Loader2,
  Clock,
  XCircle,
  AlertCircle,
  History
} from 'lucide-react';

interface InvoiceApplication {
  id: number;
  invoice_type: 'normal' | 'special';
  title: string;
  tax_number: string | null;
  amount: number;
  email: string;
  remark: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  admin_remark: string | null;
  created_at: string;
  processed_at: string | null;
}

interface InvoiceQuota {
  total_consumed: number;
  total_invoiced: number;
  available_amount: number;
}

const Invoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<InvoiceApplication | null>(null);
  const [historyList, setHistoryList] = useState<InvoiceApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [quota, setQuota] = useState<InvoiceQuota | null>(null);
  const [form, setForm] = useState({
    invoice_type: 'normal',
    title: '',
    tax_number: '',
    amount: '',
    email: '',
    remark: ''
  });

  useEffect(() => {
    fetchInvoiceStatus();
  }, []);

  const fetchInvoiceStatus = async () => {
    try {
      // 并行获取申请列表和开票额度
      const [listResponse, quotaResponse] = await Promise.all([
        api.get('/invoice/my'),
        api.get('/invoice/quota')
      ]);

      if (listResponse.success) {
        const applications = listResponse.data?.list || [];
        // 找到待处理或处理中的申请
        const pending = applications.find(
          (app: InvoiceApplication) => app.status === 'pending' || app.status === 'processing'
        );
        setCurrentApplication(pending || null);
        setHistoryList(applications);
        // 如果没有待处理的申请，显示表单
        setShowForm(!pending);
      }

      if (quotaResponse.success) {
        setQuota(quotaResponse.data);
      }
    } catch (error) {
      console.error('Fetch invoice status error:', error);
      // 接口不存在时默认显示表单
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!form.title.trim()) {
      message.warning('请输入发票抬头');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      message.warning('请输入有效的开票金额');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      message.warning('请输入有效的邮箱地址');
      return;
    }
    if (form.invoice_type === 'special' && !form.tax_number.trim()) {
      message.warning('专用发票需要填写税号');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/invoice/apply', form);
      if (response.success) {
        message.success('申请已提交');
        fetchInvoiceStatus();
        setShowForm(false);
      } else {
        message.error(response.message || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit invoice error:', error);
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      pending: {
        label: '待处理',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        icon: <Clock className="w-5 h-5" />
      },
      processing: {
        label: '处理中',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: <Loader2 className="w-5 h-5 animate-spin" />
      },
      completed: {
        label: '已完成',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        icon: <CheckCircle className="w-5 h-5" />
      },
      rejected: {
        label: '已拒绝',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: <XCircle className="w-5 h-5" />
      }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // 历史记录视图
  if (showHistory) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
          <div className="relative flex items-center gap-4">
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">历史申请</h1>
              <p className="text-sm text-slate-500">共 {historyList.length} 条记录</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {historyList.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              暂无申请记录
            </div>
          ) : (
            historyList.map((item) => {
              const statusConfig = getStatusConfig(item.status);
              return (
                <div key={item.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500">
                        {item.invoice_type === 'normal' ? '普通发票' : '专用发票'} · ¥{Number(item.amount).toFixed(2)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    申请时间：{new Date(item.created_at).toLocaleString()}
                  </div>
                  {item.admin_remark && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                      备注：{item.admin_remark}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 有待处理的申请，显示状态
  if (currentApplication && !showForm) {
    const statusConfig = getStatusConfig(currentApplication.status);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
          <div className="relative flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">开票申请</h1>
              <p className="text-sm text-slate-500">查看申请状态</p>
            </div>
          </div>
        </div>

        {/* 当前申请状态 */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-full ${statusConfig.bgColor} ${statusConfig.color} flex items-center justify-center`}>
              {statusConfig.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{statusConfig.label}</h2>
              <p className="text-sm text-slate-500">
                {currentApplication.status === 'pending' && '您的申请正在等待处理'}
                {currentApplication.status === 'processing' && '工作人员正在处理您的申请'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">发票类型</p>
                <p className="font-medium text-slate-900">
                  {currentApplication.invoice_type === 'normal' ? '普通发票' : '专用发票'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">开票金额</p>
                <p className="font-medium text-slate-900">¥{Number(currentApplication.amount).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400">发票抬头</p>
              <p className="font-medium text-slate-900">{currentApplication.title}</p>
            </div>
            {currentApplication.tax_number && (
              <div>
                <p className="text-xs text-slate-400">税号</p>
                <p className="font-medium text-slate-900">{currentApplication.tax_number}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400">接收邮箱</p>
              <p className="font-medium text-slate-900">{currentApplication.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">申请时间</p>
              <p className="font-medium text-slate-900">
                {new Date(currentApplication.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              当前有正在处理的申请，处理完成后才能提交新的申请。发票将在处理完成后发送到您的邮箱。
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowHistory(true)}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <History className="w-5 h-5" />
            历史记录
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-shadow"
          >
            返回个人中心
          </button>
        </div>
      </div>
    );
  }

  // 申请表单
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">开票申请</h1>
              <p className="text-sm text-slate-500">申请电子发票，发送至您的邮箱</p>
            </div>
          </div>
          {historyList.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
              title="历史记录"
            >
              <History className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 开票额度信息 */}
      {quota && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-500" />
            开票额度
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">累计消费</p>
              <p className="text-lg font-bold text-slate-900">¥{quota.total_consumed.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">已开票</p>
              <p className="text-lg font-bold text-slate-600">¥{quota.total_invoiced.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-emerald-600 mb-1">可开票</p>
              <p className="text-lg font-bold text-emerald-600">¥{quota.available_amount.toFixed(2)}</p>
            </div>
          </div>
          {quota.available_amount <= 0 && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>您当前没有可开票余额，消费后才可申请开票</span>
            </div>
          )}
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* 发票类型 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">发票类型</label>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.invoice_type === 'normal'
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="invoice_type"
                value="normal"
                checked={form.invoice_type === 'normal'}
                onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
                className="sr-only"
              />
              <div className="text-center">
                <p className="font-semibold text-slate-900">普通发票</p>
                <p className="text-xs text-slate-500 mt-1">个人或企业均可使用</p>
              </div>
            </label>
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.invoice_type === 'special'
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="invoice_type"
                value="special"
                checked={form.invoice_type === 'special'}
                onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
                className="sr-only"
              />
              <div className="text-center">
                <p className="font-semibold text-slate-900">专用发票</p>
                <p className="text-xs text-slate-500 mt-1">仅限企业，可抵扣税款</p>
              </div>
            </label>
          </div>
        </div>

        {/* 发票抬头 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1" />
            发票抬头 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="请输入公司名称或个人姓名"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          />
        </div>

        {/* 税号（专票必填） */}
        {form.invoice_type === 'special' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              纳税人识别号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.tax_number}
              onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              placeholder="请输入15-20位税号"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>
        )}

        {/* 开票金额 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            开票金额 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max={quota?.available_amount || undefined}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">
              可开票金额：<span className="text-emerald-600 font-medium">¥{quota?.available_amount.toFixed(2) || '0.00'}</span>
            </p>
            {quota && quota.available_amount > 0 && (
              <button
                type="button"
                onClick={() => setForm({ ...form, amount: quota.available_amount.toFixed(2) })}
                className="text-xs text-violet-500 hover:text-violet-600"
              >
                全部开票
              </button>
            )}
          </div>
        </div>

        {/* 接收邮箱 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            接收邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="请输入接收发票的邮箱"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          />
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">备注（选填）</label>
          <textarea
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
            placeholder="如有特殊要求请备注"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              提交中...
            </>
          ) : (
            '提交申请'
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          提交后，发票将在一周左右发送到您的邮箱
        </p>
      </form>
    </div>
  );
};

export default Invoice;
