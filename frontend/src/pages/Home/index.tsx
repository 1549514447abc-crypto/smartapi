import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import './Home.css';

// 轮播图数据
const carouselData = [
  {
    id: 1,
    gradient: 'from-violet-600 to-purple-700',
    badge: '🔥 限时优惠',
    title: 'AI智能体开发插件',
    subtitle: '为 Coze、Dify 等平台提供强大的扩展能力',
    subtitle2: '轻松获取第三方平台数据',
    btnPrimary: { text: '立即体验', color: '#7c3aed' },
    btnSecondary: '了解更多',
  },
  {
    id: 2,
    gradient: 'from-pink-500 to-rose-600',
    badge: '📚 精品课程',
    title: 'Coze实战训练营',
    subtitle: '从零基础到商业落地',
    subtitle2: '100节系统课程 + 31个实战项目',
    btnPrimary: { text: '¥799 立即购买', color: '#db2777' },
    btnSecondary: '免费试听',
  },
  {
    id: 3,
    gradient: 'from-cyan-500 to-blue-600',
    badge: '✨ 新功能上线',
    title: '提示词市场',
    subtitle: '精选优质提示词模板',
    subtitle2: '一键复制，快速提升AI效率',
    btnPrimary: { text: '浏览市场', color: '#0891b2' },
    btnSecondary: null,
  },
];

// 产品视频数据
const productVideos = [
  {
    id: 'tuiguang',
    title: '推广挣钱',
    description: '成为速推AIGC分销合伙人，共享AI创新红利。推荐客户购买速推AIGC产品，享受高额佣金返利。官方代理授权，助力您轻松开启AI副业之旅。让每一次分享都成为收入。',
    tags: [
      { text: '高额佣金', color: 'bg-orange-100 text-orange-700' },
      { text: '官方授权', color: 'bg-blue-100 text-blue-700' },
      { text: '被动收入', color: 'bg-purple-100 text-purple-700' },
    ],
    btnText: '立即加入',
    btnGradient: 'from-orange-600 to-amber-600',
    link: '/referral',
    videoUrl: 'https://video-translate-web.oss-cn-beijing.aliyuncs.com/image/tuiguang.mp4',
    layout: 'right', // 视频在右边
  },
  {
    id: 'jianying',
    title: '剪映小助手',
    description: '一键将AI生成的视频内容导入剪映，快速完成剪辑与合成，支持本地草稿与云端MP4。智能化一键生成剪映草稿，与本地剪映无缝对接，让创作效率倍增。',
    tags: [
      { text: '极速导入', color: 'bg-violet-100 text-violet-700' },
      { text: '智能合成', color: 'bg-pink-100 text-pink-700' },
      { text: '云端渲染', color: 'bg-sky-100 text-sky-700' },
    ],
    btnText: '前往下载',
    btnGradient: 'from-violet-600 to-purple-600',
    link: '/jianying-helper',
    videoUrl: 'https://video-translate-web.oss-cn-beijing.aliyuncs.com/image/xiaozhushou.mp4',
    layout: 'left', // 视频在左边
  },
  {
    id: 'course',
    title: 'AI智能体学堂',
    description: '从入门到精通，一站式AI智能体创建与管理学习平台。零基础入门，快速上手AI工作流，实用案例教程，解锁AI创作潜能。定期更新，掌握最新AI技术动态。',
    tags: [
      { text: '零基础入门', color: 'bg-emerald-100 text-emerald-700' },
      { text: '实用案例', color: 'bg-amber-100 text-amber-700' },
      { text: '快速上手', color: 'bg-cyan-100 text-cyan-700' },
    ],
    btnText: '立即学习',
    btnGradient: 'from-emerald-600 to-teal-600',
    link: '/course',
    videoUrl: 'https://video-translate-web.oss-cn-beijing.aliyuncs.com/image/kechengyindao.mp4',
    layout: 'right',
  },
  {
    id: 'plugins',
    title: '海量插件',
    description: '提供丰富多样的高效能插件，包含视频合成、视频转音频、全平台视频下载、图生视频、声音克隆、获取第三方平台数据等插件。满足您各种AI智能体开发需求。',
    tags: [
      { text: '视频合成', color: 'bg-red-100 text-red-700' },
      { text: '声音克隆', color: 'bg-indigo-100 text-indigo-700' },
      { text: '平台数据获取', color: 'bg-green-100 text-green-700' },
    ],
    btnText: '前往查看',
    btnGradient: 'from-red-600 to-pink-600',
    link: '/plugin-market',
    videoUrl: 'https://video-translate-web.oss-cn-beijing.aliyuncs.com/image/chajian.mp4',
    layout: 'left',
  },
];

