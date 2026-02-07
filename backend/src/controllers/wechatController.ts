/**
 * 微信公众号回调控制器
 * 处理微信服务器配置验证和事件推送
 */

import { Request, Response } from 'express';
import wechatAuthService from '../services/WechatAuthService';

// 初始化服务（确保启动）
wechatAuthService.init();

/**
 * 微信服务器配置验证（GET请求）
 * 微信会发送: signature, timestamp, nonce, echostr
 * 验证通过后返回 echostr
 */
export const verifyServer = (req: Request, res: Response) => {
  const { signature, timestamp, nonce, echostr } = req.query;

  console.log('微信服务器验证请求:', { signature, timestamp, nonce, echostr });

  if (!signature || !timestamp || !nonce || !echostr) {
    return res.status(400).send('Missing parameters');
  }

  if (wechatAuthService.verifySignature(signature as string, timestamp as string, nonce as string)) {
    console.log('✅ 微信服务器验证成功');
    return res.send(echostr);
  } else {
    console.log('❌ 微信服务器验证失败');
    return res.status(403).send('Signature verification failed');
  }
};

/**
 * 处理微信事件推送（POST请求）
 * 包括：关注事件、扫码事件、消息等
 */
export const handleEvent = async (req: Request, res: Response) => {
  const { signature, timestamp, nonce } = req.query;

  // 验证签名
  if (!wechatAuthService.verifySignature(signature as string, timestamp as string, nonce as string)) {
    return res.status(403).send('Signature verification failed');
  }

  try {
    const xmlData = req.body;
    console.log('收到微信事件推送:', JSON.stringify(xmlData));

    // 解析 XML 数据（xml2js 使用 explicitArray: false，值直接是字符串）
    const msgType = xmlData.MsgType;
    const event = xmlData.Event;
    const openid = xmlData.FromUserName;
    const eventKey = xmlData.EventKey;

    console.log('解析后的数据:', { msgType, event, openid, eventKey });

    // 处理扫码事件
    if (msgType === 'event' && (event === 'subscribe' || event === 'SCAN')) {
      console.log('进入扫码事件处理分支');
      let sceneStr = eventKey || '';

      // subscribe 事件的 EventKey 格式是 qrscene_xxx
      if (event === 'subscribe' && typeof sceneStr === 'string' && sceneStr.startsWith('qrscene_')) {
        sceneStr = sceneStr.replace('qrscene_', '');
      }

      console.log('处理后的sceneStr:', sceneStr, 'openid:', openid);

      if (sceneStr && openid) {
        console.log(`用户扫码事件: openid=${openid}, sceneStr=${sceneStr}, event=${event}`);
        await wechatAuthService.handleScanEvent(openid, sceneStr);
      } else {
        console.log('sceneStr或openid为空，跳过处理');
      }
    } else {
      console.log('不是扫码事件，跳过处理. msgType:', msgType, 'event:', event);
    }

    // 返回 success 给微信服务器
    return res.send('success');
  } catch (error) {
    console.error('处理微信事件失败:', error);
    return res.send('success'); // 即使出错也返回 success，避免微信重试
  }
};

/**
 * 统一处理入口（根据请求方法分发）
 */
export const wechatCallback = (req: Request, res: Response) => {
  if (req.method === 'GET') {
    return verifyServer(req, res);
  } else if (req.method === 'POST') {
    return handleEvent(req, res);
  } else {
    return res.status(405).send('Method not allowed');
  }
};
