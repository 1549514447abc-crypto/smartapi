import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useLoginModalStore } from '../../store/useLoginModalStore';

// 轮播图数据
const carouselData = [
  {
    id: 1,
    bg: 'bg-slate-900',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    badge: '年度旗舰课程',
    title: 'Coze 智能体实战',
    titleHighlight: '从入门到变现',
    highlightColor: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400',
    description: '100+ 节系统视频课，31 个实战商业案例源码。订阅即送创作魔方年度会员权益。',
    btnPrimary: { text: '¥799 立即订阅', style: 'bg-white !text-slate-900 hover:bg-slate-100 shadow-lg' },
    btnSecondary: '免费试看章节',
    link: '/course',
    secondaryLink: '/course',
    isDark: true,
  },
  {
    id: 2,
    bg: 'bg-orange-50',
    badgeStyle: 'bg-orange-100 text-orange-700 border border-orange-200',
    badge: '开启副业收入',
    title: '推广合伙人计划',
    titleHighlight: '共享 AI 时代红利',
    highlightColor: 'text-orange-600',
    description: '成为创作魔方分销合伙人，推荐好友购买课程或会员，即可获得 25% 高额现金返佣。',
    btnPrimary: { text: '立即加入计划', style: 'bg-orange-600 hover:bg-orange-500 !text-white shadow-lg shadow-orange-600/20' },
    btnSecondary: '查看佣金规则',
    link: '/referral',
    secondaryLink: '/referral',
    isDark: false,
  },
  {
    id: 3,
    bg: 'bg-white',
    badgeStyle: 'bg-blue-100 text-blue-700 border border-blue-200',
    badge: '企业级 AI 基础设施',
    title: '智能体插件开发',
    titleHighlight: '释放无限潜能',
    highlightColor: 'text-blue-600',
    description: '为 Coze、Dify 提供 200+ 核心插件与工作流。一键接入数据抓取、图像生成能力，让智能体具备真实商业价值。',
    btnPrimary: { text: '免费开始使用', style: 'bg-blue-600 hover:bg-blue-500 !text-white shadow-lg shadow-blue-600/20' },
    btnSecondary: '查看插件文档',
    link: '/plugin-market',
    secondaryLink: '/plugin-market',
    isDark: false,
  },
];

