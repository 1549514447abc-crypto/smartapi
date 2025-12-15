import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/request';
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
  MessageCircle
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

// 获取视频URL（本地和生产环境兼容）
const getVideoUrl = (videoPath: string) => {
  // 由于 vite.config.ts 设置了 base: '/smartapi/'，所以开发和生产环境都需要这个前缀
  // 对中文文件名进行URL编码
  const encodedPath = videoPath.split('/').map(part => encodeURIComponent(part)).join('/');
  return `/smartapi${encodedPath}`;
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
  const [loading, setLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [extras, setExtras] = useState<CourseExtra[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const videoRefs = useState<Map<number, HTMLVideoElement>>(new Map())[0];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              限时优惠 ¥799
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
      <div className="card p-5 sm:p-6 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 text-white flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h4 className="font-bold text-slate-900 text-lg mb-1">
              解锁完整 100 节课程
            </h4>
            <p className="text-sm text-slate-600 mb-2">
              21个实战项目 + 80+成品工作流 + 100+提示词库 + 全年1对1答疑
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-sm">
              <span className="text-slate-400 line-through">¥999</span>
              <span className="text-2xl font-bold text-orange-500">¥799</span>
              <span className="text-orange-600">限时优惠</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate('/course/payment')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-5 h-5" />
              立即购买
            </button>
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
    </div>
  );
};

export default Course;
