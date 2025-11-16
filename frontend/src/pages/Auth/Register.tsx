import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import type { RegisterRequest } from '../../types/auth';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const { message } = App.useApp();

  const onFinish = async (values: RegisterRequest) => {
    try {
      await register(values);
      message.success('注册成功！');
      navigate('/');
    } catch (error: any) {
      // axios拦截器已经处理过错误，直接获取message
      message.error(error?.message || '注册失败，请稍后重试');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <h1>创建账号</h1>
          <p>加入创作魔方Content Cube</p>
        </div>

        <Card className="auth-card">
          <Form name="register" onFinish={onFinish} autoComplete="off">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[{ type: 'email', message: '请输入有效的邮箱!' }]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="邮箱（可选）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6个字符!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
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
                注册
              </Button>
            </Form.Item>

            <div className="auth-footer">
              <span>已有账号?</span>
              <a onClick={() => navigate('/login')}>立即登录</a>
            </div>
          </Form>
        </Card>

        <div className="auth-tips">
          <p>💡 注册即表示您同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