// 插件网格数据
const pluginGrid = [
  { name: '视频合成', desc: '可将视频素材、图片素材合成视频，支持BGM、配音、转场动画、贴纸等', gradient: 'from-violet-500 to-purple-600' },
  { name: '视频转音频', desc: '可将视频中的音频提取出来，支持多种音频格式', gradient: 'from-sky-500 to-cyan-600' },
  { name: '图生视频', desc: '包含豆包、海螺、vidu、万相、可灵即梦等图生视频', gradient: 'from-pink-500 to-rose-600' },
  { name: '字幕音频对齐', desc: '智能同步字幕与音频，精准校准时间轴，打造专业视听体验', gradient: 'from-emerald-500 to-teal-600' },
  { name: '声音克隆', desc: '克隆声音，生成属于你的专属声音', gradient: 'from-amber-500 to-orange-600' },
  { name: '视频搜索', desc: '支持抖音、快手、小红书、B站等平台视频搜索', gradient: 'from-red-500 to-pink-600' },
  { name: '视频全平台下载', desc: '支持抖音、快手、小红书、B站等平台视频资源下载', gradient: 'from-indigo-500 to-blue-600' },
  { name: '获取第三方平台数据', desc: '连接各大平台数据源，可获取淘宝、京东、拼多多、抖音等', gradient: 'from-green-500 to-emerald-600' },
];

// 视频占位组件
const VideoPlaceholder = ({ title, className }: { title: string; className?: string }) => {
  return (
    <div className={`aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center ${className || ''}`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">{title}</p>
        <p className="text-slate-400 text-sm mt-1">视频演示</p>
      </div>
    </div>
  );
};

// 数字递增动画组件
const AnimatedCounter = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const step = target / (duration / 16);
          let current = 0;

          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            setCount(Math.floor(current));
          }, 16);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref} className="counter">
      {count}{suffix}
    </span>
  );
};

