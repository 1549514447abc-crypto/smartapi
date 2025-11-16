import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import type { LoginRequest } from '../../types/auth';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuthStore();
  const { message } = App.useApp();

  const onFinish = async (values: LoginRequest) => {
    try {
      await login(values);
      message.success('登录成功！');
      // 登录成功后跳转回之前的页面，如果没有则跳转到首页
      const from = (location.state as any)?.from || '/';
      navigate(from);
    } catch (error: any) {
      // axios拦截器已经处理过错误，直接获取message
      console.log('Login error:', error);
      const errorMessage = error?.message || error?.error || '登录失败，请检查用户名和密码';
      console.log('Error message to display:', errorMessage);
      console.log('Calling message.error...');
      message.error(errorMessage);
      console.log('message.error called');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <h1>欢迎回来</h1>
          <p>登录到创作魔方Content Cube</p>
        </div>

        <Card className="auth-card">
          <Form name="login" onFinish={onFinish} autoComplete="off">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="auth-button"
              >
                登录
              </Button>
            </Form.Item>

            <div className="auth-footer">
              <span>还没有账号?</span>
              <a onClick={() => navigate('/register')}>立即注册</a>
            </div>
          </Form>
        </Card>

        <div className="auth-tips">
          <p>💡 测试账号：admin / 123456</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
