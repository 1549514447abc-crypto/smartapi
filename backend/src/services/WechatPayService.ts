/**
 * 微信支付服务
 * 使用 V3 API
 * 配置从环境变量读取
 */

import WxPay from 'wechatpay-node-v3';
import fs from 'fs';
import crypto from 'crypto';

// 微信支付配置接口
interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiKeyV3: string;
  certPath: string;
  keyPath: string;
  notifyUrl: string;
  returnUrl: string;
}

class WechatPayService {
  private pay: WxPay | null = null;
  private config: WechatPayConfig | null = null;

  /**
   * 从环境变量获取配置
   */
  private getConfigFromEnv(): WechatPayConfig | null {
    const appId = process.env.WECHAT_APP_ID;
    const mchId = process.env.WECHAT_MCH_ID;
    const apiKeyV3 = process.env.WECHAT_API_KEY_V3;
    const certPath = process.env.WECHAT_CERT_PATH;
    const keyPath = process.env.WECHAT_KEY_PATH;
    const notifyUrl = process.env.WECHAT_NOTIFY_URL;
    const returnUrl = process.env.WECHAT_RETURN_URL;

    if (!appId || !mchId || !apiKeyV3) {
      console.error('微信支付基础配置未完整');
      return null;
    }

    if (!certPath || !keyPath) {
      console.error('微信支付证书路径未配置');
      return null;
    }

    if (!notifyUrl || !returnUrl) {
      console.error('微信支付回调URL未配置');
      return null;
    }

    return {
      appId,
      mchId,
      apiKeyV3,
      certPath,
      keyPath,
      notifyUrl,
      returnUrl,
    };
  }