// 产品视频项组件（避免在map中使用hook）
const ProductVideoItem = ({
  product,
  onNavigate
}: {
  product: typeof productVideos[0];
  onNavigate: (link: string, external?: boolean) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`grid md:grid-cols-2 gap-8 items-center ${isVisible ? 'animated' : ''}`}
    >
      {product.layout === 'left' ? (
        <>
          <div className={`slide-in-left ${isVisible ? 'animated' : ''}`}>
            <VideoPlaceholder title={product.title} />
          </div>
          <div className={`slide-in-right ${isVisible ? 'animated' : ''}`}>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{product.title}</h3>
            <p className="text-gray-600 mb-6">{product.description}</p>
            <div className="flex flex-wrap gap-3 mb-6">
              {product.tags.map((tag, i) => (
                <span key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tag.color} text-sm`}>
                  {tag.text}
                </span>
              ))}
            </div>
            <button
              onClick={() => onNavigate(product.link)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${product.btnGradient} text-white font-semibold hover:shadow-lg transition shimmer`}
            >
              {product.btnText}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
                <path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`slide-in-left ${isVisible ? 'animated' : ''}`}>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{product.title}</h3>
            <p className="text-gray-600 mb-6">{product.description}</p>
            <div className="flex flex-wrap gap-3 mb-6">
              {product.tags.map((tag, i) => (
                <span key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tag.color} text-sm`}>
                  {tag.text}
                </span>
              ))}
            </div>
            <button
              onClick={() => onNavigate(product.link)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${product.btnGradient} text-white font-semibold hover:shadow-lg transition shimmer`}
            >
              {product.btnText}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
                <path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z" />
              </svg>
            </button>
          </div>
          <div className={`slide-in-right ${isVisible ? 'animated' : ''}`}>
            <VideoPlaceholder title={product.title} />
          </div>
        </>
      )}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigation = useCallback((link: string, external?: boolean) => {
    if (external) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  }, [navigate]);

  return (
    <div className="home-page -m-4 sm:-m-6">
      {/* 轮播图区域 */}
      <section className="carousel h-[400px] sm:h-[500px] relative overflow-hidden">
        <div
          className="carousel-inner h-full flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {carouselData.map((slide) => (
            <div
              key={slide.id}
              className={`carousel-item min-w-full h-full bg-gradient-to-br ${slide.gradient}`}
            >
              <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                <div className="grid md:grid-cols-2 gap-8 items-center w-full">
                  <div className="text-white">
                    <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-sm mb-4">
                      {slide.badge}
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                      {slide.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-white/80 mb-6">
                      {slide.subtitle}<br />
                      {slide.subtitle2}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(isAuthenticated ? '/plugin-market' : '/register')}
                        className="px-6 py-3 rounded-xl bg-white font-semibold hover:bg-gray-100 transition"
                        style={{ color: slide.btnPrimary.color }}
                      >
                        {slide.btnPrimary.text}
                      </button>
                      {slide.btnSecondary && (
                        <button className="px-6 py-3 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition">
                          {slide.btnSecondary}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex justify-center">
                    <div className="w-80 h-64 bg-white/10 rounded-2xl flex items-center justify-center float-animation">
                      <span className="text-white/60 text-lg">SmartAPI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 轮播指示器 */}
        <div className="carousel-dots absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselData.map((_, index) => (
            <div
              key={index}
              className={`carousel-dot w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        {/* 轮播箭头 */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition"
          onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselData.length) % carouselData.length)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselData.length)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* 数据统计 */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="scale-in-element">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">
                <AnimatedCounter target={180} suffix="w+" />
              </p>
              <p className="text-gray-600 mt-1">智能体接入</p>
            </div>
            <div className="scale-in-element delay-100">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">
                <AnimatedCounter target={1} suffix="亿+" />
              </p>
              <p className="text-gray-600 mt-1">API调用量</p>
            </div>
            <div className="scale-in-element delay-200">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">
                <AnimatedCounter target={15} suffix="w+" />
              </p>
              <p className="text-gray-600 mt-1">智能体构建师</p>
            </div>
            <div className="scale-in-element delay-300">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">
                <AnimatedCounter target={99} suffix=".9%" />
              </p>
              <p className="text-gray-600 mt-1">服务稳定性</p>
            </div>
          </div>
        </div>
      </section>

      {/* 产品视频展示区 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {productVideos.map((product) => (
            <ProductVideoItem
              key={product.id}
              product={product}
              onNavigate={handleNavigation}
            />
          ))}
        </div>
      </section>

      {/* 海量插件和工作流 - 网格布局 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">海量插件和工作流</h2>
            <p className="text-gray-600">200+核心插件，1000+工作流，满足企业级AI Agent的调用，支持企业与个人按需订阅</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {pluginGrid.map((plugin, index) => (
              <div
                key={plugin.name}
                className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition border border-gray-100 group cursor-pointer card-hover scale-in-element delay-${(index % 4) * 100}`}
                onClick={() => navigate('/plugin-market')}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${plugin.gradient} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 512 512">
                    <path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">{plugin.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">{plugin.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            开始构建你的 AI 智能体
          </h2>
          <p className="text-lg text-white/80 mb-8">
            加入我们，和数万开发者一起探索 AI 的无限可能
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/plugin-market' : '/register')}
              className="px-8 py-3 rounded-xl bg-white/20 border border-white/30 text-white font-semibold hover:bg-white/30 transition"
            >
              {isAuthenticated ? '开始使用' : '免费开始'}
            </button>
            <button
              onClick={() => navigate('/course')}
              className="px-8 py-3 rounded-xl bg-white/20 border border-white/30 text-white font-semibold hover:bg-white/30 transition"
            >
              查看教程
            </button>
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">SmartAPI</span>
              </div>
              <p className="text-sm">为 AI 智能体开发者提供强大的工具和服务</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">产品</h4>
              <ul className="space-y-2 text-sm">
                <li><a onClick={() => navigate('/plugin-market')} className="hover:text-white transition cursor-pointer">插件市场</a></li>
                <li><a onClick={() => navigate('/prompt-market')} className="hover:text-white transition cursor-pointer">提示词市场</a></li>
                <li><a onClick={() => navigate('/video-extract')} className="hover:text-white transition cursor-pointer">视频提取</a></li>
                <li><a onClick={() => navigate('/course')} className="hover:text-white transition cursor-pointer">精品课程</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">支持</h4>
              <ul className="space-y-2 text-sm">
                <li><a className="hover:text-white transition cursor-pointer">使用文档</a></li>
                <li><a className="hover:text-white transition cursor-pointer">API 文档</a></li>
                <li><a className="hover:text-white transition cursor-pointer">常见问题</a></li>
                <li><a className="hover:text-white transition cursor-pointer">联系我们</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">联系方式</h4>
              <ul className="space-y-2 text-sm">
                <li>微信：OTR4936</li>
                <li>邮箱：support@smartapi.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2024 SmartAPI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
