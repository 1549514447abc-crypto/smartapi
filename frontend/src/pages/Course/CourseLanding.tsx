import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/request';
import PaymentModal from '../../components/PaymentModal';
import {
  GraduationCap,
  Play,
  CheckCircle,
  Zap,
  MessageCircle,
  Gift,
  BookOpen,
  Code2,
  Layers,
  ArrowRight,
  Clock,
  Users,
  Star,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Copy,
  AlertCircle
} from 'lucide-react';

const CourseLanding = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isCourseStudent } = useAuthStore();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [coursePrice, setCoursePrice] = useState(799);
  const [courseOriginalPrice, setCourseOriginalPrice] = useState(1299);

  // 获取价格配置
  useEffect(() => {
    api.get<{ success: boolean; data: { coursePrice: number; courseOriginalPrice: number } }>('/system-config/prices')
      .then(res => {
        if (res.success) {
          if (res.data.coursePrice) {
            setCoursePrice(res.data.coursePrice);
          }
          if (res.data.courseOriginalPrice) {
            setCourseOriginalPrice(res.data.courseOriginalPrice);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handlePurchase = () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/course' } });
      return;
    }
    // 检查是否已经是课程学员
    if (isCourseStudent()) {
      message.info('您已经是课程学员，无需重复购买');
      navigate('/course/trial');
      return;
    }
    // 显示确认购买弹窗
    setConfirmVisible(true);
  };

  const handleConfirmPurchase = () => {
    setConfirmVisible(false);
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = (newOrderNo?: string) => {
    setPaymentVisible(false);
    if (newOrderNo) {
      setOrderNo(newOrderNo);
    }
    setSuccessVisible(true);
  };

  const handleCopyOrderNo = () => {
    navigator.clipboard.writeText(orderNo);
    message.success('订单号已复制');
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    window.location.reload();
  };

  const trialLessons = [
    '第一课：AI如何让普通人成为超级个体',
    '第二课：课程导学：学习路径与目录速览',
    '第三课：无代码平台的核心思维',
    '第四课：认识Coze的边界',
    '第五课：COZE功能区与界面介绍',
    '第六课：课程答疑说明与高效学习方法',
    '第七课：智能体与工作流的区别',
    '第八课：实操搭建你的第一个智能体',
    '第九课：用户变量与系统变量',
    '第十课：工作流变量（局部变量）'
  ];

  const projectList = [
    '联网搜索并生成公众号快讯文章',
    '批量文案生成系统',
    'PDF 文字批量提取器',
    '电商主图生成器',
    '电商一键抠图',
    'PDF处理：PDF转图片与文字提取',
    '电商模特换装',
    '微信公众号文章读取+改写+配图',
    '行业热点定时推送器',
    '抖音热点采集+爆款口播稿生成',
    '风格化爆款文案创作器',
    '调用国外大模型：ChatGPT与Claude',
    '私人语音播客',
    '科学文献知识库智能问答',
    '小红书采集+二创文案+保存到飞书',
    '抖音对标采集+监控更新分析',
    '公众号小绿书图文自动发布'
  ];

  const learningStages = [
    {
      title: '阶段一：基础认知',
      icon: <Target className="w-5 h-5" />,
      color: 'from-sky-400 to-cyan-400',
      items: ['认识扣子的基础界面', '掌握无代码编程思维', '建立你的第一个智能体和工作流', '理解智能体与工作流的区别']
    },
    {
      title: '阶段二：核心节点与数据处理',
      icon: <Layers className="w-5 h-5" />,
      color: 'from-emerald-400 to-teal-400',
      items: ['所有数据类型（变量、数据逻辑）', '数据的来源与流转', '选择节点、批处理、循环', '数据库与知识库']
    },
    {
      title: '阶段三：驾驭大语言模型',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'from-violet-400 to-purple-400',
      items: ['提示词工程（如何写好提示词）', '大模型参数调优', '如何让AI帮你写代码', '根据任务选择合适的大模型']
    },
    {
      title: '阶段四：打破平台限制',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-orange-400 to-pink-400',
      items: ['HTTP请求与API调用', '接入外部模型（ChatGPT、Claude等）', '多模态扩展（语音、视频、文本）', '实现万物互联']
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-sky-200 to-emerald-200 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-60"></div>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
              限时优惠
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              立省200元
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            Coze实战训练营
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-2">
            从零基础到商业落地，只需要这一门课
          </p>
          <p className="text-sm sm:text-base text-slate-500 mb-6 max-w-2xl">
            涵盖从COZE基础知识到多个实操项目、大模型调优、提示词撰写、商业化变现方法的全链路教学
          </p>

          {/* 价格区域 */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold text-orange-500">¥{coursePrice}</span>
              <span className="text-lg text-slate-400 line-through">¥{courseOriginalPrice}</span>
            </div>
            <span className="text-sm text-slate-500">限时优惠</span>
          </div>

          {/* CTA 按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/course/trial')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-all"
            >
              <Play className="w-5 h-5" />
              免费试听10节课
            </button>
            <button
              onClick={handlePurchase}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
            >
              <GraduationCap className="w-5 h-5" />
              立即购买
            </button>
          </div>
        </div>
      </section>

      {/* 课程亮点 */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-slate-900">100</p>
          <p className="text-sm text-slate-500">节系统课程</p>
        </div>
        <div className="card p-4 sm:p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Code2 className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-slate-900">21+10</p>
          <p className="text-sm text-slate-500">实战项目</p>
        </div>
        <div className="card p-4 sm:p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-3">
            <Gift className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-slate-900">80+</p>
          <p className="text-sm text-slate-500">成品工作流</p>
        </div>
        <div className="card p-4 sm:p-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-slate-900">1v1</p>
          <p className="text-sm text-slate-500">全年答疑</p>
        </div>
      </section>

      {/* 你将获得 */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <Star className="w-6 h-6 text-amber-500" />
          购课即享
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: <BookOpen className="w-5 h-5" />, title: '100节系统课', desc: '从小白到开发者的完整路径' },
            { icon: <Code2 className="w-5 h-5" />, title: '21个实战工作流项目', desc: '从零基础到商业落地实操' },
            { icon: <Zap className="w-5 h-5" />, title: '10个AI编程代码项目', desc: '不只是教理论，更教你怎么实操' },
            { icon: <Gift className="w-5 h-5" />, title: '80+工作流成品', desc: '学员免费下载，持续更新中' },
            { icon: <Sparkles className="w-5 h-5" />, title: '100+提示词库', desc: '多行业专业提示词，持续更新' },
            { icon: <MessageCircle className="w-5 h-5" />, title: '全年1对1答疑', desc: '有问题随时问，专属AI答疑机器人' },
            { icon: <Users className="w-5 h-5" />, title: '学员专属社群', desc: '学员答疑交流群，持续学习' },
            { icon: <TrendingUp className="w-5 h-5" />, title: '插件购买折扣', desc: '学员购买插件可享专属折扣' }
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-sky-600 flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base">{item.title}</h4>
                <p className="text-xs sm:text-sm text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 学习阶段 */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <Target className="w-6 h-6 text-violet-500" />
          四大学习阶段
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {learningStages.map((stage, index) => (
            <div key={index} className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stage.color} text-white flex items-center justify-center`}>
                  {stage.icon}
                </div>
                <h3 className="font-bold text-slate-900">{stage.title}</h3>
              </div>
              <ul className="space-y-2">
                {stage.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 试听课程目录 */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Play className="w-6 h-6 text-sky-500" />
            10节试听课目录
          </h2>
          <span className="text-xs sm:text-sm text-slate-500">免费观看</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trialLessons.map((lesson, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-sky-50 cursor-pointer transition-colors group"
              onClick={() => navigate('/course/trial')}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                {index + 1}
              </div>
              <span className="text-sm text-slate-700 group-hover:text-sky-700 transition-colors line-clamp-1">
                {lesson}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/course/trial')}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-50 text-sky-600 font-medium hover:bg-sky-100 transition-colors"
        >
          <Play className="w-4 h-4" />
          立即免费试听
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* 实战项目列表 */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Code2 className="w-6 h-6 text-emerald-500" />
          课程内实战项目（部分）
        </h2>
        <p className="text-sm text-slate-500 mb-6">每个项目都是真实可落地的商业场景</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {projectList.map((project, index) => (
            <div key={index} className="flex items-center gap-2 p-2 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="line-clamp-1">{project}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 课程特点 */}
      <section className="card p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-sky-50">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
          会打字就能学，零代码门槛
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-sky-500" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">每节课聚焦一个知识点</h4>
            <p className="text-sm text-slate-500">学习不疲惫，方便回看和检索</p>
          </div>
          <div className="text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">视频+图文+QA</h4>
            <p className="text-sm text-slate-500">每节课配备多种学习资料</p>
          </div>
          <div className="text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">1~2天更新1节</h4>
            <p className="text-sm text-slate-500">持续更新，内容常新</p>
          </div>
        </div>
      </section>

      {/* 购买区域 */}
      <section className="card p-6 sm:p-8 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            {courseOriginalPrice}的课，给你3000+的价值
          </h2>
          <p className="text-slate-600 mb-6">解锁AI时代的超级技能</p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">原价</p>
              <p className="text-2xl text-slate-400 line-through">¥{courseOriginalPrice}</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-400">
              <p className="text-xs text-white/80 mb-1">限时优惠</p>
              <p className="text-3xl font-bold text-white">¥{coursePrice}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              onClick={() => navigate('/course/trial')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-700 font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Play className="w-5 h-5" />
              先试听再决定
            </button>
            <button
              onClick={handlePurchase}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
            >
              <GraduationCap className="w-5 h-5" />
              立即购买
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-slate-600 text-sm">
            <MessageCircle className="w-4 h-4" />
            购课请加微信：<span className="font-semibold text-slate-900">OTR4936</span>
          </div>
        </div>
      </section>

      {/* 学完后你将获得 */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          学完后你将获得
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            '掌握扣子平台的完整使用能力',
            '理解无代码平台的通用底层逻辑（可迁移到Dify、n8n、Make等平台）',
            '具备独立搭建智能体和工作流的能力',
            '拥有属于自己的作品和案例'
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 确认购买弹窗 */}
      {confirmVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">确认购买课程</h3>
              <button
                onClick={() => setConfirmVisible(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {/* 课程信息 */}
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-4 mb-5">
                <h4 className="font-bold text-slate-900 mb-3">课程名称：</h4>
                <p className="text-lg font-semibold text-orange-600 mb-3">Coze实战训练营</p>

                <h4 className="font-bold text-slate-900 mb-2">课程内容：</h4>
                <p className="text-slate-600 mb-3">100节系统课程，31个实战项目</p>

                <h4 className="font-bold text-slate-900 mb-2">支付金额：</h4>
                <p className="text-2xl font-bold text-orange-500">¥{coursePrice}</p>
              </div>

              {/* 购买须知 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <h4 className="font-bold text-amber-800">购买须知</h4>
                </div>
                <ul className="space-y-2 text-sm text-amber-900">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                    点击"确认购买"后将生成订单号和微信二维码
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                    请扫码添加讲师微信，并发送订单号
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                    讲师确认后将通过微信发送完整课程资料
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                    课程支持永久回看，提供完整源码和练习题
                  </li>
                </ul>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmVisible(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
                >
                  确认购买
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付弹窗 */}
      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        onSuccess={handlePaymentSuccess}
        productType="course"
        productName="Coze实战训练营"
        productPrice={coursePrice}
        productDescription="100节系统课程 + 31个实战项目 + 一年会员权益"
      />

      {/* 支付成功弹窗 */}
      {successVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">支付成功</h3>
              <button
                onClick={handleSuccessClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 text-center">
              {/* 成功图标 */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">恭喜您购买成功！</h4>
              <p className="text-slate-500 mb-6">请按以下步骤领取课程</p>

              {/* 订单号 */}
              {orderNo && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-500 mb-2">您的订单号</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-mono font-bold text-slate-900">{orderNo}</span>
                    <button
                      onClick={handleCopyOrderNo}
                      className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* 讲师微信 */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 mb-3">扫码添加讲师微信，发送订单号领取课程</p>
                <div className="w-40 h-40 mx-auto mb-3 bg-white rounded-xl p-2 shadow-sm">
                  {/* 这里放讲师微信二维码 */}
                  <img
                    src="/wechat-qr.png"
                    alt="讲师微信"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    二维码加载中...
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-semibold">微信号：OTR4936</span>
                </div>
              </div>

              {/* 提示 */}
              <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    截图保存此页面或复制订单号
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    扫码添加讲师微信
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    发送订单号给讲师确认
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">4.</span>
                    讲师将通过微信发送课程资料
                  </li>
                </ul>
              </div>

              <button
                onClick={handleSuccessClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLanding;
