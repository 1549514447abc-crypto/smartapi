import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Video,
  Plus,
  Trash2,
  Download,
  Clock,
  Coins,
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  ChevronDown
} from 'lucide-react';

interface ExtractionTask {
  id: number;
  video_title: string | null;
  status: 'pending' | 'step1_parsing' | 'step2_transcribing' | 'step3_correcting' | 'completed' | 'failed';
  transcript: string | null;
  corrected_transcript: string | null;
  created_at: string;
  audio_duration: number | null;
  used_seconds: number | null;
  cost: number | null;
  error_message?: string | null;
}

interface ExtractionResult {
  task_id: number;
  video_title: string | null;
  video_cover: string | null;
  platform: string | null;
  transcript: string;
  corrected_transcript: string | null;
  audio_duration: number;
  used_seconds: number;
  cost: number;
  remaining_balance: number;
}

interface VideoRates {
  videoRateNormal: number;
  videoRateYearly: number;
  videoRateCourse: number;
}

const VideoExtract = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuthStore();
  const [videoUrls, setVideoUrls] = useState('');
  const [enableCorrection, _setEnableCorrection] = useState(false);
  const [exportFormat, setExportFormat] = useState<'word' | 'txt'>('txt');
  const [extracting, setExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [historyTasks, setHistoryTasks] = useState<ExtractionTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [batchTaskIds, setBatchTaskIds] = useState<number[]>([]); // 批量任务ID列表
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const [videoRates, setVideoRates] = useState<VideoRates>({
    videoRateNormal: 0.002,
    videoRateYearly: 0.0015,
    videoRateCourse: 0.0013
  });

  void processingTaskId;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // 清理所有批量任务的轮询
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
      pollingIntervalsRef.current.clear();
    };
  }, []);

  const getStepFromStatus = (status: string): number => {
    switch (status) {
      case 'pending':
      case 'step1_parsing':
        return 0;
      case 'step2_transcribing':
        return 1;
      case 'step3_correcting':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  useEffect(() => {
    fetchHistoryTasks(1);
    fetchVideoRates();
  }, []);

  const fetchVideoRates = async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: VideoRates;
      }>('/system/public-prices');
      if (response.success && response.data) {
        setVideoRates({
          videoRateNormal: response.data.videoRateNormal || 0.002,
          videoRateYearly: response.data.videoRateYearly || 0.0015,
          videoRateCourse: response.data.videoRateCourse || 0.0013
        });
      }
    } catch (error) {
      console.error('Failed to fetch video rates:', error);
    }
  };

  const fetchHistoryTasks = async (pageNum: number = 1) => {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          tasks: ExtractionTask[];
          pagination: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
          };
        };
      }>(`/video/tasks?page=${pageNum}&limit=20`);

      if (response.success) {
        if (pageNum === 1) {
          setHistoryTasks(response.data.tasks);
        } else {
          setHistoryTasks(prev => [...prev, ...response.data.tasks]);
        }
        setPage(pageNum);
        setHasMore(response.data.pagination.page < response.data.pagination.total_pages);
      }
    } catch (error) {
      console.error('Failed to fetch history tasks:', error);
      message.error('加载历史记录失败');
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchHistoryTasks(page + 1);
    setLoadingMore(false);
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.delete(`/video/tasks/${taskId}`);
      if (response.success) {
        message.success('删除成功');
        setHistoryTasks(prev => prev.filter(t => t.id !== taskId));
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null);
          setCurrentResult(null);
        }
      }
    } catch (error) {
      console.error('Delete task error:', error);
      message.error('删除失败');
    }
  };

  const pollTaskStatus = (taskId: number, isBatchMode: boolean = false) => {
    // 如果已经在轮询这个任务，不重复添加
    if (pollingIntervalsRef.current.has(taskId)) {
      return;
    }

    // 单任务模式：清除之前的轮询
    if (!isBatchMode && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: ExtractionTask;
        }>(`/video/tasks/${taskId}`);

        if (response.success) {
          const task = response.data;

          // 只在单任务模式下更新进度步骤
          if (!isBatchMode) {
            setCurrentStep(getStepFromStatus(task.status));
          }

          setHistoryTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, ...task } : t)
          );

          if (task.status === 'completed') {
            // 清除此任务的轮询
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(taskId);

            if (!isBatchMode) {
              pollingIntervalRef.current = null;
              setCurrentResult({
                task_id: task.id,
                video_title: task.video_title,
                video_cover: null,
                platform: null,
                transcript: task.transcript || '',
                corrected_transcript: task.corrected_transcript,
                audio_duration: task.audio_duration || 0,
                used_seconds: task.used_seconds || 0,
                cost: task.cost || 0,
                remaining_balance: 0
              });
              setExtracting(false);
              setProcessingTaskId(null);
              message.success('提取成功！');
              // 刷新用户信息（更新余额显示）
              refreshUser();
            } else {
              // 批量模式：检查是否所有任务都完成了
              if (pollingIntervalsRef.current.size === 0) {
                setExtracting(false);
                setBatchTaskIds([]);
                message.success('所有视频提取完成！');
                // 刷新用户信息（更新余额显示）
                refreshUser();
              }
            }
            fetchHistoryTasks(1);
          } else if (task.status === 'failed') {
            // 清除此任务的轮询
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(taskId);

            if (!isBatchMode) {
              pollingIntervalRef.current = null;
              setExtracting(false);
              setProcessingTaskId(null);
            } else {
              // 批量模式：检查是否所有任务都完成了
              if (pollingIntervalsRef.current.size === 0) {
                setExtracting(false);
                setBatchTaskIds([]);
              }
            }
            message.error(task.error_message || '提取失败');
            fetchHistoryTasks(1);
          }
        }
      } catch (error) {
        console.error('Poll task status error:', error);
      }
    }, 2000);

    // 存储轮询引用
    if (isBatchMode) {
      pollingIntervalsRef.current.set(taskId, intervalId);
    } else {
      pollingIntervalRef.current = intervalId;
    }
  };

  const handleExtract = async () => {
    if (!videoUrls.trim()) {
      message.warning('请输入视频链接');
      return;
    }

    const urls = videoUrls.split('\n').filter(url => url.trim());
    if (urls.length === 0) {
      message.warning('请输入有效的视频链接');
      return;
    }

    setCurrentResult(null);
    setCurrentStep(0);
    setBatchTaskIds([]); // 清空批量任务列表
    setExtracting(true); // 始终显示进度弹窗

    try {
      // 使用批量提取API
      const response = await api.post<{
        success: boolean;
        data: {
          total: number;
          tasks: Array<{ task_id: number; url: string; status: string }>;
          invalid_urls: Array<{ index: number; url: string; reason: string }>;
          message: string;
        };
        message: string;
      }>('/video/extract-batch', {
        urls,
        enableCorrection
      });

      if (response.success) {
        const { tasks, invalid_urls } = response.data;

        // 添加所有创建的任务到历史列表
        const newTasks: ExtractionTask[] = tasks.map(t => ({
          id: t.task_id,
          video_title: '正在解析...',
          status: 'pending' as const,
          transcript: null,
          corrected_transcript: null,
          created_at: new Date().toISOString(),
          audio_duration: null,
          used_seconds: null,
          cost: null
        }));

        setHistoryTasks(prev => [...newTasks, ...prev]);

        // 如果只有一个任务，开始轮询并显示进度
        if (tasks.length === 1) {
          setProcessingTaskId(tasks[0].task_id);
          setBatchTaskIds([]);
          pollTaskStatus(tasks[0].task_id, false); // 单任务模式
        } else if (tasks.length > 1) {
          // 批量任务：设置批量任务ID列表，并启动轮询
          const taskIds = tasks.map(t => t.task_id);
          setBatchTaskIds(taskIds);
          setProcessingTaskId(null);
          tasks.forEach(t => pollTaskStatus(t.task_id, true));
        }

        setVideoUrls('');

        // 显示结果消息
        if (invalid_urls.length > 0) {
          Modal.warning({
            title: '部分链接无效',
            content: (
              <div>
                <p>已创建 {tasks.length} 个提取任务</p>
                <p style={{ marginTop: 8, color: '#ff4d4f' }}>以下 {invalid_urls.length} 个链接无法识别：</p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {invalid_urls.map((item, idx) => (
                    <li key={idx} style={{ color: '#666', fontSize: 12 }}>
                      第{item.index}行: {item.url}
                    </li>
                  ))}
                </ul>
              </div>
            )
          });
        } else {
          message.success(`已创建 ${tasks.length} 个提取任务`);
        }
      } else {
        message.error(response.message || '创建任务失败');
        setExtracting(false);
      }
    } catch (error: any) {
      console.error('Extract failed:', error);
      const errorMsg = error.response?.data?.error || '创建任务失败，请重试';
      const statusCode = error.response?.status;

      // 402 = Payment Required (余额不足)
      if (statusCode === 402) {
        Modal.confirm({
          title: '余额不足',
          content: errorMsg,
          okText: '去充值',
          cancelText: '取消',
          onOk: () => {
            navigate('/recharge');
          }
        });
      } else {
        message.error(errorMsg);
      }
      setExtracting(false);
    }
  };

  const handleExport = async () => {
    if (!currentResult) {
      message.warning('暂无可导出的内容');
      return;
    }

    const text = enableCorrection && currentResult.corrected_transcript
      ? currentResult.corrected_transcript
      : currentResult.transcript;

    const baseFilename = currentResult.video_title || '视频文案';

    if (exportFormat === 'word') {
      // 生成真正的 Word 文档
      try {
        const paragraphs = text.split('\n').map((line: string) =>
          new Paragraph({
            children: [new TextRun(line)],
          })
        );

        const doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs,
          }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${baseFilename}_${Date.now()}.docx`);
        message.success('已导出为 Word 文件');
      } catch (error) {
        console.error('Word导出失败:', error);
        message.error('Word导出失败，请尝试TXT格式');
      }
    } else {
      // TXT 格式
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${baseFilename}_${Date.now()}.txt`);
      message.success('已导出为 TXT 文件');
    }
  };

  const handleSelectTask = async (taskId: number) => {
    setSelectedTaskId(taskId);

    try {
      const response = await api.get<{
        success: boolean;
        data: ExtractionTask;
      }>(`/video/tasks/${taskId}`);

      if (response.success) {
        const task = response.data;
        const isProcessing = !['completed', 'failed'].includes(task.status);

        if (isProcessing) {
          setProcessingTaskId(taskId);
          setExtracting(true);
          setCurrentStep(getStepFromStatus(task.status));
          setCurrentResult(null);
          pollTaskStatus(taskId);
        } else {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setProcessingTaskId(null);
          setExtracting(false);

          setCurrentResult({
            task_id: task.id,
            video_title: task.video_title,
            video_cover: null,
            platform: null,
            transcript: task.transcript || '',
            corrected_transcript: task.corrected_transcript,
            audio_duration: task.audio_duration || 0,
            used_seconds: task.used_seconds || 0,
            cost: task.cost || 0,
            remaining_balance: 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to load task:', error);
      message.error('加载任务失败');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: <CheckCircle className="w-4 h-4" />, text: '已完成', color: 'text-emerald-600 bg-emerald-50' };
      case 'failed':
        return { icon: <AlertCircle className="w-4 h-4" />, text: '失败', color: 'text-red-600 bg-red-50' };
      case 'pending':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: '等待中', color: 'text-amber-600 bg-amber-50' };
      case 'step1_parsing':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: '解析中', color: 'text-sky-600 bg-sky-50' };
      case 'step2_transcribing':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: '识别中', color: 'text-violet-600 bg-violet-50' };
      case 'step3_correcting':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: '纠错中', color: 'text-pink-600 bg-pink-50' };
      default:
        return { icon: <Clock className="w-4 h-4" />, text: '未知', color: 'text-slate-600 bg-slate-50' };
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-140px)] overflow-x-hidden">
      {/* 左侧历史栏 - 移动端可折叠 */}
      <div className="w-full lg:w-72 lg:flex-shrink-0 card p-4 flex flex-col max-h-64 lg:max-h-none">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              提取历史
            </h3>
            <span className="text-xs text-slate-500">{historyTasks.length} 条</span>
          </div>

          <button
            onClick={() => {
              setSelectedTaskId(null);
              setCurrentResult(null);
              setVideoUrls('');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-medium shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow"
          >
            <Plus className="w-4 h-4" />
            新建提取
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {historyTasks.map((task) => {
            const isProcessing = !['completed', 'failed'].includes(task.status);
            const statusInfo = getStatusInfo(task.status);
            const progressPercent = task.status === 'pending' ? 5 :
              task.status === 'step1_parsing' ? 20 :
              task.status === 'step2_transcribing' ? 50 :
              task.status === 'step3_correcting' ? 80 : 100;

            return (
              <div
                key={task.id}
                onClick={() => handleSelectTask(task.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTaskId === task.id
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {task.video_title || '未命名视频'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatTime(task.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </div>

                {isProcessing && (
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {historyTasks.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无提取记录</p>
            </div>
          )}

          {historyTasks.length > 0 && hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2 text-sm text-sky-600 hover:text-sky-700 flex items-center justify-center gap-1"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  加载更多
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto min-h-0">
        {/* 标题区域 */}
        <div className="card p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sky-200 to-emerald-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50 z-0 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">短视频文案提取</h1>
                <p className="text-sm text-slate-500">智能提取视频语音，转换为文字</p>
              </div>
              <span className="tag tag-hot ml-2 flex-shrink-0">HOT</span>
            </div>
          </div>
        </div>

        {/* 输入区域 */}
        <div className="card p-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            输入视频链接
          </h2>

          <textarea
            className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
            placeholder={`粘贴视频链接，支持批量提取（一行一个，最多10个）\n支持：抖音、快手、B站、小红书等平台\n\n示例：\nhttps://v.douyin.com/xxxxx\nhttps://v.douyin.com/yyyyy`}
            value={videoUrls}
            onChange={(e) => setVideoUrls(e.target.value)}
            disabled={extracting}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>导出格式：</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    checked={exportFormat === 'txt'}
                    onChange={() => setExportFormat('txt')}
                    className="w-4 h-4 border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span>TXT</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    checked={exportFormat === 'word'}
                    onChange={() => setExportFormat('word')}
                    className="w-4 h-4 border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Word</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={!currentResult}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              <button
                onClick={handleExtract}
                disabled={extracting || !videoUrls.trim()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4" />
                {extracting ? '提取中...' : '开始提取'}
              </button>
            </div>
          </div>
        </div>

        {/* 结果区域 */}
        <div className="card p-6 flex-1">
          {currentResult ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h2 className="text-lg font-semibold text-slate-900">提取结果</h2>
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {currentResult.audio_duration ? Number(currentResult.audio_duration).toFixed(1) : '0.0'}秒
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
                    {currentResult.cost ? Number(currentResult.cost).toFixed(2) : '0.00'}元
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    {(enableCorrection && currentResult.corrected_transcript
                      ? currentResult.corrected_transcript
                      : currentResult.transcript
                    )?.length || 0}字
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {enableCorrection && currentResult.corrected_transcript
                  ? currentResult.corrected_transcript
                  : currentResult.transcript}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">等待提取</p>
              <p className="text-sm">输入视频链接后点击"开始提取"</p>
            </div>
          )}
        </div>

        {/* 计费说明 */}
        <div className="card p-4 sm:p-6 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            计费标准
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs sm:text-sm text-slate-500 mb-1">非会员</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{videoRates.videoRateNormal} <span className="text-xs sm:text-sm font-normal text-slate-500">元/秒</span></p>
              <p className="text-xs text-slate-400 mt-1">按实际音频时长计费</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-sky-50 border border-sky-100">
              <p className="text-xs sm:text-sm text-sky-600 mb-1">年度会员</p>
              <p className="text-xl sm:text-2xl font-bold text-sky-700">{videoRates.videoRateYearly} <span className="text-xs sm:text-sm font-normal text-sky-500">元/秒</span></p>
              <p className="text-xs text-sky-400 mt-1">享受 {Math.round((1 - videoRates.videoRateYearly / videoRates.videoRateNormal) * 100)}% 折扣</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <p className="text-xs sm:text-sm text-amber-600 mb-1">课程学员</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700">{videoRates.videoRateCourse} <span className="text-xs sm:text-sm font-normal text-amber-500">元/秒</span></p>
              <p className="text-xs text-amber-400 mt-1">享受 {Math.round((1 - videoRates.videoRateCourse / videoRates.videoRateNormal) * 100)}% 折扣</p>
            </div>
          </div>
        </div>
      </div>

      {/* 进度弹窗 */}
      {extracting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 sm:p-8 w-full max-w-[400px] relative">
            <button
              onClick={() => setExtracting(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-200">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {batchTaskIds.length > 0 ? `批量提取中 (${batchTaskIds.length}个视频)` : '正在提取视频文案'}
              </h2>
            </div>

            {/* 批量模式：显示每个任务的进度 */}
            {batchTaskIds.length > 0 ? (
              <>
                {/* 总体进度 */}
                <div className="mb-4">
                  {(() => {
                    const batchTasks = historyTasks.filter(t => batchTaskIds.includes(t.id));
                    const completedCount = batchTasks.filter(t => t.status === 'completed').length;
                    const failedCount = batchTasks.filter(t => t.status === 'failed').length;
                    const finishedCount = completedCount + failedCount;
                    const progress = batchTaskIds.length > 0 ? Math.round((finishedCount / batchTaskIds.length) * 100) : 0;
                    return (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600 font-medium">
                            已完成 {completedCount}/{batchTaskIds.length}
                            {failedCount > 0 && <span className="text-red-500 ml-1">({failedCount}个失败)</span>}
                          </span>
                          <span className="text-sky-600 font-bold">{progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 任务列表 */}
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                  {batchTaskIds.map((taskId, index) => {
                    const task = historyTasks.find(t => t.id === taskId);
                    const statusInfo = task ? getStatusInfo(task.status) : null;
                    return (
                      <div key={taskId} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">
                            {task?.video_title || '正在解析...'}
                          </p>
                        </div>
                        {statusInfo && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="hidden sm:inline">{statusInfo.text}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* 单任务模式：显示详细进度 */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">
                      {currentStep === 0 ? '正在解析视频...' :
                       currentStep === 1 ? '正在识别语音...' :
                       currentStep === 2 ? '正在智能纠错...' : '处理中...'}
                    </span>
                    <span className="text-sky-600 font-bold">
                      {currentStep === 0 ? '15%' :
                       currentStep === 1 ? '50%' :
                       currentStep === 2 ? '85%' : '0%'}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: currentStep === 0 ? '15%' :
                               currentStep === 1 ? '50%' :
                               currentStep === 2 ? '85%' : '5%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    {currentStep === 0 ? '预计需要 5-10 秒' :
                     currentStep === 1 ? '预计需要 10-60 秒（取决于视频时长）' :
                     currentStep === 2 ? '即将完成...' : '准备中...'}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { step: 0, name: '解析视频链接', desc: '获取视频信息和音频' },
                    { step: 1, name: '语音识别', desc: '将音频转换为文字' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        currentStep > item.step
                          ? 'bg-emerald-100 text-emerald-600'
                          : currentStep === item.step
                            ? 'bg-sky-100 text-sky-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {currentStep > item.step ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${currentStep >= item.step ? 'text-slate-900' : 'text-slate-400'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                      {currentStep === item.step && (
                        <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                      )}
                      {currentStep > item.step && (
                        <span className="text-xs text-emerald-500 font-medium">完成</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setExtracting(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors text-sm"
            >
              隐藏窗口（后台继续处理）
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoExtract;
