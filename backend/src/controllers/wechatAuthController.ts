/**
 * 微信公众号扫码登录控制器
 */
import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { generateApiKey } from '../utils/apiKey';
import supabaseService from '../services/SupabaseService';
import sequelize from '../config/database';
import wechatAuthService from '../services/WechatAuthService';
import crypto from 'crypto';
import SystemConfig, { ConfigKey } from '../models/SystemConfig';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

// 初始化微信登录服务
wechatAuthService.init();

/**
 * 微信服务器验证 & 消息接收
 * GET /api/wechat/callback - 服务器验证（返回 echostr）
 * POST /api/wechat/callback - 接收消息推送
 */
export const wechatCallback = async (req: Request, res: Response): Promise<void> => {
  const { signature, timestamp, nonce, echostr } = req.query;

  // 验证签名
  if (!signature || !timestamp || !nonce) {
    res.status(400).send('Missing parameters');
    return;
  }

  const isValid = wechatAuthService.verifySignature(
    signature as string,
    timestamp as string,
    nonce as string
  );

  if (!isValid) {
    console.error('微信签名验证失败');
    res.status(403).send('Invalid signature');
    return;
  }

  // GET 请求：服务器验证，返回 echostr
  if (req.method === 'GET' && echostr) {
    console.log('✅ 微信服务器验证成功');
    res.send(echostr);
    return;
  }

  // POST 请求：接收消息推送
  if (req.method === 'POST') {
    try {
      const xmlData = req.body;
      console.log('收到微信消息推送:', JSON.stringify(xmlData));

      // 解析 XML（需要 body-parser 中间件支持 XML）
      const msgType = xmlData.MsgType?.[0] || xmlData.MsgType;
      const event = xmlData.Event?.[0] || xmlData.Event;
      const openid = xmlData.FromUserName?.[0] || xmlData.FromUserName;
      const eventKey = xmlData.EventKey?.[0] || xmlData.EventKey;
      const ticket = xmlData.Ticket?.[0] || xmlData.Ticket;

      // 处理扫码事件
      if (msgType === 'event' && (event === 'subscribe' || event === 'SCAN')) {
        // subscribe: 用户关注（扫带参数二维码关注）
        // SCAN: 已关注用户扫码
        let sceneStr = eventKey || '';

        // subscribe 事件的 EventKey 格式是 qrscene_xxx
        if (event === 'subscribe' && sceneStr.startsWith('qrscene_')) {
          sceneStr = sceneStr.replace('qrscene_', '');
        }

        if (sceneStr && openid) {
          console.log(`用户扫码: openid=${openid}, sceneStr=${sceneStr}, event=${event}`);
          await wechatAuthService.handleScanEvent(openid, sceneStr);
        }
      }

      // 返回 success 给微信服务器
      res.send('success');
    } catch (error) {
      console.error('处理微信消息失败:', error);
      res.send('success'); // 即使出错也返回 success，避免微信重试
    }
    return;
  }

  res.send('success');
};

/**
 * 获取微信登录二维码
 * GET /api/auth/wechat/qrcode
 */
export const getWechatQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!wechatAuthService.isAvailable()) {
      errorResponse(res, '微信登录服务未配置', 503);
      return;
    }

    const qrData = await wechatAuthService.createQRCode();

    successResponse(res, {
      qrCodeUrl: qrData.url,
      sceneStr: qrData.sceneStr,
      expireSeconds: qrData.expireSeconds,
    }, '获取二维码成功');
  } catch (error: any) {
    console.error('获取微信二维码失败:', error);
    errorResponse(res, error.message || '获取微信二维码失败', 500);
  }
};

/**
 * 检查微信登录状态（前端轮询）
 * GET /api/auth/wechat/status?sceneStr=xxx
 */
