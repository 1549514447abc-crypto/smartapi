/**
 * 插件 API 服务商密钥配置
 *
 * 服务器密钥文件：/www/smartapi/plugin-secret.txt
 *
 * 修改密钥后立即生效，无需重启服务
 */

import * as fs from 'fs';
import * as path from 'path';

// 密钥文件路径
const SECRET_FILE_PATH = process.env.PLUGIN_SECRET_FILE || path.join(process.cwd(), 'plugin-secret.txt');

// 默认密钥（文件不存在时使用）
const DEFAULT_SECRET = 'ps_contentcube_2024_secret';

// 请求头名称
export const PLUGIN_SECRET_HEADER = 'X-Plugin-Secret';

/**
 * 动态获取服务商密钥（每次调用实时读取文件）
 */
export function getPluginSecretKey(): string {
  try {
    if (fs.existsSync(SECRET_FILE_PATH)) {
      const secret = fs.readFileSync(SECRET_FILE_PATH, 'utf-8').trim();
      return secret || DEFAULT_SECRET;
    }
  } catch (error) {
    console.error('[插件密钥] 读取密钥文件失败:', error);
  }
  return DEFAULT_SECRET;
}
