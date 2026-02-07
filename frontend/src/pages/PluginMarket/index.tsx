import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import {
  Puzzle,
  Search,
  Image,
  Video,
  FileText,
  Bot,
  Settings,
  Globe,
  Loader2,
  Star,
  Download,
  ChevronRight,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface Plugin {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  icon_url: string | null;
  version: string;
  install_count: number;
  rating: string | number;
  review_count: number;
  is_free: boolean;
  status: string;
  feishu_link: string | null;
  developer?: {
    id: number;
    username: string;
    nickname: string;
    avatar_url: string | null;
  };
}

interface PluginCategory {
  category_key: string;
  category_name: string;
  icon: string;
  plugin_count: number;
}

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case 'image':
      return <Image className="w-5 h-5" />;
    case 'video':
    case 'editing':
      return <Video className="w-5 h-5" />;
    case 'content':
      return <FileText className="w-5 h-5" />;
    case 'llm':
    case 'ai_image':
    case 'ai_video':
    case 'ai_digital':
      return <Bot className="w-5 h-5" />;
    case 'tools':
      return <Settings className="w-5 h-5" />;
    case 'scraping':
      return <Globe className="w-5 h-5" />;
    case 'voice':
    case 'music':
      return <Puzzle className="w-5 h-5" />;
    default:
      return <Puzzle className="w-5 h-5" />;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'image':
      return 'bg-violet-100 text-violet-600';
    case 'video':
    case 'editing':
      return 'bg-pink-100 text-pink-600';
    case 'content':
      return 'bg-emerald-100 text-emerald-600';
    case 'llm':
      return 'bg-sky-100 text-sky-600';
    case 'ai_image':
      return 'bg-purple-100 text-purple-600';
    case 'ai_video':
      return 'bg-rose-100 text-rose-600';
    case 'ai_digital':
      return 'bg-indigo-100 text-indigo-600';
    case 'tools':
      return 'bg-amber-100 text-amber-600';
    case 'scraping':
      return 'bg-orange-100 text-orange-600';
    case 'voice':
      return 'bg-cyan-100 text-cyan-600';
    case 'music':
      return 'bg-teal-100 text-teal-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const PluginMarket = () => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<PluginCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  useEffect(() => {
    fetchCategories();
    fetchPlugins();
  }, []);

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: PluginCategory[] }>('/plugin-categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('加载插件分类失败:', error);
      message.error('加载插件分类失败');
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          plugins: Plugin[];
          pagination: { total: number; page: number; limit: number; total_pages: number }
        }
      }>('/plugins');
      if (response.success && response.data.plugins) {
        setPlugins(response.data.plugins);
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
      message.error('获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const viewPluginDetail = (plugin: Plugin) => {
    // 待上线插件不可点击
    if (plugin.status === 'pending' || plugin.status === 'coming_soon') {
      message.info('该插件即将上线，敬请期待！');
      return;
    }
    navigate(`/plugin-market/${plugin.id}`);
  };

  const filteredPlugins = plugins
    .filter(p => {
      const matchCategory = category === 'all' || p.category === category || (category === 'other' && !p.category);
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.install_count || 0) - (a.install_count || 0);
      if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
      return 0;
    });

  const getCategoryCount = (catKey: string) => {
    if (catKey === 'all') return plugins.length;
    return plugins.filter(p => p.category === catKey || (catKey === 'other' && !p.category)).length;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* 左侧分类栏 - 移动端横向滚动 */}
      <div className="w-full lg:w-64 lg:flex-shrink-0 card p-3 lg:p-4">
        <h3 className="font-semibold text-slate-900 mb-3 lg:mb-4 flex items-center gap-2 text-sm lg:text-base">
          <Puzzle className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" />
          插件分类
        </h3>

        {categoryLoading ? (
          <div className="flex items-center justify-center py-4 lg:py-8">
            <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
            {categories.map((cat) => (
              <button
                key={cat.category_key}
                onClick={() => setCategory(cat.category_key)}
                className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-left transition-all whitespace-nowrap flex-shrink-0 lg:flex-shrink lg:w-full ${
                  category === cat.category_key
                    ? 'bg-sky-50 text-sky-600 border border-sky-200'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="text-base lg:text-lg">{cat.icon}</span>
                <span className="font-medium text-xs lg:text-sm">{cat.category_name}</span>
                <span className={`text-xs px-1.5 lg:px-2 py-0.5 rounded-full lg:ml-auto ${
                  category === cat.category_key
                    ? 'bg-sky-100 text-sky-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {getCategoryCount(cat.category_key)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 space-y-6">
        {/* 标题区域 */}
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200 to-sky-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Puzzle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">插件市场</h1>
                <p className="text-sm text-slate-500">丰富的API插件生态，一键安装即用</p>
              </div>
              <span className="tag tag-new ml-2">NEW</span>
            </div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索插件..."
              className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto appearance-none px-4 py-2.5 sm:py-3 pr-10 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 cursor-pointer"
            >
              <option value="popular">最受欢迎</option>
              <option value="rating">评分最高</option>
              <option value="latest">最新上架</option>
            </select>
            <ArrowUpDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 插件列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-sky-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredPlugins.map((plugin) => (
              <div
                key={plugin.id}
                onClick={() => viewPluginDetail(plugin)}
                className={`card p-4 sm:p-5 group ${plugin.status === 'pending' || plugin.status === 'coming_soon' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  {/* 图标 */}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(plugin.category)}`}>
                    {plugin.icon_url ? (
                      <img src={plugin.icon_url} alt={plugin.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                    ) : (
                      getCategoryIcon(plugin.category)
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={`font-semibold text-slate-900 transition-colors truncate text-sm sm:text-base ${plugin.status !== 'pending' && plugin.status !== 'coming_soon' ? 'group-hover:text-sky-600' : ''}`}>
                        {plugin.name}
                      </h3>
                      {plugin.status === 'pending' || plugin.status === 'coming_soon' ? (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium flex-shrink-0 ml-2">
                          敬请期待
                        </span>
                      ) : plugin.is_free ? (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-medium flex-shrink-0 ml-2">
                          免费
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium flex-shrink-0 ml-2">
                          付费
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-2 sm:mb-3">
                      {plugin.description || '暂无描述'}
                    </p>

                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-400">
                      {plugin.status === 'approved' ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
                            {Number(plugin.rating || 0).toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {plugin.install_count || 0}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">即将上线</span>
                      )}
                      <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-xs ${getCategoryColor(plugin.category)}`}>
                        {categories.find(c => c.category_key === plugin.category)?.category_name || plugin.category || '其他'}
                      </span>
                    </div>
                  </div>

                  {/* 箭头 - 待上线插件不显示 */}
                  {plugin.status !== 'pending' && plugin.status !== 'coming_soon' && (
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-hover:text-sky-500 transition-colors flex-shrink-0 self-center" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPlugins.length === 0 && !loading && (
          <div className="card p-8 sm:p-12 text-center">
            <Puzzle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-slate-300" />
            <p className="text-base sm:text-lg font-medium text-slate-500 mb-1">暂无插件</p>
            <p className="text-xs sm:text-sm text-slate-400">换个分类或关键词试试</p>
          </div>
        )}

        {/* 加载更多 */}
        {filteredPlugins.length > 0 && (
          <div className="text-center">
            <button className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors text-sm sm:text-base">
              <Sparkles className="w-4 h-4" />
              加载更多
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginMarket;
