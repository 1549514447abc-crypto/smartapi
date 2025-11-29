import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { api } from '../../api/request';
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

const VideoExtract = () => {
  const [videoUrls, setVideoUrls] = useState('');
  const [enableCorrection, setEnableCorrection] = useState(false);
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
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  void processingTaskId;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
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
  }, []);

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

  const pollTaskStatus = (taskId: number) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: ExtractionTask;
        }>(`/video/tasks/${taskId}`);

        if (response.success) {
          const task = response.data;
          setCurrentStep(getStepFromStatus(task.status));
          setHistoryTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, ...task } : t)
          );

          if (task.status === 'completed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setCurrentResult({
              task_id: task.id,
              video_title: task.video_title,
              video_cover: null,
              platform: null,
              transcript: task.transcript || '',
              corrected_transcript: task.corrected_transcript,
              audio_duration: task.audio_duration || 0,
              used_seconds: task.used_seconds || 0,
              cost: 0,
              remaining_balance: 0
            });
            setExtracting(false);
            setProcessingTaskId(null);
            message.success('提取成功！');
            fetchHistoryTasks(1);
          } else if (task.status === 'failed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setExtracting(false);
            setProcessingTaskId(null);
            message.error(task.error_message || '提取失败');
            fetchHistoryTasks(1);
          }
        }
      } catch (error) {
        console.error('Poll task status error:', error);
      }
    }, 2000);
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
    if (urls.length > 1) {
      message.info('批量处理功能即将上线，当前仅处理第一个链接');
    }

    const url = urls[0].trim();
    setCurrentResult(null);
    setCurrentStep(0);

    try {
      const response = await api.post<{
        success: boolean;
        data: {
          task_id: number;
          status: string;
          message: string;
        };
        message: string;
      }>('/video/extract', {
        url,
        enableCorrection
      });

      if (response.success) {
        const taskId = response.data.task_id;
        setProcessingTaskId(taskId);

        const newTask: ExtractionTask = {
          id: taskId,
          video_title: '正在解析...',
          status: 'pending',
          transcript: null,
          corrected_transcript: null,
          created_at: new Date().toISOString(),
          audio_duration: null,
          used_seconds: null
        };
        setHistoryTasks(prev => [newTask, ...prev]);
        pollTaskStatus(taskId);
        setVideoUrls('');
        setExtracting(false);
        message.info('任务已创建，正在后台处理...');
      } else {
        message.error(response.message || '创建任务失败');
        setExtracting(false);
      }
    } catch (error: any) {
      console.error('Extract failed:', error);
      message.error(error.response?.data?.error || '创建任务失败，请重试');
      setExtracting(false);
    }
  };

  const handleExport = () => {
    if (!currentResult) {
      message.warning('暂无可导出的内容');
      return;
    }

    const text = enableCorrection && currentResult.corrected_transcript
      ? currentResult.corrected_transcript
      : currentResult.transcript;

    const filename = `${currentResult.video_title || '视频文案'}_${Date.now()}.${exportFormat}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`已导出为 ${exportFormat.toUpperCase()} 文件`);
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
            cost: 0,
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
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* 左侧历史栏 */}
      <div className="w-72 flex-shrink-0 card p-4 flex flex-col">
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
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* 标题区域 */}
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sky-200 to-emerald-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">短视频文案提取</h1>
                <p className="text-sm text-slate-500">智能提取视频语音，转换为文字</p>
              </div>
              <span className="tag tag-hot ml-2">HOT</span>
            </div>
          </div>
        </div>

        {/* 输入区域 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            输入视频链接
          </h2>

          <textarea
            className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
            placeholder={`粘贴视频链接，支持抖音、快手、B站等平台\n\n示例：\nhttps://v.douyin.com/xxxxx\nhttps://www.bilibili.com/video/xxxxx`}
            value={videoUrls}
            onChange={(e) => setVideoUrls(e.target.value)}
            disabled={extracting}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCorrection}
                  onChange={(e) => setEnableCorrection(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  disabled={extracting}
                />
                <span className="text-sm text-slate-700">智能纠错</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">+0.01点</span>
              </label>

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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                导出文案
              </button>
              <button
                onClick={handleExtract}
                disabled={extracting || !videoUrls.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">提取结果</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {currentResult.audio_duration ? Number(currentResult.audio_duration).toFixed(1) : '0.0'}秒
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    {currentResult.cost ? Number(currentResult.cost).toFixed(2) : '0.00'}点
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
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
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            计费标准
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">非会员</p>
              <p className="text-2xl font-bold text-slate-900">0.02 <span className="text-sm font-normal text-slate-500">点/秒</span></p>
              <p className="text-xs text-slate-400 mt-1">按实际音频时长计费</p>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
              <p className="text-sm text-sky-600 mb-1">月度会员</p>
              <p className="text-2xl font-bold text-sky-700">0.018 <span className="text-sm font-normal text-sky-500">点/秒</span></p>
              <p className="text-xs text-sky-400 mt-1">享受 10% 折扣</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <p className="text-sm text-amber-600 mb-1">年度会员</p>
              <p className="text-2xl font-bold text-amber-700">0.015 <span className="text-sm font-normal text-amber-500">点/秒</span></p>
              <p className="text-xs text-amber-400 mt-1">享受 25% 折扣</p>
            </div>
          </div>
        </div>
      </div>

      {/* 进度弹窗 */}
      {extracting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-8 w-[400px] relative">
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
              <h2 className="text-xl font-bold text-slate-900">正在提取视频文案</h2>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { step: 0, name: '解析视频链接', desc: '获取视频信息' },
                { step: 1, name: '语音识别', desc: '转换为文字' },
                ...(enableCorrection ? [{ step: 2, name: '智能纠错', desc: '优化文本' }] : [])
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                    currentStep > item.step
                      ? 'bg-emerald-100 text-emerald-600'
                      : currentStep === item.step
                        ? 'bg-sky-100 text-sky-600 animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep > item.step ? <CheckCircle className="w-5 h-5" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${currentStep >= item.step ? 'text-slate-900' : 'text-slate-400'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  {currentStep === item.step && (
                    <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-slate-400 mb-4">
              处理时间取决于视频时长，可关闭此窗口
            </p>

            <button
              onClick={() => setExtracting(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
              隐藏进度（后台继续处理）
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoExtract;
