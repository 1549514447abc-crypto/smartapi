/**
 * 第三方服务配置管理控制器
 * 用于管理支付宝、微信支付、短信等第三方服务配置
 * 配置存储在环境变量中，这里提供查看和状态检查功能
 */

import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import AlipayService from '../services/AlipayService';
import WechatPayService from '../services/WechatPayService';
import SmsService from '../services/SmsService';

/**
 * 脱敏处理
 */
function maskValue(value: string | undefined, showChars: number = 4): string {
  if (!value) return '未配置';
  if (value.length <= showChars * 2) return '******';
  return value.substring(0, showChars) + '******' + value.substring(value.length - showChars);
}

function maskPath(value: string | undefined): string {
  if (!value) return '未配置';
  // 只显示文件名
  const parts = value.split('/');
  return '.../' + parts[parts.length - 1];
}

/**
 * 获取支付宝配置状态
 * GET /api/admin/third-party/alipay
 */
export const getAlipayConfig = async (req: Request, res: Response) => {
  try {
    const isAvailable = await AlipayService.isAvailable();

    const config = {
      status: isAvailable ? 'active' : 'inactive',
      statusText: isAvailable ? '正常运行' : '未启用或配置错误',
      app_id: maskValue(process.env.ALIPAY_APP_ID, 6),
      private_key: process.env.ALIPAY_PRIVATE_KEY ? '已配置' : '未配置',
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      app_cert_path: maskPath(process.env.ALIPAY_APP_CERT_PATH),
      public_cert_path: maskPath(process.env.ALIPAY_PUBLIC_CERT_PATH),
      root_cert_path: maskPath(process.env.ALIPAY_ROOT_CERT_PATH),
      notify_url: process.env.ALIPAY_NOTIFY_URL || '未配置',
      return_url: process.env.ALIPAY_RETURN_URL || '未配置',
    };

    return successResponse(res, config);
  } catch (error) {
    console.error('获取支付宝配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

/**
 * 获取微信支付配置状态
 * GET /api/admin/third-party/wechat-pay
 */
export const getWechatPayConfig = async (req: Request, res: Response) => {
  try {
    const isAvailable = await WechatPayService.isAvailable();

    const config = {
      status: isAvailable ? 'active' : 'inactive',
      statusText: isAvailable ? '正常运行' : '未启用或配置错误',
      app_id: maskValue(process.env.WECHAT_APP_ID, 6),
      mch_id: maskValue(process.env.WECHAT_MCH_ID, 4),
      api_key_v2: process.env.WECHAT_API_KEY_V2 ? '已配置' : '未配置',
      api_key_v3: process.env.WECHAT_API_KEY_V3 ? '已配置' : '未配置',
      cert_path: maskPath(process.env.WECHAT_CERT_PATH),
      key_path: maskPath(process.env.WECHAT_KEY_PATH),
      notify_url: process.env.WECHAT_NOTIFY_URL || '未配置',
      return_url: process.env.WECHAT_RETURN_URL || '未配置',
    };

    return successResponse(res, config);
  } catch (error) {
    console.error('获取微信支付配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

/**
 * 获取微信公众号配置状态
 * GET /api/admin/third-party/wechat-mp
 */
export const getWechatMpConfig = async (req: Request, res: Response) => {
  try {
    const hasConfig = !!(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET);

    const config = {
      status: hasConfig ? 'active' : 'inactive',
      statusText: hasConfig ? '已配置' : '未配置',
      app_id: maskValue(process.env.WECHAT_APP_ID, 6),
      app_secret: process.env.WECHAT_APP_SECRET ? '已配置' : '未配置',
      mp_token: process.env.WECHAT_MP_TOKEN ? '已配置' : '未配置',
    };

    return successResponse(res, config);
  } catch (error) {
    console.error('获取微信公众号配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

/**
 * 获取微信转账配置状态
 * GET /api/admin/third-party/wechat-transfer
 */
export const getWechatTransferConfig = async (req: Request, res: Response) => {
  try {
    // 检查转账所需的配置
    const hasAllConfig = !!(
      process.env.WECHAT_MCH_ID &&
      process.env.WECHAT_APP_ID &&
      process.env.WECHAT_API_KEY_V3 &&
      process.env.WECHAT_KEY_PATH &&
      process.env.WECHAT_SERIAL_NO
    );

    const config = {
      status: hasAllConfig ? 'active' : 'inactive',
      statusText: hasAllConfig ? '正常运行' : '未启用或配置不完整',
      app_id: maskValue(process.env.WECHAT_APP_ID, 6),
      mch_id: maskValue(process.env.WECHAT_MCH_ID, 4),
      api_key_v3: process.env.WECHAT_API_KEY_V3 ? '已配置' : '未配置',
      key_path: maskPath(process.env.WECHAT_KEY_PATH),
      cert_path: maskPath(process.env.WECHAT_CERT_PATH),
      serial_no: maskValue(process.env.WECHAT_SERIAL_NO, 8),
    };

    return successResponse(res, config);
  } catch (error) {
    console.error('获取微信转账配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

/**
 * 获取短信配置状态
 * GET /api/admin/third-party/sms
 */
export const getSmsConfig = async (req: Request, res: Response) => {
  try {
    const isEnabled = await SmsService.isEnabled();
    const status = await SmsService.getStatus();

    const config = {
      status: isEnabled ? 'active' : 'inactive',
      statusText: isEnabled ? '正常运行' : '未启用或配置错误',
      enabled: process.env.ALIYUN_SMS_ENABLED === 'true',
      provider: 'aliyun',
      access_key_id: maskValue(process.env.ALIYUN_SMS_ACCESS_KEY_ID, 6),
      access_key_secret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET ? '已配置' : '未配置',
      sign_name: status.signName || '未配置',
      template_code_login: process.env.ALIYUN_SMS_TEMPLATE_CODE || '未配置',
      template_code_register: process.env.ALIYUN_SMS_TEMPLATE_CODE_REGISTER || '未配置',
      template_code_reset: process.env.ALIYUN_SMS_TEMPLATE_CODE_RESET || '未配置',
    };

    return successResponse(res, config);
  } catch (error) {
    console.error('获取短信配置失败:', error);
    return errorResponse(res, '获取配置失败');
  }
};

/**
 * 获取所有第三方服务配置概览
 * GET /api/admin/third-party/overview
 */
export const getConfigOverview = async (req: Request, res: Response) => {
  try {
    const [alipayAvailable, wechatAvailable, smsEnabled] = await Promise.all([
      AlipayService.isAvailable(),
      WechatPayService.isAvailable(),
      SmsService.isEnabled(),
    ]);

    const wechatMpConfigured = !!(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET);

    // 检查微信转账配置
    const wechatTransferConfigured = !!(
      process.env.WECHAT_MCH_ID &&
      process.env.WECHAT_APP_ID &&
      process.env.WECHAT_API_KEY_V3 &&
      process.env.WECHAT_KEY_PATH &&
      process.env.WECHAT_SERIAL_NO
    );

    const overview = {
      alipay: {
        name: '支付宝支付',
        status: alipayAvailable ? 'active' : 'inactive',
        statusText: alipayAvailable ? '正常' : '未启用',
      },
      wechat_pay: {
        name: '微信支付',
        status: wechatAvailable ? 'active' : 'inactive',
        statusText: wechatAvailable ? '正常' : '未启用',
      },
      wechat_mp: {
        name: '微信公众号',
        status: wechatMpConfigured ? 'active' : 'inactive',
        statusText: wechatMpConfigured ? '已配置' : '未配置',
      },
      wechat_transfer: {
        name: '微信转账（提现）',
        status: wechatTransferConfigured ? 'active' : 'inactive',
        statusText: wechatTransferConfigured ? '正常' : '未配置',
      },
      sms: {
        name: '短信服务',
        status: smsEnabled ? 'active' : 'inactive',
        statusText: smsEnabled ? '正常' : '未启用',
      },
    };

    return successResponse(res, overview);
  } catch (error) {
    console.error('获取配置概览失败:', error);
    return errorResponse(res, '获取配置概览失败');
  }
};

/**
 * 测试支付宝连接
 * POST /api/admin/third-party/alipay/test
 */
export const testAlipayConnection = async (req: Request, res: Response) => {
  try {
    const isAvailable = await AlipayService.isAvailable();

    if (isAvailable) {
      return successResponse(res, { connected: true }, '支付宝服务连接正常');
    } else {
      return errorResponse(res, '支付宝服务连接失败，请检查配置');
    }
  } catch (error: any) {
    return errorResponse(res, error.message || '测试连接失败');
  }
};

/**
 * 测试微信支付连接
 * POST /api/admin/third-party/wechat-pay/test
 */
export const testWechatPayConnection = async (req: Request, res: Response) => {
  try {
    const isAvailable = await WechatPayService.isAvailable();

    if (isAvailable) {
      return successResponse(res, { connected: true }, '微信支付服务连接正常');
    } else {
      return errorResponse(res, '微信支付服务连接失败，请检查配置');
    }
  } catch (error: any) {
    return errorResponse(res, error.message || '测试连接失败');
  }
};

/**
 * 测试短信服务
 * POST /api/admin/third-party/sms/test
 */
export const testSmsService = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return errorResponse(res, '请提供测试手机号', 400);
    }

    const result = await SmsService.sendVerificationCode(phone, false, 'login');

    if (result.success) {
      return successResponse(res, null, '测试短信已发送');
    } else {
      return errorResponse(res, result.message);
    }
  } catch (error: any) {
    return errorResponse(res, error.message || '测试发送失败');
  }
};
