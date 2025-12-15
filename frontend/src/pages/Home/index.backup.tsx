import { useNavigate } from 'react-router-dom';
import {
  Video,
  Puzzle,
  Store,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Users,
  Zap,
  Layers,
  Sparkles,
  Play
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="card p-5 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-32 lg:w-48 h-32 lg:h-48 bg-gradient-to-tr from-sky-200 to-emerald-200 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

        <div className="relative">
          <div className="flex items-center gap-2 lg:gap-3 mb-4 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs lg:text-sm text-emerald-600 font-medium">平台运行中</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-xs lg:text-sm text-slate-500 hidden sm:inline">已服务 10,000+ 用户</span>
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold mb-3 lg:mb-4 leading-tight text-slate-900">
            智能内容创作平台<br/>
            <span style={{ background: 'linear-gradient(to right, #0ea5e9, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              让创作更高效
            </span>
          </h1>

          <p className="text-sm lg:text-lg text-slate-500 max-w-xl mb-4 lg:mb-6 leading-relaxed">
            为内容创作者提供专业工具，覆盖视频文案提取、API插件市场、自动化工作流等核心功能
          </p>

          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/video-extract' : '/register')}
              className="flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow text-sm lg:text-base"
            >
              {isAuthenticated ? '开始使用' : '免费注册'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/course')}
              className="flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 transition-colors text-sm lg:text-base"
            >
              <Play className="w-4 h-4" />
              观看教程
            </button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="card p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs lg:text-sm text-slate-500">插件数量</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">56+</p>
            </div>
          </div>
          <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-slate-100 text-xs text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
            <TrendingUp className="w-3 h-3" />
            持续更新中
          </div>
        </div>

        <div className="card p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs lg:text-sm text-slate-500">工作流</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">1000+</p>
            </div>
          </div>
          <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-slate-100 text-xs text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
            <TrendingUp className="w-3 h-3" />
            覆盖主流平台
          </div>
        </div>

        <div className="card p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs lg:text-sm text-slate-500">服务用户</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">1万+</p>
            </div>
          </div>
          <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-slate-100 text-xs text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
            <TrendingUp className="w-3 h-3" />
            +25% 月增长
          </div>
        </div>

        <div className="card p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs lg:text-sm text-slate-500">API调用</p>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">1亿+</p>
            </div>
          </div>
          <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-slate-100 text-xs text-pink-600 flex items-center justify-center sm:justify-start gap-1">
            <Sparkles className="w-3 h-3" />
            稳定可靠
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900">核心功能</h2>
            <p className="text-xs lg:text-sm text-slate-500">为内容创作者打造的专业工具集</p>
          </div>
          <button className="flex items-center gap-1 text-xs lg:text-sm text-sky-600 hover:text-sky-700">
            查看全部
            <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* 视频文案提取 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/video-extract')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <span className="tag tag-hot">HOT</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">视频文案提取</h3>
            <p className="text-slate-500 text-sm mb-4">
              支持抖音、小红书、B站、快手等主流平台，一键提取视频文案
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                10+ 平台
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                秒级响应
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <div className="platform-icon bg-rose-100 text-rose-600 text-xs">抖</div>
              <div className="platform-icon bg-red-100 text-red-600 text-xs">小</div>
              <div className="platform-icon bg-pink-100 text-pink-600 text-xs">B</div>
              <div className="platform-icon bg-orange-100 text-orange-600 text-xs">快</div>
            </div>
          </div>

          {/* 插件市场 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/plugin-market')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Puzzle className="w-6 h-6" />
              </div>
              <span className="tag tag-new">NEW</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">插件市场</h3>
            <p className="text-slate-500 text-sm mb-4">
              丰富的API插件生态，涵盖图像处理、视频生成、大模型接口等
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Puzzle className="w-4 h-4" />
                56+ 插件
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                持续更新
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs text-white font-bold">G</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 border-2 border-white flex items-center justify-center text-xs text-white font-bold">C</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white flex items-center justify-center text-xs text-white font-bold">M</div>
              </div>
              <span className="text-xs text-slate-500">GPT-4, Claude, MJ...</span>
            </div>
          </div>

          {/* 工作流商店 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/workflow-store')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <span className="tag tag-soon">SOON</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">工作流商店</h3>
            <p className="text-slate-500 text-sm mb-4">
              Coze、Make、N8N等主流平台的精品工作流模板
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                1000+ 模板
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Zap className="w-4 h-4" />
              即将上线
            </div>
          </div>

          {/* 课程中心 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/course')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">课程中心</h3>
            <p className="text-slate-500 text-sm mb-4">
              从入门到精通，系统学习内容创作和自动化技能
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4" />
                视频教程
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-700">
              <span>精品课程</span>
              <span className="text-violet-600 font-semibold">¥199起</span>
            </div>
          </div>

          {/* 推广返积分 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/referral')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">推广返积分</h3>
            <p className="text-slate-500 text-sm mb-4">
              邀请好友购买课程/会员，获得10%积分返利
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                积分可抵扣
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 font-medium">10%返利</span>
              <span className="text-xs text-slate-500">课程/会员购买</span>
            </div>
          </div>

          {/* 充值中心 */}
          <div
            className="card p-6 cursor-pointer"
            onClick={() => navigate('/recharge')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">充值中心</h3>
            <p className="text-slate-500 text-sm mb-4">
              灵活的充值方案，满100送20限时优惠
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                限时活动
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 font-medium">满100送20</span>
              <span className="text-xs text-slate-500">限时优惠</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-4 lg:pt-6 mt-4 lg:mt-6 text-xs lg:text-sm text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center text-white font-black text-xs lg:text-sm">
            S
          </div>
          <span>SmartAPI © 2025</span>
        </div>
        <div className="flex items-center gap-4 lg:gap-6">
          <a className="hover:text-slate-800 transition-colors cursor-pointer">关于我们</a>
          <a className="hover:text-slate-800 transition-colors cursor-pointer">API文档</a>
          <a className="hover:text-slate-800 transition-colors cursor-pointer">联系我们</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
