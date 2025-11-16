import { useState, useEffect } from 'react';
import { message, Button } from 'antd';
import { api } from '../../api/request';
import './VideoExtract.css';

interface ExtractionTask {
  id: number;
  video_title: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcript: string | null;
  corrected_transcript: string | null;
  created_at: string;
  audio_duration: number | null;
  used_seconds: number | null;
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

  // 加载历史任务
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
    e.stopPropagation(); // 阻止事件冒泡

    try {
      const response = await api.delete(`/video/tasks/${taskId}`);
      if (response.success) {
        message.success('删除成功');
        // 从列表中移除
        setHistoryTasks(prev => prev.filter(t => t.id !== taskId));
        // 如果删除的是当前选中的任务，清空结果
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

  // 提取视频文案
  const handleExtract = async () => {
    if (!videoUrls.trim()) {
      message.warning('请输入视频链接');
      return;
    }

    // 解析多个URL（每行一个）
    const urls = videoUrls.split('\n').filter(url => url.trim());

    if (urls.length === 0) {
      message.warning('请输入有效的视频链接');
      return;
    }

    if (urls.length > 1) {
      message.info('批量处理功能即将上线，当前仅处理第一个链接');
    }

    const url = urls[0].trim();

    setExtracting(true);
    setCurrentResult(null);
    setCurrentStep(0);

    try {
      // 模拟3步流程的进度显示
      const progressInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 2) return prev + 1;
          return prev;
        });
      }, 2000);

      const response = await api.post<{
        success: boolean;
        data: ExtractionResult;
        message: string;
      }>('/video/extract', {
        url,
        enableCorrection
      });

      clearInterval(progressInterval);
      setCurrentStep(3); // 完成状态

      if (response.success) {
        setCurrentResult(response.data);
        message.success(`提取成功！消耗 ${response.data.cost} 点数`);

        // 刷新历史任务
        fetchHistoryTasks(1);

        // 清空输入
        setVideoUrls('');
      } else {
        message.error(response.message || '提取失败');
      }
    } catch (error: any) {
      console.error('Extract failed:', error);
      message.error(error.response?.data?.error || '提取失败，请重试');
    } finally {
      setExtracting(false);
      setCurrentStep(0);
    }
  };

  // 导出文案
  const handleExport = () => {
    if (!currentResult) {
      message.warning('暂无可导出的内容');
      return;
    }

    const text = enableCorrection && currentResult.corrected_transcript
      ? currentResult.corrected_transcript
      : currentResult.transcript;

    const filename = `${currentResult.video_title || '视频文案'}_${Date.now()}.${exportFormat}`;

    // 创建Blob并下载
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

  // 选择历史任务
  const handleSelectTask = async (taskId: number) => {
    setSelectedTaskId(taskId);

    try {
      const response = await api.get<{
        success: boolean;
        data: ExtractionTask;
      }>(`/video/tasks/${taskId}`);

      if (response.success) {
        const task = response.data;
        // 显示历史任务的结果
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
    } catch (error) {
      console.error('Failed to load task:', error);
      message.error('加载任务失败');
    }
  };

  // 格式化时间
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

  return (
    <div className="video-extract-container">
      {/* 左侧历史栏 */}
      <div className="extract-sidebar">
        <div className="sidebar-header">
          <h3>📋 提取历史</h3>
          <div className="sidebar-stats">
            <div className="stat-item">
              <span className="stat-label">总计</span>
              <span className="stat-value">{historyTasks.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">成功</span>
              <span className="stat-value">
                {historyTasks.filter(t => t.status === 'completed').length}
              </span>
            </div>
          </div>
        </div>

        <div className="history-list">
          {historyTasks.map((task) => (
            <div
              key={task.id}
              className={`history-item ${selectedTaskId === task.id ? 'active' : ''}`}
              onClick={() => handleSelectTask(task.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="history-item-title">
                  {task.video_title || '未命名视频'}
                </div>
                <div className="history-item-time">{formatTime(task.created_at)}</div>
                <span
                  className={`history-item-status status-${task.status}`}
                >
                  {task.status === 'completed' && '✓ 已完成'}
                  {task.status === 'processing' && '⏳ 处理中'}
                  {task.status === 'failed' && '✗ 失败'}
                </span>
              </div>
              <Button
                type="text"
                danger
                size="small"
                icon={<span style={{ fontSize: '16px' }}>🗑️</span>}
                onClick={(e) => handleDeleteTask(task.id, e)}
                style={{ marginLeft: '8px', flexShrink: 0 }}
              />
            </div>
          ))}

          {historyTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              暂无提取记录
            </div>
          )}

          {historyTasks.length > 0 && hasMore && (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Button
                type="link"
                loading={loadingMore}
                onClick={handleLoadMore}
                style={{ width: '100%' }}
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="extract-main-content">
        <div className="content-header">
          <h1>🎬 短视频文案提取</h1>
          <p>智能提取视频语音并转换为文字，支持批量处理和智能纠错</p>
        </div>

        <div className="content-body">
          {/* 输入区域 */}
          <div className="input-section">
            <h2 className="section-title">视频链接</h2>

            <div className="url-input-wrapper">
              <label className="url-input-label">
                粘贴视频链接（支持抖音/快手/B站等平台，每行一个链接）
              </label>
              <textarea
                className="url-textarea"
                placeholder={`示例：\nhttps://v.douyin.com/xxxxx\nhttps://www.kuaishou.com/xxxxx\nhttps://www.bilibili.com/video/xxxxx`}
                value={videoUrls}
                onChange={(e) => setVideoUrls(e.target.value)}
                disabled={extracting}
              />
              <div className="input-hint">
                💡 支持批量提取，每行一个视频链接即可
              </div>
            </div>

            {/* 选项行 */}
            <div className="options-row">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={enableCorrection}
                  onChange={(e) => setEnableCorrection(e.target.checked)}
                  disabled={extracting}
                />
                <span className="checkbox-label">
                  智能纠错
                  <span className="cost-badge">+0.01 点</span>
                </span>
              </label>

              <div className="radio-group">
                <span style={{ fontSize: '14px', color: '#666' }}>导出格式：</span>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="format"
                    value="txt"
                    checked={exportFormat === 'txt'}
                    onChange={() => setExportFormat('txt')}
                  />
                  <span className="radio-label">TXT文本</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="format"
                    value="word"
                    checked={exportFormat === 'word'}
                    onChange={() => setExportFormat('word')}
                  />
                  <span className="radio-label">Word文档</span>
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="action-row">
              <button
                className="btn-extract"
                onClick={handleExtract}
                disabled={extracting || !videoUrls.trim()}
              >
                {extracting ? '提取中...' : '🚀 开始提取'}
              </button>

              <button
                className="btn-export"
                onClick={handleExport}
                disabled={!currentResult}
              >
                📥 导出文案
              </button>
            </div>
          </div>

          {/* 结果区域 */}
          {currentResult && (
            <div className="result-section">
              <div className="result-header">
                <h2 className="section-title">提取结果</h2>
                <div className="result-meta">
                  <div className="meta-item">
                    <span>⏱️</span>
                    <span>{currentResult.audio_duration ? Number(currentResult.audio_duration).toFixed(1) : '0.0'}秒</span>
                  </div>
                  <div className="meta-item">
                    <span>💰</span>
                    <span>{currentResult.cost ? Number(currentResult.cost).toFixed(2) : '0.00'} 点数</span>
                  </div>
                  <div className="meta-item">
                    <span>📝</span>
                    <span>
                      {(enableCorrection && currentResult.corrected_transcript
                        ? currentResult.corrected_transcript
                        : currentResult.transcript
                      )?.length || 0} 字
                    </span>
                  </div>
                </div>
              </div>

              <div className="result-content">
                {enableCorrection && currentResult.corrected_transcript
                  ? currentResult.corrected_transcript
                  : currentResult.transcript}
              </div>
            </div>
          )}

          {!currentResult && !extracting && (
            <div className="result-section">
              <div className="empty-result">
                <div className="empty-icon">📝</div>
                <div>提取完成后，文案将在这里显示</div>
              </div>
            </div>
          )}

          {/* 计费说明 */}
          <div className="pricing-section">
            <h3 className="pricing-title">💰 计费标准</h3>
            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-card-title">非会员</div>
                <div className="pricing-card-value">0.02 点/秒</div>
                <div className="pricing-card-desc">按实际音频时长计费</div>
              </div>
              <div className="pricing-card">
                <div className="pricing-card-title">月度会员</div>
                <div className="pricing-card-value">0.018 点/秒</div>
                <div className="pricing-card-desc">享受 10% 折扣</div>
              </div>
              <div className="pricing-card">
                <div className="pricing-card-title">年度会员</div>
                <div className="pricing-card-value">0.015 点/秒</div>
                <div className="pricing-card-desc">享受 25% 折扣</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 进度显示Modal */}
      {extracting && (
        <div className="progress-overlay">
          <div className="progress-modal">
            <h2 className="progress-title">⚡ 正在提取视频文案</h2>

            <div className="progress-steps">
              {/* Step 1 */}
              <div className={`progress-step ${currentStep >= 0 ? (currentStep > 0 ? 'completed' : 'active') : ''}`}>
                <div className={`step-icon ${currentStep > 0 ? 'completed' : currentStep === 0 ? 'active' : 'pending'}`}>
                  {currentStep > 0 ? '✓' : '1'}
                </div>
                <div className="step-info">
                  <div className="step-name">解析视频链接</div>
                  <div className="step-desc">正在获取视频信息...</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`progress-step ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : ''}`}>
                <div className={`step-icon ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'}`}>
                  {currentStep > 1 ? '✓' : '2'}
                </div>
                <div className="step-info">
                  <div className="step-name">语音识别</div>
                  <div className="step-desc">正在将语音转换为文字...</div>
                </div>
              </div>

              {/* Step 3 */}
              {enableCorrection && (
                <div className={`progress-step ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className={`step-icon ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending'}`}>
                    {currentStep > 2 ? '✓' : '3'}
                  </div>
                  <div className="step-info">
                    <div className="step-name">智能纠错</div>
                    <div className="step-desc">正在纠正文本错误...</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', color: '#999', fontSize: '13px' }}>
              请耐心等待，处理时间取决于视频时长
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoExtract;
