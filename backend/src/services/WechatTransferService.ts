/**
 * 微信商家转账服务
 * 使用微信支付V3 API实现商家转账到零钱
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface TransferParams {
  outBatchNo: string;      // 商户批次单号
  outDetailNo: string;     // 商户明细单号
  openid: string;          // 收款用户OpenID
  amount: number;          // 转账金额（元）
  userName: string;        // 收款用户姓名
  remark: string;          // 转账备注
}

interface TransferResult {
  success: boolean;
  batchId?: string;
  detailId?: string;
  batchStatus?: string; // ACCEPTED, PROCESSING, FINISHED, CLOSED, WAIT_USER_CONFIRM
  packageInfo?: string; // 用于调起用户确认收款（新版本）
  errorCode?: string;
  errorMessage?: string;
}

class WechatTransferService {
  private mchId: string;
  private appId: string;
  private apiKeyV3: string;
  private certPath: string;
  private keyPath: string;
  private serialNo: string;

  constructor() {
    this.mchId = process.env.WECHAT_MCH_ID || '';
    this.appId = process.env.WECHAT_APP_ID || '';
    this.apiKeyV3 = process.env.WECHAT_API_KEY_V3 || '';
    this.certPath = process.env.WECHAT_CERT_PATH || '';
    this.keyPath = process.env.WECHAT_KEY_PATH || '';
    this.serialNo = process.env.WECHAT_SERIAL_NO || '';
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!(
      this.mchId &&
      this.appId &&
      this.apiKeyV3 &&
      this.keyPath &&
      fs.existsSync(this.keyPath)
    );
  }

  /**
   * 执行转账
   * 使用2025年新版API: /v3/fund-app/mch-transfer/transfer-bills
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        errorCode: 'CONFIG_ERROR',
        errorMessage: '微信转账服务配置不完整'
      };
    }

    try {
      // 构建请求体（2025新版API格式）
      const amountInFen = Math.round(params.amount * 100); // 转换为分

      // 调试日志：打印实际使用的商户号
      console.log('[微信转账] 使用的商户号 mchId:', this.mchId);
      console.log('[微信转账] 使用的 appId:', this.appId);
      console.log('[微信转账] 使用的 serialNo:', this.serialNo);

      const requestBody = {
        appid: this.appId,
        out_bill_no: params.outBatchNo,  // 新版使用 out_bill_no 而非 out_batch_no
        transfer_scene_id: '1005',       // 佣金报酬场景
        openid: params.openid,           // 直接在顶层，不在 transfer_detail_list
        transfer_amount: amountInFen,    // 直接在顶层，不在 transfer_detail_list
        transfer_remark: params.remark,  // 转账备注
        // user_name: this.encryptUserName(params.userName), // 金额>=2000元时必填
        // notify_url: 'https://yourdomain.com/api/wechat/transfer/notify', // 异步通知地址
        // user_recv_perception: 留空使用场景默认内容
        // 佣金报酬场景报备信息（必填）
        transfer_scene_report_infos: [
          {
            info_type: '岗位类型',
            info_content: '推广员'
          },
          {
            info_type: '报酬说明',
            info_content: '推广佣金'
          }
        ]
      };

      // 发起请求到新版API
      const url = 'https://api.mch.weixin.qq.com/v3/fund-app/mch-transfer/transfer-bills';
      console.log('[微信转账-新版API] 请求参数:', JSON.stringify(requestBody, null, 2));
      const response = await this.sendRequest('POST', url, requestBody);
      console.log('[微信转账-新版API] 返回结果:', JSON.stringify(response, null, 2));

      // 新版API返回字段：transfer_bill_no, state, package_info
      if (response.transfer_bill_no) {
        console.log(`微信转账成功: 单号 ${response.transfer_bill_no}, 状态 ${response.state}`);

        // 新版本：如果状态是 WAIT_USER_CONFIRM，需要返回 package_info 给前端
        if (response.state === 'WAIT_USER_CONFIRM' && response.package_info) {
          console.log(`需要用户确认收款，package_info: ${response.package_info}`);
        }

        return {
          success: true,
          batchId: response.transfer_bill_no,
          detailId: response.transfer_bill_no,
          batchStatus: response.state,      // ACCEPTED, PROCESSING, WAIT_USER_CONFIRM, TRANSFERING, SUCCESS, FAIL
          packageInfo: response.package_info // 用于拉起用户确认收款页面
        };
      } else {
        return {
          success: false,
          errorCode: response.code || 'UNKNOWN',
          errorMessage: response.message || '转账失败'
        };
      }
    } catch (error: any) {
      console.error('微信转账异常:', error);
      return {
        success: false,
        errorCode: 'EXCEPTION',
        errorMessage: error.message || '转账异常'
      };
    }
  }

  /**
   * 查询转账状态
   * 使用2025年新版API: /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}
   */
  async queryTransfer(outBatchNo: string): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('微信转账服务配置不完整');
    }

    // 新版API查询接口（商户单号查询）
    const url = `https://api.mch.weixin.qq.com/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${outBatchNo}`;
    console.log('[微信转账-查询] URL:', url);
    const response = await this.sendRequest('GET', url);
    console.log('[微信转账-查询] 返回结果:', JSON.stringify(response, null, 2));
    return response;
  }

  /**
   * 撤销转账
   * POST /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}/cancel
   *
   * 在用户确认收款之前可以通过该接口撤销付款
   * 返回成功仅表示撤销请求已受理，系统会异步处理
   */
  async cancelTransfer(outBillNo: string): Promise<{ success: boolean; state?: string; message?: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: '微信转账服务配置不完整' };
    }

    try {
      const url = `https://api.mch.weixin.qq.com/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${outBillNo}/cancel`;
      console.log('[微信转账-撤销] URL:', url);

      // 撤销接口不需要请求体，但需要发送 POST 请求
      const response = await this.sendRequest('POST', url);
      console.log('[微信转账-撤销] 返回结果:', JSON.stringify(response, null, 2));

      // 成功返回：out_bill_no, transfer_bill_no, state, update_time
      if (response.state === 'CANCELING' || response.state === 'CANCELLED') {
        console.log(`微信转账撤销成功: 单号 ${outBillNo}, 状态 ${response.state}`);
        return { success: true, state: response.state, message: `撤销成功，状态: ${response.state}` };
      } else if (response.code) {
        // 错误响应
        console.error(`微信转账撤销失败: ${response.code} - ${response.message}`);
        return { success: false, message: response.message || response.code };
      } else if (response.out_bill_no) {
        // 有返回单号，认为成功
        return { success: true, state: response.state, message: '撤销请求已受理' };
      } else {
        return { success: false, message: '撤销请求返回异常' };
      }
    } catch (error: any) {
      console.error('微信转账撤销异常:', error);
      return { success: false, message: error.message || '撤销异常' };
    }
  }

  /**
   * 查询商户账户余额
   * GET /v3/merchant/fund/balance/{account_type}
   * account_type: BASIC-基本账户, OPERATION-运营账户, FEES-手续费账户
   */
  async queryBalance(accountType: 'BASIC' | 'OPERATION' | 'FEES' = 'OPERATION'): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('微信转账服务配置不完整');
    }

    const url = `https://api.mch.weixin.qq.com/v3/merchant/fund/balance/${accountType}`;
    console.log('[微信账户余额查询] URL:', url);
    const response = await this.sendRequest('GET', url);
    console.log('[微信账户余额查询] 返回结果:', JSON.stringify(response, null, 2));
    return response;
  }

  /**
   * 发送请求
   */
  private async sendRequest(method: string, url: string, body?: any): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(16).toString('hex');

    // 构建签名串
    const urlObj = new URL(url);
    const pathname = urlObj.pathname + urlObj.search;
    const bodyStr = body ? JSON.stringify(body) : '';

    const signStr = [
      method,
      pathname,
      timestamp,
      nonceStr,
      bodyStr
    ].join('\n') + '\n';

    // 使用私钥签名
    const privateKey = fs.readFileSync(this.keyPath, 'utf-8');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    const signature = sign.sign(privateKey, 'base64');

    // 构建Authorization头
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;

    // 发送请求
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'identity',  // 禁用压缩，避免解压错误
      'Authorization': authorization,
      'User-Agent': 'SmartAPI/1.0'
    };

    // 设置30秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      const responseText = await response.text();

      try {
        return JSON.parse(responseText);
      } catch {
        return { code: 'PARSE_ERROR', message: responseText };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { code: 'TIMEOUT', message: '微信API请求超时' };
      }
      throw error;
    }
  }

  /**
   * 加密用户姓名（敏感信息加密）
   */
  private encryptUserName(userName: string): string {
    // 使用微信平台证书公钥加密
    // 这里简化处理，实际需要获取并使用微信平台证书
    if (!this.certPath || !fs.existsSync(this.certPath)) {
      return userName;
    }

    try {
      const publicKey = fs.readFileSync(this.certPath, 'utf-8');
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha1'
        },
        Buffer.from(userName, 'utf-8')
      );
      return encrypted.toString('base64');
    } catch (error) {
      console.error('加密用户姓名失败:', error);
      return userName;
    }
  }
}

export default new WechatTransferService();
