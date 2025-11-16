import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Tag, Spin } from 'antd';
import {
  RightOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { api } from '../../api/request';
import './Course.css';

interface CourseInfo {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cover_image: string | null;
  original_price: number;
  current_price: number;
  instructor_name: string;
  instructor_avatar: string | null;
  instructor_bio: string;
  highlights: string[];
  outline: Array<{ chapter: string; lessons: number }>;
}

const Course = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);

  useEffect(() => {
    fetchCourseInfo();
  }, []);

  const fetchCourseInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/course/info');
      setCourseInfo(response.data);
    } catch (error: any) {
      console.error('Failed to fetch course info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="course-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!courseInfo) {
    return (
      <div className="course-error">
        <h3>课程信息加载失败</h3>
      </div>
    );
  }

  return (
    <div className="course-container">
      {/* Hero Section */}
      <section className="course-hero">
        <div className="course-hero-content">
          <h1 className="course-title">{courseInfo.title}</h1>
          <p className="course-subtitle">{courseInfo.subtitle}</p>

          <div className="course-price">
            <span className="price-current">¥{Number(courseInfo.current_price).toFixed(0)}</span>
            {courseInfo.original_price > courseInfo.current_price && (
              <span className="price-original">原价 ¥{Number(courseInfo.original_price).toFixed(0)}</span>
            )}
          </div>

          <div className="course-actions">
            <Button
              type="primary"
              size="large"
              icon={<RightOutlined />}
              onClick={() => navigate('/course/payment')}
              className="btn-buy"
            >
              立即购买
            </Button>
            <Button
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate('/course/preview')}
              className="btn-preview"
            >
              免费试听
            </Button>
          </div>
        </div>
      </section>

      {/* Instructor Section */}
      <section className="course-section">
        <div className="container">
          <Card className="instructor-card">
            <h2 className="section-title">讲师介绍</h2>
            <div className="instructor-info">
              <div className="instructor-avatar">
                {courseInfo.instructor_avatar ? (
                  <img src={courseInfo.instructor_avatar} alt={courseInfo.instructor_name} />
                ) : (
                  <div className="avatar-placeholder">
                    {courseInfo.instructor_name?.charAt(0) || 'T'}
                  </div>
                )}
              </div>
              <div className="instructor-details">
                <h3 className="instructor-name">{courseInfo.instructor_name}</h3>
                <p className="instructor-bio">{courseInfo.instructor_bio}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="course-section highlights-section">
        <div className="container">
          <h2 className="section-title">课程亮点</h2>
          <div className="highlights-grid">
            {courseInfo.highlights?.map((highlight, index) => (
              <div key={index} className="highlight-item">
                <CheckCircleOutlined className="highlight-icon" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="course-section">
        <div className="container">
          <Card>
            <h2 className="section-title">课程介绍</h2>
            <div className="course-description">
              {courseInfo.description?.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Outline Section */}
      <section className="course-section">
        <div className="container">
          <Card>
            <h2 className="section-title">课程大纲</h2>
            <div className="course-outline">
              {courseInfo.outline?.map((item, index) => (
                <div key={index} className="outline-item">
                  <div className="outline-chapter">{item.chapter}</div>
                  <Tag className="outline-lessons">共{item.lessons}节</Tag>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="course-cta">
        <div className="container">
          <h2>开始学习 React 全栈开发</h2>
          <p>立即购买课程，开启你的编程之旅</p>
          <div className="cta-buttons">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/course/payment')}
            >
              立即购买 ¥{Number(courseInfo.current_price).toFixed(0)}
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/course/preview')}
            >
              免费试听10节课
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Course;
