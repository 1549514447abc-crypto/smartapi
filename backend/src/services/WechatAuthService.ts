/**
 * 微信公众号扫码登录服务
 * 使用带参数二维码 + 事件推送方式实现
 */

import axios from 'axios';
import crypto from 'crypto';

interface WechatConfig {
  appId: string;
  appSecret: string;
  token: string;
}

interface AccessTokenCache {
  accessToken: string;
  expiresAt: number;
}

interface LoginSession {
  sceneStr: string;
  createdAt: number;
  status: 'pending' | 'scanned' | 'confirmed';
  openid?: string;
  userInfo?: WechatUserInfo;
}

interface BindSession {
  sceneStr: string;
  userId: number;
  createdAt: number;
  status: 'pending' | 'scanned' | 'bindConfirmed';
  openid?: string;
  userInfo?: WechatUserInfo;
}

interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  subscribe: number;
  unionid?: string;
}

class WechatAuthService {
  private config: WechatConfig | null = null;
  private accessTokenCache: AccessTokenCache | null = null;

  // 登录会话存储: sceneStr -> LoginSession
  private loginSessions: Map<string, LoginSession> = new Map();
  // 绑定会话存储: sceneStr -> BindSession
  private bindSessions: Map<string, BindSession> = new Map();
  private readonly SESSION_EXPIRE_MS = 5 * 60 * 1000; // 5分钟过期

  /**
   * 从环境变量获取配置
   */
  private getConfigFromEnv(): WechatConfig | null {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    const token = process.env.WECHAT_MP_TOKEN;

    if (!appId || !appSecret || !token) {
      console.error('微信公众号配置不完整，需要: WECHAT_APP_ID, WECHAT_APP_SECRET, WECHAT_MP_TOKEN');
      return null;
    }

    return { appId, appSecret, token };
  }

  /**
   * 初始化服务
   */
  init(): boolean {
    this.config = this.getConfigFromEnv();
    if (!this.config) {
      console.warn('微信登录服务初始化失败：配置不完整');
      return false;
    }

    // 清理过期会话的定时任务
    setInterval(() => this.cleanExpiredSessions(), 60 * 1000);

    console.log('✅ 微信公众号登录服务初始化成功');
    return true;
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.config !== null;
  }

