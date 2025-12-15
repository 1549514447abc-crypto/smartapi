import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, message, Result } from 'antd';
import { CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { api } from '../../api/request';
import './Payment.css';

interface OrderInfo {
  order_no: string;
  course_title: string;
  amount: number;
  wechat_qr_image: string | null;
  created_at: string;
}

const Payment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  useEffect(() => {
    // 检查用户是否登录
    const token = localStorage.getItem('token');
    if (!token) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const response = await api.post('/course/orders');
      setOrderInfo(response.data);
      message.success('订单创建成功');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      if (error.response?.status === 401) {
        message.error('请先登录');
        navigate('/login');
      } else {
        message.error(error.response?.data?.message || '创建订单失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderNo = () => {
    if (orderInfo) {
      navigator.clipboard.writeText(orderInfo.order_no);
      message.success('订单号已复制到剪贴板');
    }
  };

  if (!orderInfo) {
    return (
      <div className="payment-container">
        <div className="payment-content">
          <Card className="payment-card">
            <div className="payment-preview">
              <h1>确认购买课程</h1>
              <div className="course-summary">
                <div className="summary-item">
                  <span className="label">课程名称：</span>
                  <span className="value">Coze实战训练营</span>
                </div>
                <div className="summary-item">
                  <span className="label">课程内容：</span>
                  <span className="value">100节系统课程，31个实战项目</span>
                </div>
                <div className="summary-item highlight">
                  <span className="label">支付金额：</span>
                  <span className="value price">¥799</span>
                </div>
              </div>

              <div className="payment-notice">
                <h3>购买须知</h3>
                <ul>
                  <li>点击"确认购买"后将生成订单号和微信二维码</li>
                  <li>请扫码添加讲师微信，并发送订单号</li>
                  <li>讲师确认后将通过微信发送完整课程资料</li>
                  <li>课程支持永久回看，提供完整源码和练习题</li>
                </ul>
              </div>

              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleCreateOrder}
                className="btn-create-order"
              >
                确认购买
              </Button>

              <Button
                size="large"
                block
                onClick={() => navigate('/course')}
                style={{ marginTop: 12 }}
              >
                返回课程介绍
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-content">
        <Card className="payment-card">
          <Result
            status="success"
            title="订单创建成功"
            subTitle="请按以下步骤完成购买"
          />

          <div className="order-info">
            <div className="order-item">
              <span className="label">课程名称：</span>
              <span className="value">{orderInfo.course_title}</span>
            </div>
            <div className="order-item highlight-order">
              <span className="label">订单号：</span>
              <span className="value order-no">{orderInfo.order_no}</span>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={handleCopyOrderNo}
              >
                复制
              </Button>
            </div>
            <div className="order-item">
              <span className="label">支付金额：</span>
              <span className="value price">¥{Number(orderInfo.amount).toFixed(2)}</span>
            </div>
          </div>

          <div className="wechat-section">
            <h3>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              请扫码添加讲师微信
            </h3>
            <div className="wechat-qr">
              {orderInfo.wechat_qr_image ? (
                <img src={orderInfo.wechat_qr_image} alt="微信二维码" />
              ) : (
                <div className="qr-placeholder">
                  <p>二维码暂未配置</p>
                  <p style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
                    请联系管理员上传微信二维码
                  </p>
                </div>
              )}
            </div>
            <div className="wechat-tips">
              <p className="tip-title">添加时请备注订单号：</p>
              <p className="tip-order">{orderInfo.order_no}</p>
              <p className="tip-desc">讲师确认后将发送完整课程资料</p>
            </div>
          </div>

          <div className="payment-actions">
            <Button
              size="large"
              onClick={() => navigate('/course')}
            >
              返回课程页面
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/course/preview')}
            >
              继续试听课程
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
