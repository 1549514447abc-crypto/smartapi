import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  MessageSquareText,
  Search,
  Crown,
  Lock,
  Copy,
  Check,
  Sparkles,
  Eye,
  ShoppingCart,
  X
} from 'lucide-react';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';

interface Prompt {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[] | null;
  price: number;
  cover_url: string | null;
  author: string | null;
  usage_count: number;
  purchase_count: number;
  is_owned: boolean;
}

interface PromptListResponse {
  success: boolean;
  data: {
    list: Prompt[];
    total: number;
    page: number;
    pageSize: number;
    is_yearly_member: boolean;
  };
}

interface Category {
  key: string;
  name: string;
  count: number;
}

const PromptMarket = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuthStore();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [isYearlyMember, setIsYearlyMember] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);

  useEffect(() => {
    fetchPrompts();
    fetchCategories();
  }, [selectedCategory, keyword]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, pageSize: 50 };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (keyword) params.keyword = keyword;

      const response = await api.get<PromptListResponse>('/prompts/list', { params });
      if (response.success) {
        setPrompts(response.data.list);
        setIsYearlyMember(response.data.is_yearly_member);
      }
    } catch (error) {
      console.error('获取提示词列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Category[] }>('/prompts/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const handlePromptClick = async (prompt: Prompt) => {
    try {
      const response = await api.get<{ success: boolean; data: Prompt }>(`/prompts/detail/${prompt.id}`);
      if (response.success) {
        setSelectedPrompt(response.data);
        setShowDetail(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/prompt-market' } });
      return;
    }

    if (!selectedPrompt) return;

    // 如果是会员或已拥有，直接关闭弹窗
    if (selectedPrompt.is_owned || isYearlyMember) {
      message.success('您已拥有此提示词');
      return;
    }

    // 显示购买确认弹窗
    setShowPurchaseConfirm(true);
  };

  const confirmPurchase = async () => {
    if (!selectedPrompt) return;

    try {
      setPurchasing(true);
      const response = await api.post<{ success: boolean; message: string; data: { prompt: Prompt; new_balance: number } }>(
        `/prompts/purchase/${selectedPrompt.id}`
      );
      if (response.success) {
        message.success(response.message || '购买成功');
        // 刷新用户信息和提示词列表
        refreshUser();
        fetchPrompts();
        // 使用后端返回的完整提示词数据更新当前选中的提示词
        if (response.data?.prompt) {
          setSelectedPrompt({ ...response.data.prompt, is_owned: true });
        } else {
          setSelectedPrompt({ ...selectedPrompt, is_owned: true });
        }
        setShowPurchaseConfirm(false);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '购买失败');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCopy = async () => {
    if (selectedPrompt?.content) {
      try {
        // 尝试使用现代 API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(selectedPrompt.content);
        } else {
          // 回退方案：创建临时文本区域
          const textArea = document.createElement('textarea');
          textArea.value = selectedPrompt.content;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopied(true);
        message.success('已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
    }
  };

  const getCategoryCount = (key: string) => {
    if (key === 'all') {
      return categories.reduce((sum, c) => sum + c.count, 0);
    }
    return categories.find(c => c.key === key)?.count || 0;
  };

  const getCategoryLabel = (key: string) => {
    if (key === 'all') return '全部';
    return categories.find(c => c.key === key)?.name || key;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200 via-purple-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
              <MessageSquareText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">提示词市场</h1>
              <p className="text-sm text-slate-500">精选优质 AI 提示词，助你高效创作</p>
            </div>
          </div>

          {/* 会员提示 */}
          {isAuthenticated && isYearlyMember && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">您是年度会员，可免费查看所有提示词</span>
            </div>
          )}

          {isAuthenticated && !isYearlyMember && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">开通年度会员可免费查看所有提示词</span>
              <button
                onClick={() => navigate('/membership')}
                className="text-sm text-violet-600 font-medium hover:text-violet-700"
              >
                去开通 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索和分类 */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* 全部按钮 */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部
            {getCategoryCount('all') > 0 && (
              <span className="ml-1 opacity-70">({getCategoryCount('all')})</span>
            )}
          </button>
          {/* 动态分类按钮 */}
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.key
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
              {cat.count > 0 && (
                <span className="ml-1 opacity-70">({cat.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 提示词列表 */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-500 mt-4">加载中...</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquareText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无提示词</h3>
          <p className="text-slate-500">该分类下暂无提示词，请稍后再来</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => handlePromptClick(prompt)}
              className="card p-5 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate group-hover:text-violet-600 transition-colors">
                    {prompt.title}
                  </h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-600">
                    {getCategoryLabel(prompt.category)}
                  </span>
                </div>
                {prompt.is_owned || isYearlyMember ? (
                  <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-medium">
                    已拥有
                  </span>
                ) : (
                  <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold">
                    ¥{prompt.price}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                {prompt.description}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {prompt.usage_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {prompt.purchase_count}
                  </span>
                </div>
                {prompt.author && <span>{prompt.author}</span>}
              </div>

              {/* 标签 */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {prompt.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetail && selectedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedPrompt.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-600">
                      {getCategoryLabel(selectedPrompt.category)}
                    </span>
                    {selectedPrompt.tags?.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-2">简介</h4>
                <p className="text-slate-700">{selectedPrompt.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">提示词内容</h4>
                <div className="relative">
                  <div className={`p-4 rounded-lg bg-slate-50 border border-slate-200 ${
                    !selectedPrompt.is_owned && !isYearlyMember ? 'blur-sm select-none' : ''
                  }`}>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                      {selectedPrompt.content}
                    </pre>
                  </div>

                  {/* 未购买遮罩 */}
                  {!selectedPrompt.is_owned && !isYearlyMember && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-lg">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600 font-medium">购买后查看完整内容</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedPrompt.usage_count} 次使用
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" />
                    {selectedPrompt.purchase_count} 人购买
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {selectedPrompt.is_owned || isYearlyMember ? (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium shadow-lg shadow-violet-200 hover:shadow-xl transition-all"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已复制' : '复制提示词'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      ¥{selectedPrompt.price} 购买
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 购买确认弹窗 */}
      {showPurchaseConfirm && selectedPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPurchaseConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">确认购买</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-slate-900 mb-1">{selectedPrompt.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-2">{selectedPrompt.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">提示词价格</span>
                  <span className="text-xl font-bold text-orange-500">¥{selectedPrompt.price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">当前余额</span>
                  <span className={`font-medium ${Number(user?.balance || 0) >= selectedPrompt.price ? 'text-emerald-600' : 'text-red-500'}`}>
                    ¥{Number(user?.balance || 0).toFixed(2)}
                  </span>
                </div>
                {Number(user?.balance || 0) < selectedPrompt.price && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-red-600 text-sm font-medium">余额不足，请先充值</p>
                    <button
                      onClick={() => {
                        setShowPurchaseConfirm(false);
                        setShowDetail(false);
                        navigate('/recharge');
                      }}
                      className="mt-2 text-sm text-red-600 underline hover:text-red-700"
                    >
                      去充值 →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowPurchaseConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing || Number(user?.balance || 0) < selectedPrompt.price}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium shadow-lg shadow-orange-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing ? '购买中...' : '确认购买'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptMarket;