  /**
   * 初始化微信支付
   */
  async init(): Promise<boolean> {
    try {
      this.config = this.getConfigFromEnv();

      if (!this.config) {
        console.error('微信支付配置未找到，请检查环境变量');
        return false;
      }

      // 检查证书文件是否存在
      if (!fs.existsSync(this.config.certPath)) {
        console.error(`微信支付证书不存在: ${this.config.certPath}`);
        return false;
      }
      if (!fs.existsSync(this.config.keyPath)) {
        console.error(`微信支付私钥不存在: ${this.config.keyPath}`);
        return false;
      }

      // 读取证书
      const publicKey = fs.readFileSync(this.config.certPath);
      const privateKey = fs.readFileSync(this.config.keyPath);

      // 创建微信支付实例
      this.pay = new WxPay({
        appid: this.config.appId,
        mchid: this.config.mchId,
        publicKey: publicKey,
        privateKey: privateKey,
      });

      console.log('✅ 微信支付服务初始化成功');
      return true;
    } catch (error) {
      console.error('微信支付服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 确保已初始化
   */
  private async ensureInit(): Promise<void> {
    if (!this.pay) {
      const success = await this.init();
      if (!success) {
        throw new Error('微信支付服务初始化失败');
      }
    }
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   * 返回二维码链接
   */
  async createNativePayment(
    orderNo: string,
    amount: number,
    description: string
  ): Promise<{ codeUrl: string; prepayId: string }> {
    await this.ensureInit();

    // 计算15分钟后的过期时间（ISO 8601格式）
    const expireTime = new Date(Date.now() + 15 * 60 * 1000);
    const timeExpire = expireTime.toISOString().replace(/\.\d{3}Z$/, '+08:00');

    const params = {
      appid: this.config!.appId,
      mchid: this.config!.mchId,
      description: description,
      out_trade_no: orderNo,
      time_expire: timeExpire, // 订单有效期15分钟，与系统超时一致
      notify_url: this.config!.notifyUrl,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: 'CNY',
      },
    };

    const result = await this.pay!.transactions_native(params);

    if (result.status === 200 && result.data?.code_url) {
      return {
        codeUrl: result.data.code_url,
        prepayId: result.data.prepay_id || '',
      };
    }

    throw new Error(result.data?.message || '创建微信支付订单失败');
  }

  /**
   * 创建 JSAPI 支付订单（公众号/小程序支付）
   */
  async createJsapiPayment(
    orderNo: string,
    amount: number,
    description: string,
    openId: string
  ): Promise<any> {
    await this.ensureInit();

    const params = {
      appid: this.config!.appId,
      mchid: this.config!.mchId,
      description: description,
      out_trade_no: orderNo,
      notify_url: this.config!.notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
      payer: {
        openid: openId,
      },
    };

    console.log(`[JSAPI支付] 请求参数:`, JSON.stringify(params, null, 2));
    const result = await this.pay!.transactions_jsapi(params);
    console.log(`[JSAPI支付] 响应状态: ${result.status}, 响应数据:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200) {
      // SDK 可能直接返回处理后的前端参数格式（包含 appId, timeStamp, package 等）
      if (result.data?.appId && result.data?.package) {
        console.log(`[JSAPI支付] SDK已返回处理后的参数，直接使用`);
        return {
          appId: result.data.appId,
          timeStamp: result.data.timeStamp,
          nonceStr: result.data.nonceStr,
          package: result.data.package,
          signType: result.data.signType || 'RSA',
          paySign: result.data.paySign,
        };
      }

      // 原始格式：SDK 返回 prepay_id，需要手动处理
      if (result.data?.prepay_id) {
        console.log(`[JSAPI支付] SDK返回原始prepay_id，手动生成参数`);
        const timeStamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const packageStr = `prepay_id=${result.data.prepay_id}`;

        // 签名
        const message = `${this.config!.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
        const privateKey = fs.readFileSync(this.config!.keyPath, 'utf-8');
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(message);
        const paySign = sign.sign(privateKey, 'base64');

        return {
          appId: this.config!.appId,
          timeStamp,
          nonceStr,
          package: packageStr,
          signType: 'RSA',
          paySign,
        };
      }
    }

    throw new Error(result.data?.message || '创建微信支付订单失败');
  }

  /**
   * 创建 H5 支付订单（手机浏览器支付）
   */
  async createH5Payment(
    orderNo: string,
    amount: number,
    description: string,
    clientIp: string
  ): Promise<{ h5Url: string }> {
    await this.ensureInit();

    const params = {
      appid: this.config!.appId,
      mchid: this.config!.mchId,
      description: description,
      out_trade_no: orderNo,
      notify_url: this.config!.notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: {
          type: 'Wap',
          app_name: '创作魔方',
          app_url: 'https://contentcube.cn',
        },
      },
    };

    const result = await this.pay!.transactions_h5(params as any);

    if (result.status === 200 && result.data?.h5_url) {
      return {
        h5Url: result.data.h5_url,
      };
    }

    throw new Error((result.data as any)?.message || '创建微信H5支付订单失败');
  }

  /**
   * 查询订单
   */
  async queryOrder(orderNo: string): Promise<any> {
    await this.ensureInit();

    const result = await this.pay!.query({ out_trade_no: orderNo });
    return result.data;
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderNo: string): Promise<boolean> {
    await this.ensureInit();

    const result = await this.pay!.close(orderNo);
    return result.status === 204;
  }

  /**
   * 申请退款
   */
  async refund(
    orderNo: string,
    refundNo: string,
    totalAmount: number,
    refundAmount: number,
    reason?: string
  ): Promise<any> {
    await this.ensureInit();

    const params = {
      out_trade_no: orderNo,
      out_refund_no: refundNo,
      reason: reason || '用户申请退款',
      amount: {
        refund: Math.round(refundAmount * 100),
        total: Math.round(totalAmount * 100),
        currency: 'CNY',
      },
    };

    const result = await this.pay!.refunds(params);

    if (result.status === 200) {
      return result.data;
    }

    throw new Error((result.data as any)?.message || '退款失败');
  }

  /**
   * 验证回调通知签名并解密
   */
  async verifyAndDecryptNotify(
    signature: string,
    serial: string,
    timestamp: string,
    nonce: string,
    body: any
  ): Promise<any> {
    await this.ensureInit();

    try {
      // 解密通知内容
      const { resource } = body;
      if (!resource) {
        throw new Error('通知内容为空');
      }

      const { ciphertext, associated_data, nonce: resourceNonce } = resource;

      // 先 Base64 解码整个密文
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

      // 最后16字节是 auth tag
      const authTag = ciphertextBuffer.slice(-16);
      // 前面的是实际密文
      const encryptedData = ciphertextBuffer.slice(0, -16);

      // 使用 APIv3 密钥解密 (AES-256-GCM)
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.config!.apiKeyV3, 'utf8'),
        Buffer.from(resourceNonce, 'utf8')
      );
      decipher.setAuthTag(authTag);
      if (associated_data) {
        decipher.setAAD(Buffer.from(associated_data, 'utf8'));
      }

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('解密通知失败:', error);

      // 使用 SDK 的解密方法作为备选
      try {
        const decryptResult = this.pay!.decipher_gcm(
          body.resource.ciphertext,
          body.resource.associated_data,
          body.resource.nonce,
          this.config!.apiKeyV3
        );
        return JSON.parse(decryptResult as string);
      } catch (e) {
        console.error('SDK解密也失败:', e);
        throw new Error('解密通知失败');
      }
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
export default new WechatPayService();