export const checkWechatLoginStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sceneStr } = req.query;

    if (!sceneStr || typeof sceneStr !== 'string') {
      errorResponse(res, '缺少 sceneStr 参数', 400);
      return;
    }

    const session = wechatAuthService.getLoginStatus(sceneStr);

    if (!session) {
      successResponse(res, { status: 'expired' }, '二维码已过期');
      return;
    }

    if (session.status === 'confirmed' && session.openid) {
      // 用户已扫码确认，执行登录/注册逻辑
      const loginResult = await handleWechatLogin(session.openid, session.userInfo || {}, req);

      // 消费会话
      wechatAuthService.consumeLoginSession(sceneStr);

      successResponse(res, {
        status: 'confirmed',
        ...loginResult,
      }, loginResult.isNewUser ? '微信注册成功' : '微信登录成功');
      return;
    }

    successResponse(res, { status: session.status }, '等待扫码');
  } catch (error: any) {
    console.error('检查登录状态失败:', error);
    errorResponse(res, error.message || '检查登录状态失败', 500);
  }
};

/**
 * 检查微信登录服务是否可用
 * GET /api/auth/wechat/available
 */
export const getWechatAvailable = async (req: Request, res: Response): Promise<void> => {
  try {
    const available = wechatAuthService.isAvailable();
    successResponse(res, { available }, available ? '微信登录服务已启用' : '微信登录服务未配置');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

/**
 * 微信网页授权 - 跳转到微信授权页面
 * GET /api/auth/wechat/oauth
 *
 * 在微信内置浏览器中使用，用户点击后跳转到微信授权页面
 */
export const wechatOAuthRedirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = process.env.WECHAT_APP_ID;

    if (!appId) {
      res.status(503).send('微信登录服务未配置');
      return;
    }

    // 获取回调地址 - 必须与微信公众平台配置的网页授权域名一致
    // 回调地址是后端API地址，域名必须是 contentcube.cn
    const callbackUrl = process.env.WECHAT_OAUTH_CALLBACK_URL || 'https://contentcube.cn/api/auth/wechat/oauth/callback';
    const redirectUri = encodeURIComponent(callbackUrl);

    console.log('[微信OAuth] 回调地址:', callbackUrl);

    // state 参数：可以传递一些状态信息，比如原始访问页面
    const state = req.query.redirect || '/commission';

    // 使用 snsapi_userinfo 获取用户信息（需要用户同意）
    // 如果只需要 openid，可以使用 snsapi_base（静默授权）
    const scope = 'snsapi_userinfo';

    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${encodeURIComponent(state as string)}#wechat_redirect`;

    console.log('[微信OAuth] 重定向到授权页面:', authUrl);
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[微信OAuth] 跳转失败:', error);
    res.status(500).send('微信授权跳转失败');
  }
};

/**
 * 微信网页授权 - 回调处理
 * GET /api/auth/wechat/oauth/callback
 *
 * 微信授权后回调到这个地址，携带 code 参数
 */
export const wechatOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query;

    if (!code) {
      console.error('[微信OAuth回调] 缺少 code 参数');
      res.redirect(`/login?error=missing_code`);
      return;
    }

    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      res.redirect(`/login?error=config_error`);
      return;
    }

    // 1. 用 code 换取 access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      openid?: string;
      errcode?: number;
      errmsg?: string;
    };

    console.log('[微信OAuth回调] 获取access_token响应:', JSON.stringify(tokenData));

    if (tokenData.errcode) {
      console.error('[微信OAuth回调] 获取access_token失败:', tokenData);
      res.redirect(`/login?error=token_error&msg=${encodeURIComponent(tokenData.errmsg || '')}`);
      return;
    }

    const { access_token, openid } = tokenData;

    if (!access_token || !openid) {
      res.redirect(`/login?error=token_error&msg=missing_token_or_openid`);
      return;
    }

    // 2. 获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;

    const userInfoResponse = await fetch(userInfoUrl);
    const userInfo = await userInfoResponse.json() as {
      openid?: string;
      nickname?: string;
      headimgurl?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };

    console.log('[微信OAuth回调] 获取用户信息响应:', JSON.stringify(userInfo));

    if (userInfo.errcode) {
      console.error('[微信OAuth回调] 获取用户信息失败:', userInfo);
      // 即使获取用户信息失败，也可以用 openid 登录
    }

    // 3. 检查用户是否关注公众号
    const { subscribed } = await wechatAuthService.checkSubscription(openid);
    console.log('[微信OAuth回调] 用户关注状态:', subscribed ? '已关注' : '未关注');

    // 4. 执行登录/注册逻辑
    const loginResult = await handleWechatLogin(openid, userInfo, req);

    // 5. 重定向到前端
    const redirectPath = (state as string) || '/commission';
    const frontendUrl = process.env.FRONTEND_URL || 'https://contentcube.cn/smartapi';

    // 如果未关注，跳转到引导关注页面
    if (!subscribed) {
      const followGuideUrl = `${frontendUrl}/follow-guide?token=${loginResult.token}&redirect=${encodeURIComponent(redirectPath)}`;
      console.log('[微信OAuth回调] 用户未关注，重定向到引导页:', followGuideUrl);
      res.redirect(followGuideUrl);
      return;
    }

    // 已关注，正常跳转
    const redirectUrl = `${frontendUrl}/oauth-callback?token=${loginResult.token}&redirect=${encodeURIComponent(redirectPath)}`;
    console.log('[微信OAuth回调] 登录成功，重定向到:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('[微信OAuth回调] 处理失败:', error);
    res.redirect(`/login?error=oauth_error&msg=${encodeURIComponent(error.message || '登录失败')}`);
  }
};

