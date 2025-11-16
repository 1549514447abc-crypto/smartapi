import { useState } from 'react';
import { Modal, Tabs, Form, Input, Button, message, QRCode } from 'antd';
import { MobileOutlined, WechatOutlined } from '@ant-design/icons';
import type { LoginRequest } from '../../types/auth';
import { useAuthStore } from '../../store/useAuthStore';
import './LoginModal.css';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LoginModal = ({ visible, onClose }: LoginModalProps) => {
  const [activeTab, setActiveTab] = useState('phone');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const [form] = Form.useForm();

  const handlePhoneLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const loginData: LoginRequest = {
        username: values.username,
        password: values.password
      };
      await login(loginData);
      message.success('登录成功！');
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatLogin = () => {
    message.info('微信扫码登录功能开发中，请先使用手机号登录');
    // TODO: Implement WeChat QR code login
    // Should auto-follow official account after scan
  };

  const handleRegister = () => {
    message.info('请联系管理员注册账号');
    // TODO: Implement registration modal or redirect
  };

  const items = [
    {
      key: 'phone',
      label: (
        <span>
          <MobileOutlined /> 手机号登录
        </span>
      ),
      children: (
        <div className="login-form-wrapper">
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePhoneLogin}
            autoComplete="off"
          >
            <Form.Item
              label="用户名或手机号"
              name="username"
              rules={[
                { required: true, message: '请输入用户名或手机号' }
              ]}
            >
              <Input
                placeholder="请输入用户名或手机号"
                size="large"
                prefix={<MobileOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' }
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-button"
              >
                登录
              </Button>
            </Form.Item>

            <div className="login-footer">
              <a onClick={() => message.info('请联系管理员重置密码')}>忘记密码？</a>
              <a onClick={handleRegister}>立即注册</a>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: 'wechat',
      label: (
        <span>
          <WechatOutlined /> 微信扫码
        </span>
      ),
      children: (
        <div className="wechat-login-wrapper">
          <div className="qr-code-container">
            <QRCode
              value="https://www.wechat.com/login"
              size={200}
              status="active"
            />
          </div>
          <div className="wechat-tips">
            <p>请使用微信扫描二维码登录</p>
            <p className="wechat-follow-tip">扫码后将自动关注公众号并完成登录</p>
          </div>
          <Button
            type="link"
            onClick={handleWeChatLogin}
            className="wechat-refresh"
          >
            刷新二维码
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      className="login-modal"
      destroyOnClose
    >
      <div className="login-modal-header">
        <h2>欢迎来到创作魔方</h2>
        <p>登录后即可使用所有AI创作工具</p>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        centered
        className="login-tabs"
      />
    </Modal>
  );
};
