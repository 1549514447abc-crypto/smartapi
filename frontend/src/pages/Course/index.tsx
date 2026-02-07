import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import PaymentModal from '../../components/PaymentModal';
import {
  Loader2,
  Play,
  FileText,
  Gift,
  BookOpen,
  Download,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  MessageCircle,
  X,
  Copy,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface CourseInfo {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  original_price: number;
  current_price: number;
}

interface CourseLesson {
  id: number;
  title: string;
  video_path: string;
  duration: string;
  sort_order: number;
  is_free: boolean;
  document_url: string;
}

interface CourseExtra {
  id: number;
  type: string;
  title: string;
  description: string;
  link_url: string;
  sort_order: number;
}

// 获取视频URL - 使用nginx静态服务
const getVideoUrl = (videoPath: string) => {
  // 视频由nginx直接服务，路径 /videos/ → /www/smartapi-videos/
  // 不需要 /smartapi 前缀，因为nginx有独立的 location /videos/ 配置
  // 对中文文件名进行URL编码
  const encodedPath = videoPath.split('/').map(part => encodeURIComponent(part)).join('/');
  return encodedPath;
};

// 获取附赠内容图标
const getExtraIcon = (type: string) => {
  switch (type) {
    case 'reward':
      return <Gift className="w-5 h-5 sm:w-6 sm:h-6" />;
    case 'prompt_library':
      return <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />;
    case 'workflow_download':
      return <Download className="w-5 h-5 sm:w-6 sm:h-6" />;
    case 'workflow_list':
      return <FileText className="w-5 h-5 sm:w-6 sm:h-6" />;
    default:
      return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
  }
};

// 获取附赠内容颜色
const getExtraColor = (type: string) => {
  switch (type) {
    case 'reward':
      return 'from-orange-400 to-pink-400';
    case 'prompt_library':
      return 'from-sky-400 to-blue-500';
    case 'workflow_download':
      return 'from-emerald-400 to-teal-500';
    case 'workflow_list':
      return 'from-violet-400 to-purple-500';
    default:
      return 'from-slate-400 to-slate-500';
  }
};

const Course = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isCourseStudent, refreshUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [extras, setExtras] = useState<CourseExtra[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const videoRefs = useState<Map<number, HTMLVideoElement>>(new Map())[0];

  // 购买流程相关状态
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [courseQrCodeUrl, setCourseQrCodeUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // 页面加载时刷新用户信息，确保会员状态是最新的
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    }
  }, []);

  // 如果用户是课程学员，获取课程群二维码
  useEffect(() => {
    const fetchCourseQrCode = async () => {
      if (isAuthenticated && isCourseStudent()) {
        try {
          const res = await api.get<{ success: boolean; data: { qrCodeUrl: string } }>('/system-config/course-qr-code');
          if (res.success && res.data.qrCodeUrl) {
            setCourseQrCodeUrl(res.data.qrCodeUrl);
          }
        } catch (error) {
          console.log('获取课程群二维码失败');
        }
      }
    };
    fetchCourseQrCode();
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCourseData();
  }, []);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const response = await api.get<{
        success: boolean;
        data: {
          course: CourseInfo;
          lessons: CourseLesson[];
          extras: CourseExtra[];
        };
      }>('/course/full');

      if (response.success) {
        setCourseInfo(response.data.course);
        setLessons(response.data.lessons);
        setExtras(response.data.extras);
      }
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理视频播放，确保同时只播放一个视频
  const handleVideoPlay = (lessonId: number) => {
    // 暂停其他所有视频
    videoRefs.forEach((video, id) => {
      if (id !== lessonId && !video.paused) {
        video.pause();
      }
    });
    setPlayingVideoId(lessonId);
  };

  // 处理视频暂停
  const handleVideoPause = (lessonId: number) => {
    if (playingVideoId === lessonId) {
      setPlayingVideoId(null);
    }
  };

  // 注册视频元素引用
  const registerVideoRef = (lessonId: number, element: HTMLVideoElement | null) => {
    if (element) {
      videoRefs.set(lessonId, element);
    } else {
      videoRefs.delete(lessonId);
    }
  };

  // 购买流程
  const handlePurchase = () => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login', { state: { from: '/course/trial' } });
      return;
    }
    if (isCourseStudent()) {
      message.info('您已经是课程学员，无需重复购买');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmPurchase = () => {
    setConfirmVisible(false);
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = async (newOrderNo?: string) => {
    setPaymentVisible(false);
    if (newOrderNo) {
      setOrderNo(newOrderNo);
    }
    // 获取课程群二维码
    try {
      const res = await api.get<{ success: boolean; data: { qrCodeUrl: string } }>('/system-config/course-qr-code');
      if (res.success && res.data.qrCodeUrl) {
        setCourseQrCodeUrl(res.data.qrCodeUrl);
      }
    } catch (error) {
      console.log('获取课程群二维码失败，使用默认二维码');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部标题区 */}
      <div className="card p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-200 to-emerald-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
        <div className="relative">
          <button
            onClick={() => navigate('/course')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回课程介绍
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            {courseInfo?.title || 'Coze实战训练营'} - 试听课程
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mb-4">
            {courseInfo?.subtitle || '从底层逻辑到商业落地的完整路径'}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
              完整课程 100 节
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              当前试听 10 节
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
              限时优惠 ¥{courseInfo?.original_price || 1299}
            </span>
          </div>
        </div>
      </div>

      {/* 附赠内容区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {extras.filter(e => e.type !== 'workflow_list').map((extra) => (
          <a
            key={extra.id}
            href={extra.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-4 sm:p-5 group hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${getExtraColor(extra.type)} text-white flex items-center justify-center flex-shrink-0`}>
                {getExtraIcon(extra.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1 group-hover:text-sky-600 transition-colors">
                  {extra.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
                  {extra.description}
                </p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-sky-600 font-medium">
                  查看详情 <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* 购买区 */}
      <div className={`card p-5 sm:p-6 ${isCourseStudent() ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200'}`}>
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
          <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center flex-shrink-0 ${isCourseStudent() ? 'bg-gradient-to-br from-emerald-400 to-teal-400' : 'bg-gradient-to-br from-orange-400 to-pink-400'}`}>
            {isCourseStudent() ? <CheckCircle className="w-7 h-7" /> : <GraduationCap className="w-7 h-7" />}
          </div>
          <div className="flex-1 text-center lg:text-left">
            {isCourseStudent() ? (
              <>
                <h4 className="font-bold text-slate-900 text-lg mb-1">
                  您已购买完整课程
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  感谢您的支持！您可以观看全部 100 节课程和获取所有学员资源
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold">课程学员</span>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-bold text-slate-900 text-lg mb-1">
                  解锁完整 100 节课程
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  课内30+实操落地项目 + 80+成品工作流 + 100+提示词库
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm">
                  <span className="text-slate-400 line-through">¥{courseInfo?.original_price || 1299}</span>
                  <span className="text-2xl font-bold text-orange-500">¥{courseInfo?.current_price || 799}</span>
                  <span className="text-orange-600">限时优惠</span>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isCourseStudent() ? (
              <>
                <div className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  已购买
                </div>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  加入课程群
                </button>
              </>
            ) : (
              <button
                onClick={handlePurchase}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all flex items-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                立即购买
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MessageCircle className="w-4 h-4" />
              微信：<span className="font-semibold text-slate-900">OTR4936</span>
            </div>
          </div>
        </div>
      </div>

      {/* 课程目录 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Play className="w-5 h-5 text-sky-500" />
            10节试听课目录
          </h2>
          <span className="text-xs sm:text-sm text-slate-500">
            每节课包含视频、讲义
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="card p-4 sm:p-5 space-y-3 sm:space-y-4">
              {/* 课程标题 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">第 {String(lesson.sort_order).padStart(2, '0')} 课</span>
                    {lesson.is_free && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        免费试听
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-1">
                    {lesson.title}
                  </h3>
                </div>
                {lesson.document_url && (
                  <a
                    href={lesson.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 flex-shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    讲义
                  </a>
                )}
              </div>

              {/* 视频播放器 */}
              <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
                <video
                  ref={(el) => registerVideoRef(lesson.id, el)}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                  onPlay={() => handleVideoPlay(lesson.id)}
                  onPause={() => handleVideoPause(lesson.id)}
                >
                  <source src={getVideoUrl(lesson.video_path)} type="video/mp4" />
                  您的浏览器不支持视频播放。
                </video>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Play className="w-3.5 h-3.5" />
                  时长 {lesson.duration || '未知'}
                </span>
                {lesson.document_url && (
                  <a
                    href={lesson.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-700"
                  >
                    Q&A
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 确认购买弹窗 */}
      {confirmVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-4 mb-5">
                <h4 className="font-bold text-slate-900 mb-3">课程名称：</h4>
                <p className="text-lg font-semibold text-orange-600 mb-3">Coze实战训练营</p>
                <h4 className="font-bold text-slate-900 mb-2">课程内容：</h4>
                <p className="text-slate-600 mb-3">100节系统课程，30+实操落地项目</p>
                <h4 className="font-bold text-slate-900 mb-2">支付金额：</h4>
                <p className="text-2xl font-bold text-orange-500">¥{courseInfo?.current_price || 799}</p>
              </div>
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
        productPrice={courseInfo?.current_price || 799}
        productDescription="100节系统课程 + 30+实操落地项目 + 一年会员权益"
      />

      {/* 课程群二维码弹窗 */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">加入课程群</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-600 mb-4">扫码加入课程学习群，与学员交流学习</p>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5">
                {courseQrCodeUrl ? (
                  <div className="w-56 h-56 mx-auto mb-4 bg-white rounded-xl p-3 shadow-md border border-slate-100">
                    <img
                      src={courseQrCodeUrl}
                      alt="课程群二维码"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/wechat-qr.png';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                    <p className="text-slate-500 text-sm">二维码未配置</p>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-semibold">微信号：OTR4936</span>
                  </div>
                  <p className="text-xs text-slate-500">二维码失效请搜索微信号添加</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付成功弹窗 */}
      {successVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">恭喜您购买成功！</h4>
              <p className="text-slate-500 mb-6">请按以下步骤领取课程</p>
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
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 mb-6">
                <p className="text-sm text-slate-600 mb-4">扫码加入课程学习群</p>
                <div className="w-56 h-56 mx-auto mb-4 bg-white rounded-xl p-3 shadow-md border border-slate-100">
                  <img
                    src={courseQrCodeUrl || '/wechat-qr.png'}
                    alt="课程群二维码"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/wechat-qr.png';
                    }}
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-semibold">微信号：OTR4936</span>
                  </div>
                  <p className="text-xs text-slate-500">二维码失效请搜索微信号添加</p>
                </div>
              </div>
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

export default Course;