/**
 * 获取公众号关注二维码
 * GET /api/auth/wechat/follow-qrcode
 * 公开接口
 */
export const getFollowQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!wechatAuthService.isAvailable()) {
      errorResponse(res, '微信服务未配置', 503);
      return;
    }

    const qrData = await wechatAuthService.getFollowQRCode();

    successResponse(res, {
      qrCodeUrl: qrData.url
    }, '获取成功');
  } catch (error: any) {
    console.error('获取关注二维码失败:', error);
    errorResponse(res, error.message || '获取关注二维码失败', 500);
  }
};

/**
 * 检查当前用户是否关注公众号
 * GET /api/auth/wechat/subscription
 * 需要登录（携带token）
 */
export const checkSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // 从认证中间件获取用户信息
    const user = (req as any).user;
    if (!user || !user.userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    // 查询用户的微信openid
    const [users] = await sequelize.query(
      'SELECT wechat_openid FROM users WHERE id = ?',
      { replacements: [user.userId] }
    ) as [any[], any];

    if (!users.length || !users[0].wechat_openid) {
      errorResponse(res, '未绑定微信账号', 400);
      return;
    }

    const openid = users[0].wechat_openid;

    // 检查关注状态
    const { subscribed } = await wechatAuthService.checkSubscription(openid);

    successResponse(res, { subscribed }, subscribed ? '已关注公众号' : '未关注公众号');
  } catch (error: any) {
    console.error('检查关注状态失败:', error);
    errorResponse(res, error.message || '检查关注状态失败', 500);
  }
};

/**
 * 获取绑定微信用的二维码
 * GET /api/user/bindWechat/qrcode
 * 需要登录
 */
export const getBindWechatQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    // 检查用户是否已绑定微信
    const [users] = await sequelize.query(
      'SELECT wechat_openid FROM users WHERE id = ?',
      { replacements: [userId] }
    ) as [any[], any];

    if (users.length > 0 && users[0].wechat_openid) {
      errorResponse(res, '您已绑定微信，如需更换请先解绑', 400);
      return;
    }

    if (!wechatAuthService.isAvailable()) {
      errorResponse(res, '微信服务未配置', 503);
      return;
    }

    // 创建绑定用的二维码（场景值以 bind_ 开头）
    const qrData = await wechatAuthService.createBindQRCode(userId);

    successResponse(res, {
      qrCodeUrl: qrData.url,
      sceneStr: qrData.sceneStr,
      expireSeconds: qrData.expireSeconds,
    }, '获取绑定二维码成功');
  } catch (error: any) {
    console.error('获取绑定微信二维码失败:', error);
    errorResponse(res, error.message || '获取绑定微信二维码失败', 500);
  }
};

