import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 课程支付页面 - 重定向到课程介绍页
 * 现在购买流程已经集成到课程介绍页中
 */
const Payment = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 重定向到课程介绍页
    navigate('/course', { replace: true });
  }, [navigate]);

  return null;
};

export default Payment;
