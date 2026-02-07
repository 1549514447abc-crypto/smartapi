/**
 * 微信公众号路由
 */

import { Router, Request, Response, NextFunction } from 'express';
import { wechatCallback } from '../controllers/wechatController';
import xml2js from 'xml2js';

const router = Router();

/**
 * XML 解析中间件
 * 微信推送的消息是 XML 格式，需要解析
 */
const xmlParser = (req: Request, res: Response, next: NextFunction) => {
  // 只处理 text/xml 类型
  if (req.headers['content-type']?.includes('text/xml')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      xml2js.parseString(data, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error('XML 解析错误:', err);
          req.body = {};
        } else {
          req.body = result.xml || result;
        }
        next();
      });
    });
  } else {
    next();
  }
};

// 微信服务器配置验证和事件推送
// GET: 服务器验证
// POST: 事件推送
router.get('/callback', wechatCallback);
router.post('/callback', xmlParser, wechatCallback);

export default router;
