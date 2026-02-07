import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * 注册页面 - 重定向到登录页的手机注册模式
 * 根据需求，用户只能通过手机号或微信扫码注册
 */
const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';

  useEffect(() => {
    // 重定向到登录页，传递推广码和注册模式
    navigate('/login', {
      state: {
        mode: 'sms-register',
        referralCode: referralCode
      },
      replace: true
    });
  }, [navigate, referralCode]);

  return null;
};

export default Register;