/**
 * 检查绑定微信状态（前端轮询）
 * GET /api/user/bindWechat/status?sceneStr=xxx
 * 需要登录
 */
export const checkBindWechatStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    const { sceneStr } = req.query;
    if (!sceneStr || typeof sceneStr !== 'string') {
      errorResponse(res, '缺少 sceneStr 参数', 400);
      return;
    }

    const session = wechatAuthService.getBindStatus(sceneStr);

    if (!session) {
      successResponse(res, { status: 'expired' }, '二维码已过期');
      return;
    }

    if (session.status === 'bindConfirmed' && session.openid) {
      // 用户已扫码，执行绑定
      const bindResult = await handleBindWechat(userId, session.openid, session.userInfo);

      // 无论成功失败都消费会话，避免重复尝试
      wechatAuthService.consumeBindSession(sceneStr);

      if (bindResult.success) {
        successResponse(res, {
          status: 'success',
          message: bindResult.message
        }, '绑定成功');
      } else {
        // 绑定失败，返回具体错误，前端会显示错误提示
        successResponse(res, {
          status: 'bindFailed',
          message: bindResult.message
        }, bindResult.message);
      }
      return;
    }

    successResponse(res, { status: session.status }, '等待扫码');
  } catch (error: any) {
    console.error('检查绑定状态失败:', error);
    errorResponse(res, error.message || '检查绑定状态失败', 500);
  }
};

/**
 * 解绑微信
 * POST /api/user/unbindWechat
 * 需要登录
 */
export const unbindWechat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      errorResponse(res, '请先登录', 401);
      return;
    }

    // 检查用户是否有其他登录方式（手机号或密码）
    const [users] = await sequelize.query(
      'SELECT phone, password_hash, wechat_openid FROM users WHERE id = ?',
      { replacements: [userId] }
    ) as [any[], any];

    if (!users.length) {
      errorResponse(res, '用户不存在', 404);
      return;
    }

    const user = users[0];

    if (!user.wechat_openid) {
      errorResponse(res, '您尚未绑定微信', 400);
      return;
    }

    // 检查是否有其他登录方式
    if (!user.phone && !user.password_hash) {
      errorResponse(res, '解绑微信后将无法登录，请先绑定手机号或设置密码', 400);
      return;
    }

    // 解绑微信
    await sequelize.query(
      'UPDATE users SET wechat_openid = NULL, wechat_unionid = NULL WHERE id = ?',
      { replacements: [userId] }
    );

    successResponse(res, null, '解绑微信成功');
  } catch (error: any) {
    console.error('解绑微信失败:', error);
    errorResponse(res, error.message || '解绑微信失败', 500);
  }
};

/**
 * 处理绑定微信逻辑
 */
async function handleBindWechat(
  userId: number,
  openid: string,
  userInfo?: any
): Promise<{ success: boolean; message: string }> {
  // 检查该 openid 是否已被其他用户绑定
  const [existingUsers] = await sequelize.query(
    'SELECT id, username FROM users WHERE wechat_openid = ? LIMIT 1',
    { replacements: [openid] }
  ) as [any[], any];

  if (existingUsers.length > 0) {
    return {
      success: false,
      message: '该微信已绑定其他账号，无法重复绑定'
    };
  }

  // 检查当前用户是否已绑定微信
  const [currentUser] = await sequelize.query(
    'SELECT wechat_openid FROM users WHERE id = ?',
    { replacements: [userId] }
  ) as [any[], any];

  if (currentUser.length > 0 && currentUser[0].wechat_openid) {
    return {
      success: false,
      message: '您已绑定微信，如需更换请先解绑'
    };
  }

  // 执行绑定
  await sequelize.query(
    `UPDATE users SET
     wechat_openid = ?,
     wechat_unionid = ?
     WHERE id = ?`,
    { replacements: [openid, userInfo?.unionid || null, userId] }
  );

  console.log(`✅ 用户 ${userId} 绑定微信成功: openid=${openid}`);

  return {
    success: true,
    message: '绑定微信成功'
  };
}

/**
 * 处理微信登录/注册逻辑
 */
