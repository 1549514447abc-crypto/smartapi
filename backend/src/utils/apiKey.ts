/**
 * API Key 生成工具
 */

import crypto from 'crypto';

/**
 * 生成随机 API Key
 * 格式：sk_ + 30位随机字符
 * 总长度：33
 *
 * @returns API Key 字符串
 */
export function generateApiKey(): string {
  // 生成15字节的随机数据（转换为hex后是30个字符）
  const randomBytes = crypto.randomBytes(15);
  const randomString = randomBytes.toString('hex'); // 30个字符

  // sk_ + 30位随机字符 = 总长度33
  return `sk_${randomString}`;
}

/**
 * 验证 API Key 格式
 * @param apiKey API Key 字符串
 * @returns 是否有效
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // 必须以 sk_ 开头，总长度为 33
  if (!apiKey.startsWith('sk_')) return false;
  if (apiKey.length !== 33) return false;

  // 验证后30位是否为合法的hex字符
  const hexPart = apiKey.substring(3);
  return /^[0-9a-f]{30}$/.test(hexPart);
}
