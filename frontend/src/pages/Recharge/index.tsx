import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, message, Modal, Spin, Statistic } from 'antd';
import {
  AlipayOutlined,
  WechatOutlined,
  GiftOutlined,
  WalletOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/request';
import './Recharge.css';

interface BonusRule {
  amount: number;
  bonusRate: number;
  bonusAmount: number;
  displayText: string;
}

interface RechargeConfig {
  minAmount: number;
  maxAmount: number;
  bonusRules: BonusRule[];
  paymentMethods: Array<{
    value: string;
    label: string;
    icon: string;
  }>;
}

interface RechargeOrder {
  orderNo: string;
  amount: number;
  bonusAmount: number;
  totalAmount: number;
  paymentMethod: string;
  qrCodeUrl: string;
  mockPayUrl: string;
}

const Recharge: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<RechargeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('alipay');
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrder | null>(null);
  const [pollingTimer, setPollingTimer] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // 加载充值配置
  useEffect(() => {
    fetchConfig();
    fetchUserBalance();
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [pollingTimer]);

  const fetchConfig = async () => {
    try {
      const response = await api.get<{ success: boolean; data: RechargeConfig }>('/recharge/config');
      if (response.success) {
        setConfig(response.data);
        // 默认选中第三个档位（100元）
        if (response.data.bonusRules.length >= 3) {
          setSelectedAmount(response.data.bonusRules[3].amount);
        }
      }
    } catch (error) {
      message.error('加载充值配置失败');
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/auth/me');
      if (response.success && response.data.balance !== undefined) {
        setUserBalance(response.data.balance);
      }
    } catch (error) {
      console.error('获取用户余额失败:', error);
    }
  };

  const calculateBonus = (amount: number): number => {
    if (!config) return 0;
    for (const rule of config.bonusRules) {
      if (amount >= rule.amount) {
        return rule.bonusAmount;
      }
    }
    return 0;
  };

  const handleRecharge = async () => {
    if (!selectedAmount) {
      message.warning('请选择充值金额');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        success: boolean;
        data: RechargeOrder;
      }>('/recharge/create', {
        amount: selectedAmount,
        paymentMethod: selectedMethod
      });

      if (response.success) {
        setCurrentOrder(response.data);
        setPayModalVisible(true);
        // 开始轮询订单状态
        startPolling(response.data.orderNo);
      } else {
        message.error('创建订单失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 轮询订单状态
  const startPolling = (orderNo: string) => {
    const timer = setInterval(async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: { status: string };
        }>(`/recharge/order/${orderNo}`);

        if (response.success && response.data.status === 'success') {
          // 支付成功
          clearInterval(timer);
          setPollingTimer(null);
          setPayModalVisible(false);
          message.success('充值成功！');
          fetchUserBalance(); // 刷新余额
          setCurrentOrder(null);
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    setPollingTimer(timer);
  };

  // 模拟支付（测试用）
  const handleMockPay = async () => {
    if (!currentOrder) return;

    try {
      const response = await api.post(`/recharge/mock-pay/${currentOrder.orderNo}`);
      if (response.success) {
        message.success('支付成功！');
        // 轮询会自动检测到状态变化并关闭弹窗
      }
    } catch (error) {
      message.error('支付失败');
    }
  };

  const handleCancelPay = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
    setPayModalVisible(false);
    setCurrentOrder(null);
  };

  if (!config) {
    return (
      <div className="recharge-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="recharge-container">
      <Card className="recharge-card">
        <div className="recharge-header">
          <h1>
            <WalletOutlined /> 账户充值
          </h1>
          <div className="balance-display">
            <Statistic
              title="当前余额"
              value={userBalance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </div>
        </div>

        {/* 充值金额选择 */}
        <div className="amount-section">
          <h3>选择充值金额</h3>
          <Row gutter={[16, 16]}>
            {config.bonusRules.map((rule) => (
              <Col xs={12} sm={8} md={6} key={rule.amount}>
                <Card
                  className={`amount-card ${selectedAmount === rule.amount ? 'selected' : ''}`}
                  hoverable
                  onClick={() => setSelectedAmount(rule.amount)}
                >
                  <div className="amount-value">¥{rule.amount}</div>
                  {rule.bonusAmount > 0 && (
                    <div className="bonus-badge">
                      <GiftOutlined /> 送{rule.bonusAmount.toFixed(0)}元
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* 支付方式选择 */}
        <div className="payment-section">
          <h3>选择支付方式</h3>
          <Row gutter={16}>
            <Col xs={12} sm={12}>
              <Card
                className={`payment-card ${selectedMethod === 'alipay' ? 'selected' : ''}`}
                hoverable
                onClick={() => setSelectedMethod('alipay')}
              >
                <AlipayOutlined className="payment-icon alipay" />
                <div>支付宝</div>
              </Card>
            </Col>
            <Col xs={12} sm={12}>
              <Card
                className={`payment-card ${selectedMethod === 'wechat' ? 'selected' : ''}`}
                hoverable
                onClick={() => setSelectedMethod('wechat')}
              >
                <WechatOutlined className="payment-icon wechat" />
                <div>微信支付</div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* 充值说明 */}
        {selectedAmount && (
          <Card className="summary-card">
            <Row gutter={16}>
              <Col span={8}>
                <div className="summary-item">
                  <div className="summary-label">充值金额</div>
                  <div className="summary-value">¥{selectedAmount}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="summary-item">
                  <div className="summary-label">赠送金额</div>
                  <div className="summary-value bonus">
                    +¥{calculateBonus(selectedAmount).toFixed(2)}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="summary-item">
                  <div className="summary-label">实际到账</div>
                  <div className="summary-value total">
                    ¥{(selectedAmount + calculateBonus(selectedAmount)).toFixed(2)}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleRecharge}
            disabled={!selectedAmount}
            block
          >
            立即充值
          </Button>
          <Button
            size="large"
            icon={<HistoryOutlined />}
            onClick={() => navigate('/recharge/history')}
            style={{ marginTop: 16 }}
            block
          >
            充值记录
          </Button>
        </div>
      </Card>

      {/* 支付二维码弹窗 */}
      <Modal
        title="扫码支付"
        open={payModalVisible}
        onCancel={handleCancelPay}
        footer={null}
        width={400}
        centered
      >
        {currentOrder && (
          <div className="payment-modal">
            <div className="payment-info">
              <div className="payment-method-display">
                {selectedMethod === 'alipay' ? (
                  <>
                    <AlipayOutlined className="payment-icon-large alipay" />
                    <div>支付宝扫码支付</div>
                  </>
                ) : (
                  <>
                    <WechatOutlined className="payment-icon-large wechat" />
                    <div>微信扫码支付</div>
                  </>
                )}
              </div>

              <div className="qrcode-container">
                <img src={currentOrder.qrCodeUrl} alt="支付二维码" />
              </div>

              <div className="payment-amount">
                <div>支付金额</div>
                <div className="amount-display">¥{currentOrder.amount}</div>
              </div>

              <div className="payment-tip">
                <Spin /> 等待支付中...
              </div>

              {/* 测试按钮 */}
              <Button
                type="dashed"
                onClick={handleMockPay}
                block
                style={{ marginTop: 16 }}
              >
                🧪 模拟支付（测试用）
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Recharge;