  /**
   * 获取 access_token（带缓存）
   */
  async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('微信服务未配置');
    }

    // 检查缓存是否有效（提前5分钟刷新）
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
      return this.accessTokenCache.accessToken;
    }

    // 请求新的 access_token
    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = {
      grant_type: 'client_credential',
      appid: this.config.appId,
      secret: this.config.appSecret,
    };

    try {
      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        throw new Error(`获取access_token失败: ${data.errmsg} (${data.errcode})`);
      }

      // 缓存 access_token
      this.accessTokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      console.log('✅ 微信 access_token 刷新成功');
      return data.access_token;
    } catch (error: any) {
      console.error('获取微信access_token失败:', error);
      throw new Error(error.message || '获取微信access_token失败');
    }
  }

  /**
   * 生成登录场景值
   */
  generateSceneStr(): string {
    return `login_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * 创建带参数的临时二维码
   */
  async createQRCode(): Promise<{ ticket: string; url: string; sceneStr: string; expireSeconds: number }> {
    const accessToken = await this.getAccessToken();
    const sceneStr = this.generateSceneStr();
    const expireSeconds = 300; // 5分钟有效

    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
    const data = {
      expire_seconds: expireSeconds,
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    };

    try {
      const response = await axios.post(url, data);
      const result = response.data;

      if (result.errcode) {
        throw new Error(`创建二维码失败: ${result.errmsg} (${result.errcode})`);
      }

      // 创建登录会话
      this.loginSessions.set(sceneStr, {
        sceneStr,
        createdAt: Date.now(),
        status: 'pending',
      });
      console.log(`[createQRCode] 创建登录会话: sceneStr=${sceneStr}, 当前会话数: ${this.loginSessions.size}`);

      return {
        ticket: result.ticket,
        url: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(result.ticket)}`,
        sceneStr,
        expireSeconds,
      };
    } catch (error: any) {
      console.error('创建微信二维码失败:', error);
      throw new Error(error.message || '创建微信二维码失败');
    }
  }

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    if (!this.config) {
      console.log('签名验证失败：config为空');
      return false;
    }

    const arr = [this.config.token, timestamp, nonce].sort();
    const str = arr.join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');
    const isValid = hash === signature;
    console.log('签名验证:', { signature, hash, isValid, token: this.config.token?.substring(0, 5) + '...' });
    return isValid;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openid: string): Promise<WechatUserInfo> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.errcode) {
        throw new Error(`获取用户信息失败: ${data.errmsg} (${data.errcode})`);
      }

      return data as WechatUserInfo;
    } catch (error: any) {
      console.error('获取微信用户信息失败:', error);
      throw new Error(error.message || '获取微信用户信息失败');
    }
  }

  /**
   * 检查用户是否关注公众号
   * @param openid 用户的openid
   * @returns { subscribed: boolean, userInfo?: WechatUserInfo }
   */
  async checkSubscription(openid: string): Promise<{ subscribed: boolean; userInfo?: WechatUserInfo }> {
    try {
      const userInfo = await this.getUserInfo(openid);
      // subscribe 字段：0=未关注，1=已关注
      const subscribed = userInfo.subscribe === 1;
      console.log(`[checkSubscription] openid=${openid}, subscribed=${subscribed}`);
      return { subscribed, userInfo };
    } catch (error: any) {
      console.error('检查关注状态失败:', error);
      // 如果获取用户信息失败，可能是用户未关注（未关注用户无法通过公众号API获取详细信息）
      return { subscribed: false };
    }
  }

  /**
   * 获取公众号关注二维码（永久二维码）
   * 扫描此二维码会引导用户关注公众号
   */
  async getFollowQRCode(): Promise<{ url: string; ticket: string }> {
    const accessToken = await this.getAccessToken();

    // 创建永久二维码（用于关注）
    // scene_str 使用固定值，这样所有用户扫同一个二维码
    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
    const data = {
      action_name: 'QR_LIMIT_STR_SCENE',
      action_info: {
        scene: {
          scene_str: 'follow_official_account'
        }
      }
    };

    try {
      const response = await axios.post(url, data);
      const result = response.data;

      if (result.errcode) {
        throw new Error(`创建关注二维码失败: ${result.errmsg} (${result.errcode})`);
      }

      return {
        ticket: result.ticket,
        url: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(result.ticket)}`
      };
    } catch (error: any) {
      console.error('创建关注二维码失败:', error);
      throw new Error(error.message || '创建关注二维码失败');
    }
  }

  /**
   * 处理扫码事件（用户扫码后触发）
   * 根据 sceneStr 前缀区分登录和绑定场景
   */
  async handleScanEvent(openid: string, sceneStr: string): Promise<void> {
    console.log(`[handleScanEvent] 处理扫码事件: sceneStr=${sceneStr}, openid=${openid}`);

    // 判断是登录还是绑定场景
    if (sceneStr.startsWith('bind_')) {
      // 绑定场景
      await this.handleBindScanEvent(openid, sceneStr);
    } else {
      // 登录场景
      await this.handleLoginScanEvent(openid, sceneStr);
    }
  }

  /**
   * 处理登录扫码事件
   */
  private async handleLoginScanEvent(openid: string, sceneStr: string): Promise<void> {
    console.log(`[handleLoginScanEvent] 查找登录会话: sceneStr=${sceneStr}`);

    const session = this.loginSessions.get(sceneStr);
    if (!session) {
      console.log(`未找到登录会话: ${sceneStr}`);
      return;
    }

    try {
      // 获取用户信息
      const userInfo = await this.getUserInfo(openid);

      // 更新会话状态
      session.status = 'confirmed';
      session.openid = openid;
      session.userInfo = userInfo;

      console.log(`✅ 用户扫码登录: ${userInfo.nickname || openid}, sceneStr: ${sceneStr}`);
    } catch (error) {
      console.error('处理登录扫码事件失败:', error);
    }
  }

  /**
   * 处理绑定扫码事件
   */
  private async handleBindScanEvent(openid: string, sceneStr: string): Promise<void> {
    console.log(`[handleBindScanEvent] 查找绑定会话: sceneStr=${sceneStr}`);

    const session = this.bindSessions.get(sceneStr);
    if (!session) {
      console.log(`未找到绑定会话: ${sceneStr}`);
      return;
    }

    try {
      // 获取用户信息
      const userInfo = await this.getUserInfo(openid);

      // 更新会话状态
      session.status = 'bindConfirmed';
      session.openid = openid;
      session.userInfo = userInfo;

      console.log(`✅ 用户扫码绑定: userId=${session.userId}, openid=${openid}`);
    } catch (error) {
      console.error('处理绑定扫码事件失败:', error);
    }
  }

  /**
   * 创建绑定用的临时二维码
   */
  async createBindQRCode(userId: number): Promise<{ ticket: string; url: string; sceneStr: string; expireSeconds: number }> {
    const accessToken = await this.getAccessToken();
    const sceneStr = `bind_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expireSeconds = 300; // 5分钟有效

    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
    const data = {
      expire_seconds: expireSeconds,
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    };

    try {
      const response = await axios.post(url, data);
      const result = response.data;

      if (result.errcode) {
        throw new Error(`创建绑定二维码失败: ${result.errmsg} (${result.errcode})`);
      }

      // 创建绑定会话
      this.bindSessions.set(sceneStr, {
        sceneStr,
        userId,
        createdAt: Date.now(),
        status: 'pending',
      });
      console.log(`[createBindQRCode] 创建绑定会话: sceneStr=${sceneStr}, userId=${userId}`);

      return {
        ticket: result.ticket,
        url: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(result.ticket)}`,
        sceneStr,
        expireSeconds,
      };
    } catch (error: any) {
      console.error('创建绑定二维码失败:', error);
      throw new Error(error.message || '创建绑定二维码失败');
    }
  }

  /**
   * 获取绑定状态
   */
  getBindStatus(sceneStr: string): BindSession | null {
    const session = this.bindSessions.get(sceneStr);
    if (!session) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - session.createdAt > this.SESSION_EXPIRE_MS) {
      this.bindSessions.delete(sceneStr);
      return null;
    }

    return session;
  }

  /**
   * 消费绑定会话（绑定成功后删除）
   */
  consumeBindSession(sceneStr: string): BindSession | null {
    const session = this.bindSessions.get(sceneStr);
    if (session) {
      this.bindSessions.delete(sceneStr);
    }
    return session || null;
  }

  /**
   * 检查登录状态
   */
  getLoginStatus(sceneStr: string): LoginSession | null {
    const session = this.loginSessions.get(sceneStr);
    if (!session) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - session.createdAt > this.SESSION_EXPIRE_MS) {
      this.loginSessions.delete(sceneStr);
      return null;
    }

    return session;
  }

  /**
   * 消费登录会话（登录成功后删除）
   */
  consumeLoginSession(sceneStr: string): LoginSession | null {
    const session = this.loginSessions.get(sceneStr);
    if (session) {
      this.loginSessions.delete(sceneStr);
    }
    return session || null;
  }

  /**
   * 清理过期会话（登录会话和绑定会话）
   */
  private cleanExpiredSessions(): void {
    const now = Date.now();
    // 清理登录会话
    for (const [sceneStr, session] of this.loginSessions.entries()) {
      if (now - session.createdAt > this.SESSION_EXPIRE_MS) {
        this.loginSessions.delete(sceneStr);
      }
    }
    // 清理绑定会话
    for (const [sceneStr, session] of this.bindSessions.entries()) {
      if (now - session.createdAt > this.SESSION_EXPIRE_MS) {
        this.bindSessions.delete(sceneStr);
      }
    }
  }
}

// 导出单例
const wechatAuthService = new WechatAuthService();
export default wechatAuthService;