// 数字递增动画
const AnimatedCounter = ({ target, suffix }: { target: string; suffix: string }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const numericTarget = parseFloat(target);
          const duration = 1500;
          const steps = 30;
          const stepDuration = duration / steps;
          let currentStep = 0;

          const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const currentValue = numericTarget * progress;

            if (currentStep >= steps) {
              setDisplayValue(target);
              clearInterval(timer);
            } else {
              setDisplayValue(currentValue.toFixed(target.includes('.') ? 1 : 0));
            }
          }, stepDuration);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return <span ref={ref}>{displayValue}{suffix}</span>;
};

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useLoginModalStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  // 提取 URL 中的推荐码并保存到 localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referral_code', ref);
      console.log('[首页] 已保存推荐码:', ref);
    }
  }, []);

  // 首页自动显示登录弹窗（仅对未登录用户，且每次会话只显示一次）
  useEffect(() => {
    if (!isAuthenticated) {
      const hasShownModal = sessionStorage.getItem('home_login_modal_shown');
      if (!hasShownModal) {
        // 延迟1秒显示，让用户先看到首页内容
        const timer = setTimeout(() => {
          openLoginModal();
          sessionStorage.setItem('home_login_modal_shown', 'true');
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, openLoginModal]);

  // 自动轮播 5秒
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselData.length) % carouselData.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselData.length);

  // 指示器颜色
  const getDotActiveColor = () => {
    switch (currentSlide) {
      case 0: return 'bg-white';      // 课程(深色背景)
      case 1: return 'bg-orange-500'; // 推广
      case 2: return 'bg-blue-600';   // 插件
      default: return 'bg-white';
    }
  };

  return (
    <div className="home-page -m-4 sm:-m-6 bg-white antialiased">

      {/* ========== 轮播图区域 - 完全复刻首页.html ========== */}
      <div className="relative overflow-hidden border-b border-slate-100">
        <div
          className="flex transition-transform duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {carouselData.map((slide) => (
            <div key={slide.id} className={`min-w-full ${slide.bg}`}>
              <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-20 md:py-28">
                <div className="flex flex-col md:flex-row items-center gap-12">
                  {/* 左侧文字 */}
                  <div className="md:w-1/2 space-y-8">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${slide.badgeStyle}`}>
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${slide.isDark ? 'bg-indigo-400' : 'bg-violet-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${slide.isDark ? 'bg-indigo-400' : 'bg-violet-600'}`}></span>
                      </span>
                      {slide.badge}
                    </div>
                    <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] ${slide.isDark ? 'text-white' : 'text-slate-900'}`}>
                      {slide.title}<br />
                      <span className={slide.highlightColor}>{slide.titleHighlight}</span>
                    </h1>
                    <p className={`text-lg max-w-lg leading-relaxed ${slide.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {slide.description}
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => navigate(slide.link)}
                        className={`px-8 py-3.5 font-bold rounded-xl transition-transform hover:-translate-y-1 ${slide.btnPrimary.style}`}
                      >
                        {slide.btnPrimary.text}
                      </button>
                      <button
                        onClick={() => navigate(slide.secondaryLink)}
                        className={`px-8 py-3.5 font-bold rounded-xl transition-colors ${slide.isDark ? 'bg-white border border-white !text-slate-900 hover:bg-slate-100' : 'bg-white border border-slate-200 !text-slate-700 hover:bg-slate-50'}`}
                      >
                        {slide.btnSecondary}
                      </button>
                    </div>
                  </div>

                  {/* 右侧装饰 */}
                  <div className="md:w-1/2 flex justify-center">
                    {/* 课程 - 视频播放器 */}
                    {slide.id === 1 && (
                      <div className="relative group cursor-pointer w-full max-w-md aspect-video bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="text-white font-bold text-lg">课程先导片：AI Agent 的商业机会</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="h-1 flex-1 bg-slate-600 rounded-full overflow-hidden">
                              <div className="h-full w-1/3 bg-indigo-500"></div>
                            </div>
                            <span className="text-xs text-slate-400">03:24</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 推广返佣 - 收益卡片 */}
                    {slide.id === 2 && (
                      <div className="relative">
                        <div className="absolute top-0 right-0 w-72 h-40 bg-white rounded-2xl shadow-lg border border-slate-100 transform rotate-6 translate-x-4"></div>
                        <div className="relative w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                          <div className="flex justify-between items-center mb-6">
                            <div className="text-sm font-bold text-slate-500">本月累计收益</div>
                            <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">已提现</div>
                          </div>
                          <div className="text-4xl font-extrabold text-slate-900 mb-2">¥ 12,580.00</div>
                          <div className="flex gap-2 text-xs text-slate-400">
                            <span>⬆️ 15% 较上月</span>
                          </div>
                          <div className="mt-6 w-full py-2 bg-orange-50 text-orange-600 text-center font-bold rounded-lg text-sm cursor-pointer hover:bg-orange-100 transition-colors">
                            查看明细
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 插件市场 - 浏览器窗口 */}
                    {slide.id === 3 && (
                      <div className="relative w-full max-w-lg aspect-[16/10] bg-white rounded-xl shadow-2xl border border-slate-200 p-2 transform rotate-2 hover:rotate-0 transition-transform duration-700" style={{ animation: 'float-slow 5s ease-in-out infinite' }}>
                        <div className="absolute -z-10 -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                        <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden flex flex-col">
                          <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2 bg-white">
                            <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                            <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                          </div>
                          <div className="flex-1 p-6 flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto flex items-center justify-center text-3xl">🧩</div>
                              <div className="space-y-2">
                                <div className="h-3 w-32 bg-slate-200 rounded mx-auto"></div>
                                <div className="h-2 w-24 bg-slate-200 rounded mx-auto"></div>
                              </div>
                              <div className="pt-4 flex justify-center gap-2">
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">API 200 OK</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 指示器 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {carouselData.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? `w-12 ${getDotActiveColor()}` : 'w-3 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>

        {/* 左右箭头 */}
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/50 hover:bg-white backdrop-blur flex items-center justify-center text-slate-600 shadow-sm transition-all hidden md:flex hover:scale-110 z-10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/50 hover:bg-white backdrop-blur flex items-center justify-center text-slate-600 shadow-sm transition-all hidden md:flex hover:scale-110 z-10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* ========== 数据统计 - 完全复刻 ========== */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 xl:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100/50">
            <div className="group">
              <p className="text-3xl md:text-4xl font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors">
                <AnimatedCounter target="100" suffix="+" />
              </p>
              <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wider">实用插件</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                <AnimatedCounter target="99.9" suffix="%" />
              </p>
              <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wider">服务高稳定</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                <AnimatedCounter target="400" suffix="+" />
              </p>
              <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wider">多平台工作流</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                <AnimatedCounter target="100" suffix="+" />
              </p>
              <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wider">系统性精品课程</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Section 1: 推广挣钱 - 左文右图 ========== */}
      <section className="py-24 border-b border-slate-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold uppercase">
                💰 开启副业收入
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                推广合伙人计划<br />共享 AI 时代红利
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                成为创作魔方分销合伙人，共享 AI 创新红利。推荐好友购买创作魔方课程或会员，享受高额佣金返利。官方代理授权，助力您轻松开启 AI 副业之旅。让每一次分享都成为收入。
              </p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                  高额佣金，25% 返现比例
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                  官方授权，被动收入
                </li>
              </ul>
              <div className="pt-4">
                <button onClick={() => navigate('/referral')} className="text-orange-600 font-bold hover:text-orange-700 flex items-center gap-1 group">
                  立即加入计划
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="relative">
                <div className="absolute top-0 right-0 w-72 h-40 bg-orange-100 rounded-2xl shadow-lg border border-orange-200 transform rotate-6 translate-x-4"></div>
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm font-bold text-slate-500">本月累计收益</div>
                    <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">可提现</div>
                  </div>
                  <div className="text-4xl font-extrabold text-slate-900 mb-2">¥ 12,580.00</div>
                  <div className="flex gap-2 text-xs text-slate-400 mb-6">
                    <span>⬆️ 15% 较上月</span>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-orange-800">当前返佣比例</span>
                      <span className="text-2xl font-bold text-orange-600">25%</span>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 2: 剪映小助手 - 右图左文 ========== */}
      <section className="py-24 bg-slate-50 border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase">
                ⚡ 视频创作黑科技
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                剪映小助手<br />素材到成片无缝衔接
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                一键将 AI 生成的视频内容导入剪映，快速完成剪辑与合成，支持本地草稿与云端 MP4。智能化一键生成剪映草稿，与本地剪映无缝对接，让创作效率倍增。
              </p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                  极速导入，智能合成
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                  云端渲染，本地剪映无缝对接
                </li>
              </ul>
              <div className="pt-4">
                <button onClick={() => navigate('/jianying-helper')} className="text-violet-600 font-bold hover:text-violet-700 flex items-center gap-1 group">
                  免费下载小助手
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="relative bg-slate-900 rounded-xl shadow-2xl overflow-hidden aspect-[4/3] border border-slate-800 p-4">
                <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="mt-8 flex gap-4 h-full">
                  <div className="w-1/3 bg-slate-800/50 rounded p-3 space-y-2">
                    <div className="h-20 bg-slate-700/50 rounded"></div>
                    <div className="h-20 bg-slate-700/50 rounded"></div>
                  </div>
                  <div className="flex-1 bg-slate-800/30 rounded flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/30">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-slate-400 text-sm">正在合成视频...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 3: AI智能体学堂 - 左文右图 ========== */}
      <section className="py-24 border-b border-slate-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase">
                📚 知识赋能
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                AI 智能体学堂<br />从入门到精通
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                一站式 AI 智能体创建与管理学习平台。零基础入门，快速上手 AI 工作流，实用案例教程，解锁 AI 创作潜能。定期更新，掌握最新 AI 技术动态。
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-900 text-lg">100+</div>
                  <div className="text-sm text-slate-500">高清视频课</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-900 text-lg">31个</div>
                  <div className="text-sm text-slate-500">实战商业案例</div>
                </div>
              </div>
              <div className="pt-4">
                <button onClick={() => navigate('/course')} className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 group">
                  浏览课程大纲
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute top-4 -right-4 w-full h-full bg-slate-200 rounded-2xl transform rotate-3"></div>
                <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="aspect-video bg-indigo-900 flex items-center justify-center text-white p-8 text-center">
                    <div>
                      <div className="text-xs font-bold text-indigo-300 uppercase mb-2">MASTERCLASS</div>
                      <h3 className="text-3xl font-bold mb-4">AI Agent 开发实战</h3>
                      <button className="px-4 py-2 bg-white/10 backdrop-blur rounded-lg text-sm font-semibold">开始学习</button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100"></div>
                      <div>
                        <div className="font-bold text-slate-900">创作魔方官方团队</div>
                        <div className="text-xs text-slate-500">资深 AI 工程师</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-600 py-2 border-b border-slate-50">
                        <span>01. 智能体商业价值分析</span>
                        <span>15:20</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600 py-2 border-b border-slate-50">
                        <span>02. Coze 平台基础操作</span>
                        <span>24:05</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 4: 海量插件 - 右图左文 ========== */}
      <section className="py-24 bg-slate-50 border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase">
                🧩 企业级能力
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                海量插件市场<br />即插即用的能力模块
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                提供丰富多样的高效能插件，包含视频合成、视频转音频、全平台视频下载、图生视频、声音克隆、获取第三方平台数据等插件。满足您各种 AI 智能体开发需求。
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">🎥 视频合成</div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">🗣️ 声音克隆</div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">🔍 平台数据获取</div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">🎨 图生视频</div>
              </div>
              <div className="pt-4">
                <button onClick={() => navigate('/plugin-market')} className="text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1 group">
                  前往插件市场
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: '视频合成', icon: '🎬', color: 'from-violet-500 to-purple-600' },
                  { name: '声音克隆', icon: '🎤', color: 'from-pink-500 to-rose-600' },
                  { name: '图生视频', icon: '🎨', color: 'from-sky-500 to-cyan-600' },
                  { name: '数据抓取', icon: '📊', color: 'from-emerald-500 to-teal-600' },
                ].map((plugin) => (
                  <div key={plugin.name} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all cursor-pointer group">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plugin.color} flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform`}>
                      {plugin.icon}
                    </div>
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{plugin.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA - 完全复刻 ========== */}
      <div className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            准备好构建您的 AI 商业版图了吗？
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            无需繁琐配置，注册即送免费额度。加入创作魔方，与数万开发者一起探索 AI 应用的无限可能。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/plugin-market');
                } else {
                  openLoginModal();
                }
              }}
              className="px-8 py-4 rounded-xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 transition-all shadow-lg hover:-translate-y-1"
            >
              {isAuthenticated ? '开始使用' : '免费注册账户'}
            </button>
            <button className="px-8 py-4 rounded-xl bg-white/20 border border-white text-white font-bold text-lg hover:bg-white hover:!text-slate-900 transition-colors">
              联系商务合作
            </button>
          </div>
        </div>
      </div>

      {/* ========== Footer - 完全复刻 ========== */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="创作魔方" className="w-6 h-6 rounded" />
                <span className="text-lg font-bold text-slate-900">创作魔方</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                致力于为 AI 开发者提供最优质的基础设施与工具链。让 AI 落地更简单。
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-sm">产品中心</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><button onClick={() => navigate('/plugin-market')} className="hover:text-blue-600 transition-colors">插件市场</button></li>
                <li><button onClick={() => navigate('/workflow-store')} className="hover:text-blue-600 transition-colors">工作流商店</button></li>
                <li><button onClick={() => navigate('/prompt-market')} className="hover:text-blue-600 transition-colors">提示词市场</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-sm">学习资源</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><button onClick={() => navigate('/course')} className="hover:text-blue-600 transition-colors">Coze 实战课程</button></li>
                <li><button className="hover:text-blue-600 transition-colors">开发文档</button></li>
                <li><button className="hover:text-blue-600 transition-colors">常见问题</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-sm">联系我们</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><button className="hover:text-blue-600 transition-colors">商务合作</button></li>
                <li><span className="text-slate-400">微信：OTR4936</span></li>
                <li><span className="text-slate-400">邮箱：contentcubecn@163.com</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">© 2025 长沙芯跃科技有限公司. All rights reserved.</p>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-blue-600 transition-colors">湘ICP备2025140799号</a>
          </div>
        </div>
      </footer>

      {/* 浮动动画样式 */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default Home;
