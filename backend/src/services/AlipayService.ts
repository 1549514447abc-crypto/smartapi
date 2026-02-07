/**
 * 支付宝支付服务
 * 使用证书模式进行签名验签
 * 配置从环境变量读取
 */

import AlipaySdk from 'alipay-sdk';
import fs from 'fs';

// 支付宝配置接口
interface AlipayConfig {
  appId: string;
  privateKey: string;
  gateway: string;
  appCertPath: string;
  alipayCertPath: string;
  rootCertPath: string;
  notifyUrl: string;
  returnUrl: string;
}

class AlipayService {
  private sdk: AlipaySdk | null = null;
  private config: AlipayConfig | null = null;

  /**
   * 从环境变量获取配置
   */
  private getConfigFromEnv(): AlipayConfig | null {
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const appCertPath = process.env.ALIPAY_APP_CERT_PATH;
    const alipayCertPath = process.env.ALIPAY_PUBLIC_CERT_PATH;
    const rootCertPath = process.env.ALIPAY_ROOT_CERT_PATH;
    const notifyUrl = process.env.ALIPAY_NOTIFY_URL;
    const returnUrl = process.env.ALIPAY_RETURN_URL;

    if (!appId || !privateKey) {
      console.error('支付宝 APP_ID 或私钥未配置');
      return null;
    }

    if (!appCertPath || !alipayCertPath || !rootCertPath) {
      console.error('支付宝证书路径未配置');
      return null;
    }

    if (!notifyUrl || !returnUrl) {
      console.error('支付宝回调URL未配置');
      return null;
    }

    return {
      appId,
      privateKey,
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      appCertPath,
      alipayCertPath,
      rootCertPath,
      notifyUrl,
      returnUrl,
    };
  }

  /**
   * 初始化支付宝 SDK
   */
  async init(): Promise<boolean> {
    try {
      // 从环境变量获取配置
      this.config = this.getConfigFromEnv();

      if (!this.config) {
        console.error('支付宝配置未找到，请检查环境变量');
        return false;
      }

      // 检查证书文件是否存在
      if (!fs.existsSync(this.config.appCertPath)) {
        console.error(`应用公钥证书不存在: ${this.config.appCertPath}`);
        return false;
      }
      if (!fs.existsSync(this.config.alipayCertPath)) {
        console.error(`支付宝公钥证书不存在: ${this.config.alipayCertPath}`);
        return false;
      }
      if (!fs.existsSync(this.config.rootCertPath)) {
        console.error(`支付宝根证书不存在: ${this.config.rootCertPath}`);
        return false;
      }

      // 创建 SDK 实例（证书模式）
      this.sdk = new AlipaySdk({
        appId: this.config.appId,
        privateKey: this.config.privateKey,
        signType: 'RSA2',
        gateway: this.config.gateway,
        // 证书模式配置
        appCertPath: this.config.appCertPath,
        alipayPublicCertPath: this.config.alipayCertPath,
        alipayRootCertPath: this.config.rootCertPath,
      });

      console.log('✅ 支付宝 SDK 初始化成功');
      return true;
    } catch (error) {
      console.error('支付宝 SDK 初始化失败:', error);
      return false;
    }
  }

  /**
   * 确保 SDK 已初始化
   */
  private async ensureInit(): Promise<void> {
    if (!this.sdk) {
      const success = await this.init();
      if (!success) {
        throw new Error('支付宝服务初始化失败');
      }
    }
  }

