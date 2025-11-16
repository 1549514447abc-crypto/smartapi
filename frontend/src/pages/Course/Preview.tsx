import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, List, Spin, message } from 'antd';
import { PlayCircleOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import { api } from '../../api/request';
import './Preview.css';

interface Lesson {
  id: number;
  title: string;
  duration: number | null;
  sort_order: number;
}

const Preview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/course/lessons');
      const lessonList = response.data.lessons;
      setLessons(lessonList);

      // 默认播放第一节课
      if (lessonList.length > 0) {
        handleLessonClick(lessonList[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch lessons:', error);
      message.error('加载课程列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setVideoUrl(`/api/course/lessons/${lesson.id}/video`);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '未知';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="preview-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h1>课程试听</h1>
        <p>免费观看10节试听课程，了解课程内容</p>
      </div>

      <div className="preview-content">
        {/* 左侧：课程列表 */}
        <div className="preview-sidebar">
          <Card title="试听课程列表" className="lesson-list-card">
            <List
              dataSource={lessons}
              renderItem={(lesson) => (
                <List.Item
                  className={`lesson-item ${currentLesson?.id === lesson.id ? 'active' : ''}`}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <div className="lesson-item-content">
                    <PlayCircleOutlined className="lesson-icon" />
                    <div className="lesson-info">
                      <div className="lesson-title">{lesson.title}</div>
                      <div className="lesson-duration">
                        <ClockCircleOutlined />
                        <span>{formatDuration(lesson.duration)}</span>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          <div className="purchase-prompt">
            <h3>想学习完整课程？</h3>
            <p>购买后获得65节正式课程，总时长40+小时</p>
            <Button
              type="primary"
              size="large"
              block
              icon={<RightOutlined />}
              onClick={() => navigate('/course/payment')}
            >
              立即购买完整课程
            </Button>
          </div>
        </div>

        {/* 右侧：视频播放器 */}
        <div className="preview-main">
          {currentLesson ? (
            <Card className="video-card">
              <h2 className="video-title">{currentLesson.title}</h2>
              <div className="video-wrapper">
                <video
                  key={videoUrl}
                  controls
                  autoPlay
                  className="video-player"
                  src={videoUrl}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
              <div className="video-info">
                <ClockCircleOutlined />
                <span>时长：{formatDuration(currentLesson.duration)}</span>
              </div>
            </Card>
          ) : (
            <Card className="video-card">
              <div className="no-video">
                <PlayCircleOutlined style={{ fontSize: 64, color: '#ccc' }} />
                <p>请从左侧选择课程开始试听</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Preview;
