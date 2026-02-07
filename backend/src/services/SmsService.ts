/**
 * 短信服务
 * 支持阿里云短信
 * 配置从环境变量读取
 */

import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

// SMS verification code storage (in-memory, consider Redis for production)
const smsCodeStore = new Map<string, { code: string; expires: number; attempts: number }>();

// 测试手机号白名单 - 使用固定验证码 123456，不发送真实短信
const TEST_PHONE_WHITELIST = ['13800000001', '13800000002'];
const TEST_CODE = '123456';

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of smsCodeStore.entries()) {
    if (value.expires < now) {
      smsCodeStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// 短信配置接口
interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  templateCodeRegister: string;
  templateCodeReset: string;
  endpoint: string;
}

class SmsService {
  private client: Dysmsapi20170525 | null = null;
  private config: SmsConfig | null = null;

  /**
   * 从环境变量获取配置
   */
  private getConfigFromEnv(): SmsConfig | null {
    const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
    const signName = process.env.ALIYUN_SMS_SIGN_NAME;
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
    const templateCodeRegister = process.env.ALIYUN_SMS_TEMPLATE_CODE_REGISTER || templateCode || '';
    const templateCodeReset = process.env.ALIYUN_SMS_TEMPLATE_CODE_RESET || templateCode || '';
    const endpoint = process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com';

    if (!accessKeyId || !accessKeySecret) {
      console.log('阿里云短信 AccessKey 未配置');
      return null;
    }

    if (!signName || !templateCode) {
      console.log('阿里云短信签名或模板未配置');
      return null;
    }

    return {
      accessKeyId,
      accessKeySecret,
      signName,
      templateCode,
      templateCodeRegister,
      templateCodeReset,
      endpoint,
    };
  }

  /**
   * 初始化阿里云短信客户端
   */
  private async init(): Promise<boolean> {
    try {
      this.config = this.getConfigFromEnv();

      if (!this.config) {
        return false;
      }

      const config = new $OpenApi.Config({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
      });
      config.endpoint = this.config.endpoint;

      this.client = new Dysmsapi20170525(config);
      console.log('阿里云短信服务初始化成功');
      return true;
    } catch (error) {
      console.error('阿里云短信服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 确保客户端已初始化
   */
  private async ensureInit(): Promise<boolean> {
    if (!this.client) {
      return await this.init();
    }
    return true;
  }

  /**
   * Check if SMS login is enabled
   */
  async isEnabled(): Promise<boolean> {
    const enabled = process.env.ALIYUN_SMS_ENABLED;
    if (enabled !== 'true') {
      return false;
    }
    // 检查配置是否完整
    return this.getConfigFromEnv() !== null;
  }

  /**
   * Generate a random 6-digit code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS verification code
   * @param phone 手机号
   * @param isNewUser 是否是新用户（用于选择不同的短信模板）
   * @param purpose 用途: 'login' | 'register' | 'reset'
   */
  async sendVerificationCode(phone: string, isNewUser: boolean = false, purpose: 'login' | 'register' | 'reset' = 'login'): Promise<{ success: boolean; message: string }> {
    // Validate phone number format (Chinese mobile)
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // 测试手机号白名单 - 直接存储固定验证码，不发送真实短信
    if (TEST_PHONE_WHITELIST.includes(phone)) {
      const expires = Date.now() + 5 * 60 * 1000;
      smsCodeStore.set(phone, { code: TEST_CODE, expires, attempts: 0 });
      console.log(`[测试模式] 手机号 ${phone} 使用固定验证码: ${TEST_CODE}`);
      return { success: true, message: '验证码已发送（测试模式）' };
    }

    // Check if SMS is enabled
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { success: false, message: '短信登录功能未启用' };
    }

    // Check rate limit (1 code per minute per phone)
    const existing = smsCodeStore.get(phone);
    if (existing && existing.expires > Date.now() + 4 * 60 * 1000) {
      return { success: false, message: '请求过于频繁，请稍后再试' };
    }

    // Ensure client is initialized
    const initialized = await this.ensureInit();
    if (!initialized) {
      return { success: false, message: '短信服务配置错误' };
    }

    // Generate code
    const code = this.generateCode();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // 根据用途选择不同的模板
    let templateCode: string;
    if (purpose === 'reset') {
      templateCode = this.config!.templateCodeReset;
    } else if (purpose === 'register' || isNewUser) {
      templateCode = this.config!.templateCodeRegister;
    } else {
      templateCode = this.config!.templateCode;
    }

    try {
      // 发送短信
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: this.config!.signName,
        templateCode: templateCode,
        templateParam: JSON.stringify({ code }),
      });

      const runtime = new $Util.RuntimeOptions({});
      const response = await this.client!.sendSmsWithOptions(sendSmsRequest, runtime);

      if (response.body?.code === 'OK') {
        // Store code
        smsCodeStore.set(phone, { code, expires, attempts: 0 });
        const purposeText = purpose === 'reset' ? '重置密码' : (purpose === 'register' || isNewUser ? '注册' : '登录');
        console.log(`短信发送成功: ${phone}, 模板: ${templateCode}, 类型: ${purposeText}`);
        return { success: true, message: '验证码已发送' };
      } else {
        console.error('阿里云短信发送失败:', response.body);
        const errorMsg = this.parseAliyunError(response.body?.code || '', response.body?.message || '');
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      console.error('SMS send error:', error);
      return { success: false, message: '短信发送失败，请稍后重试' };
    }
  }

  /**
   * 解析阿里云短信错误码
   */
  private parseAliyunError(code: string, message: string): string {
    const errorMap: Record<string, string> = {
      'isv.BUSINESS_LIMIT_CONTROL': '短信发送频率超限，请稍后再试',
      'isv.MOBILE_NUMBER_ILLEGAL': '手机号码格式错误',
      'isv.TEMPLATE_MISSING_PARAMETERS': '短信模板参数缺失',
      'isv.INVALID_PARAMETERS': '参数异常',
      'isv.AMOUNT_NOT_ENOUGH': '账户余额不足',
      'isv.OUT_OF_SERVICE': '业务停机',
    };

    return errorMap[code] || message || '短信发送失败';
  }

  /**
   * Verify SMS code
   */
  verifyCode(phone: string, code: string): { success: boolean; message: string } {
    const stored = smsCodeStore.get(phone);

    if (!stored) {
      return { success: false, message: '验证码不存在或已过期' };
    }

    if (stored.expires < Date.now()) {
      smsCodeStore.delete(phone);
      return { success: false, message: '验证码已过期' };
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      smsCodeStore.delete(phone);
      return { success: false, message: '验证码错误次数过多，请重新获取' };
    }

    if (stored.code !== code) {
      stored.attempts++;
      return { success: false, message: '验证码错误' };
    }

    // Success - remove code
    smsCodeStore.delete(phone);
    return { success: true, message: '验证成功' };
  }

  /**
   * Get SMS status for admin
   */
  async getStatus(): Promise<{
    enabled: boolean;
    hasConfig: boolean;
    signName: string | null;
  }> {
    const enabled = await this.isEnabled();
    const config = this.getConfigFromEnv();

    return {
      enabled,
      hasConfig: config !== null,
      signName: config?.signName || null,
    };
  }
}

export default new SmsService();