  /**
   * 创建网页支付订单 (电脑网站支付)
   */
  async createPagePayment(
    orderNo: string,
    amount: number,
    subject: string,
    body?: string
  ): Promise<string> {
    await this.ensureInit();

    // 在return_url中追加订单号，便于前端检测支付结果
    const returnUrlWithOrder = `${this.config!.returnUrl}?orderNo=${orderNo}`;

    try {
      const result = await this.sdk!.pageExec('alipay.trade.page.pay', {
        notify_url: this.config!.notifyUrl,
        return_url: returnUrlWithOrder,
        bizContent: {
          out_trade_no: orderNo,
          total_amount: amount.toFixed(2),
          subject: subject,
          body: body || subject,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          timeout_express: '15m', // 订单有效期15分钟，与系统超时一致
        },
      });

      return result as string;
    } catch (error: any) {
      console.error('支付宝创建订单失败:', error);
      // 解析支付宝错误码并提供友好提示
      const errorMsg = this.parseAlipayError(error);
      throw new Error(errorMsg);
    }
  }

  /**
   * 解析支付宝错误并返回友好提示
   */
  private parseAlipayError(error: any): string {
    const subCode = error?.subCode || error?.sub_code || '';
    const subMsg = error?.subMsg || error?.sub_msg || '';

    // 常见错误码映射
    const errorMap: Record<string, string> = {
      'ACQ.SYSTEM_ERROR': '支付宝系统繁忙，请稍后重试',
      'ACQ.INVALID_PARAMETER': '支付参数错误，请联系客服',
      'ACQ.SELLER_NOT_EXIST': '商户配置错误，请联系客服',
      'ACQ.CONTEXT_INCONSISTENT': '支付宝配置需要更新，请联系客服',
      'ACQ.TRADE_NOT_EXIST': '订单不存在',
      'ACQ.TRADE_HAS_CLOSE': '订单已关闭',
      'ACQ.TOTAL_FEE_EXCEED': '金额超出限制',
    };

    if (subCode && errorMap[subCode]) {
      return errorMap[subCode];
    }

    if (subMsg) {
      return `支付宝错误: ${subMsg}`;
    }

    return error.message || '支付宝支付失败，请稍后重试';
  }

  /**
   * 创建手机网站支付订单
   */
  async createWapPayment(
    orderNo: string,
    amount: number,
    subject: string,
    body?: string
  ): Promise<string> {
    await this.ensureInit();

    try {
      const result = await this.sdk!.pageExec('alipay.trade.wap.pay', {
        notify_url: this.config!.notifyUrl,
        return_url: this.config!.returnUrl,
        bizContent: {
          out_trade_no: orderNo,
          total_amount: amount.toFixed(2),
          subject: subject,
          body: body || subject,
          product_code: 'QUICK_WAP_WAY',
        },
      });

      return result as string;
    } catch (error: any) {
      console.error('支付宝WAP订单创建失败:', error);
      const errorMsg = this.parseAlipayError(error);
      throw new Error(errorMsg);
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo: string): Promise<any> {
    await this.ensureInit();

    const result = await this.sdk!.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: orderNo,
      },
    });

    return result;
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderNo: string): Promise<any> {
    await this.ensureInit();

    const result = await this.sdk!.exec('alipay.trade.close', {
      bizContent: {
        out_trade_no: orderNo,
      },
    });

    return result;
  }

  /**
   * 申请退款
   */
  async refund(orderNo: string, refundAmount: number, refundReason?: string): Promise<any> {
    await this.ensureInit();

    const result = await this.sdk!.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: orderNo,
        refund_amount: refundAmount.toFixed(2),
        refund_reason: refundReason || '用户申请退款',
      },
    });

    return result;
  }

  /**
   * 验证异步通知签名
   */
  async verifyNotify(params: Record<string, string>): Promise<boolean> {
    await this.ensureInit();

    try {
      const result = this.sdk!.checkNotifySign(params);
      return result;
    } catch (error) {
      console.error('验签失败:', error);
      return false;
    }
  }

  /**
   * 获取配置信息（脱敏）
   */
  getConfig(): { notifyUrl: string; returnUrl: string } | null {
    if (!this.config) return null;
    return {
      notifyUrl: this.config.notifyUrl,
      returnUrl: this.config.returnUrl,
    };
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInit();
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例
export default new AlipayService();
