import { useNavigate } from 'react-router-dom';
import { Button, Row, Col } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            智能内容创作平台
          </h1>
          <p className="hero-subtitle">
            为内容创作者提供专业工具，覆盖文章处理、视频文案提取、API插件和自动化工作流
          </p>
          <div className="hero-buttons">
            <Button type="primary" size="large" onClick={() => navigate('/plugins')}>
              开始使用
            </Button>
            <Button size="large" onClick={() => navigate('/workflows')}>
              了解更多
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="container">
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <div className="feature-item">
                <h3>高效处理</h3>
                <p>基于先进技术，提供快速、准确的内容处理服务</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="feature-item">
                <h3>批量操作</h3>
                <p>支持大规模批量处理，适合团队协作和企业应用</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="feature-item">
                <h3>安全可靠</h3>
                <p>企业级数据安全保障，完善的权限管理机制</p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section">
        <div className="container">
          <h2 className="section-heading">核心功能</h2>

          <div className="product-item">
            <Row gutter={[64, 48]} align="middle">
              <Col xs={24} lg={12}>
                <div className="product-info">
                  <span className="product-label">文章处理</span>
                  <h3>文章降AI率</h3>
                  <p>智能文章优化服务，通过主流检测系统，保留原文质量，支持批量处理</p>
                  <ul className="product-list">
                    <li>通过朱雀、zerogpt等主流检测系统</li>
                    <li>保持原文质量和专业度</li>
                    <li>支持批量处理，提升工作效率</li>
                  </ul>
                  <Button
                    type="link"
                    onClick={() => navigate('/ai-reduce')}
                    icon={<ArrowRightOutlined />}
                  >
                    了解更多
                  </Button>
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div
                  className="product-visual"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop)' }}
                ></div>
              </Col>
            </Row>
          </div>

          <div className="product-item">
            <Row gutter={[64, 48]} align="middle">
              <Col xs={24} lg={12} order={{ xs: 2, lg: 1 } as any}>
                <div
                  className="product-visual"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&auto=format&fit=crop)' }}
                ></div>
              </Col>
              <Col xs={24} lg={12} order={{ xs: 1, lg: 2 } as any}>
                <div className="product-info">
                  <span className="product-label">视频处理</span>
                  <h3>视频文案提取</h3>
                  <p>支持抖音、小红书、B站、快手等主流平台，智能提取视频文案</p>
                  <ul className="product-list">
                    <li>覆盖主流短视频平台</li>
                    <li>一键批量提取文案</li>
                    <li>智能纠错和格式化输出</li>
                  </ul>
                  <Button
                    type="link"
                    onClick={() => navigate('/video-extract')}
                    icon={<ArrowRightOutlined />}
                  >
                    了解更多
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="product-item">
            <Row gutter={[64, 48]} align="middle">
              <Col xs={24} lg={12}>
                <div className="product-info">
                  <span className="product-label">扩展生态</span>
                  <h3>插件市场</h3>
                  <p>丰富的API插件生态，涵盖图像处理、视频生成、文档处理、大模型接口等</p>
                  <ul className="product-list">
                    <li>覆盖图像、视频、文档处理等领域</li>
                    <li>集成主流AI生图工具</li>
                    <li>支持GPT-4、Claude等大模型</li>
                  </ul>
                  <Button
                    type="link"
                    onClick={() => navigate('/plugins')}
                    icon={<ArrowRightOutlined />}
                  >
                    浏览插件
                  </Button>
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div
                  className="product-visual"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)' }}
                ></div>
              </Col>
            </Row>
          </div>

          <div className="product-item">
            <Row gutter={[64, 48]} align="middle">
              <Col xs={24} lg={12} order={{ xs: 2, lg: 1 } as any}>
                <div
                  className="product-visual"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop)' }}
                ></div>
              </Col>
              <Col xs={24} lg={12} order={{ xs: 1, lg: 2 } as any}>
                <div className="product-info">
                  <span className="product-label">自动化</span>
                  <h3>工作流商店</h3>
                  <p>提供Coze、Make、N8N等主流自动化平台的精品工作流模板</p>
                  <ul className="product-list">
                    <li>覆盖主流自动化平台</li>
                    <li>精选实用工作流模板</li>
                    <li>支持单个购买或会员打包</li>
                  </ul>
                  <Button
                    type="link"
                    onClick={() => navigate('/workflows')}
                    icon={<ArrowRightOutlined />}
                  >
                    浏览工作流
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <Row gutter={[48, 48]}>
            <Col xs={24} sm={8}>
              <div className="stat-item">
                <div className="stat-number">56+</div>
                <div className="stat-label">精选插件</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="stat-item">
                <div className="stat-number">1000+</div>
                <div className="stat-label">工作流模板</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="stat-item">
                <div className="stat-number">300+</div>
                <div className="stat-label">智能工具</div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">创作魔方 Content Cube</div>
            <div className="footer-info">
              <p>长沙市岳麓区梅溪湖街道听雨路429号熙旺大厦2520号</p>
              <p>商务邮箱：miemierueon@gmail.com</p>
            </div>
            <div className="footer-copyright">
              © 2025 长沙市芯跃科技有限公司 保留所有权利
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