async function handleWechatLogin(
  openid: string,
  userInfo: any,
  req: Request
): Promise<{ token: string; user: any; isNewUser: boolean }> {
  // 查找是否已有绑定此 openid 的用户
  const [existingUsers] = await sequelize.query(
    'SELECT * FROM users WHERE wechat_openid = ? LIMIT 1',
    { replacements: [openid] }
  ) as [any[], any];

  let user: any;
  let isNewUser = false;

  if (existingUsers.length > 0) {
    // 已有用户，直接登录
    user = existingUsers[0];

    // 检查账号状态
    if (user.status === 'suspended') {
      throw new Error('账号已被停用');
    }

    // 更新最后登录时间和微信信息
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = req.ip ||
                     (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
                     'unknown';
    await sequelize.query(
      `UPDATE users SET
       last_login_at = NOW(),
       last_login_ip = ?,
       avatar_url = COALESCE(avatar_url, ?),
       nickname = COALESCE(nickname, ?)
       WHERE id = ?`,
      { replacements: [clientIp, userInfo.headimgurl || null, userInfo.nickname || null, user.id] }
    );
  } else {
    // 新用户，自动注册
    isNewUser = true;

    // 生成随机用户名（wx_ + 8位随机字符）
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const username = `wx_${randomSuffix}`;

    // 生成随机密码
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const password_hash = await bcrypt.hash(randomPassword, 10);

    // 获取注册赠金配置（默认为0）
    const registerBonus = (await SystemConfig.getNumberConfig(ConfigKey.REGISTER_BONUS)) || 0;

    const transaction = await sequelize.transaction();

    try {
      // 创建用户
      const [result] = await sequelize.query(
        `INSERT INTO users
         (username, password_hash, wechat_openid, wechat_unionid, avatar_url, nickname, status, user_type, balance, total_recharged, total_consumed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 'normal', ?, 0, 0, NOW(), NOW())`,
        {
          replacements: [username, password_hash, openid, userInfo.unionid || null, userInfo.headimgurl || null, userInfo.nickname || null, registerBonus],
          transaction
        }
      ) as [any, any];

      // 获取插入的用户ID（兼容不同数据库驱动）
      // result 可能是数字（insertId）、对象{insertId}、或数组
      let userId: number;
      if (typeof result === 'number') {
        userId = result;
      } else if ((result as any).insertId) {
        userId = (result as any).insertId;
      } else if (Array.isArray(result) && result[0]) {
        userId = typeof result[0] === 'number' ? result[0] : result[0].insertId;
      } else {
        console.error('[handleWechatLogin] 无法解析用户ID, result:', result);
        throw new Error('创建用户失败：无法获取用户ID');
      }
      console.log('[handleWechatLogin] 创建用户成功, userId:', userId);

      // 生成默认 API Key
      const apiKey = generateApiKey();
      await sequelize.query(
        `INSERT INTO api_keys (api_key, user_id, key_name, status)
         VALUES (?, ?, ?, ?)`,
        {
          replacements: [apiKey, userId, '默认密钥', 'active'],
          transaction
        }
      );

      // 记录余额日志（注册赠金）
      if (registerBonus > 0) {
        await sequelize.query(
          `INSERT INTO balance_logs
           (user_id, change_type, change_amount, balance_before, balance_after, source, description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [userId, 'recharge', registerBonus, 0, registerBonus, 'wechat', '微信注册赠金'],
            transaction
          }
        );
      }

      await transaction.commit();

      // 查询完整用户信息
      const [users] = await sequelize.query(
        'SELECT * FROM users WHERE id = ?',
        { replacements: [userId] }
      ) as [any[], any];
      user = users[0];

      // 异步同步到 Supabase
      supabaseService.syncUser(userId, registerBonus)
        .then(() => supabaseService.syncApiKey(apiKey, userId, '默认密钥'))
        .catch(err => console.error('Supabase 同步失败:', err));

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  }

  // 生成 JWT token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    userType: user.user_type
  });

  // 移除敏感信息
  const { password_hash, ...safeUser } = user;

  return { token, user: safeUser, isNewUser };
}
