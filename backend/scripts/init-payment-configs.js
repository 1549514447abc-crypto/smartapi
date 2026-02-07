/**
 * 初始化支付配置表
 * 运行方式: node scripts/init-payment-configs.js
 *
 * 此脚本会:
 * 1. 创建 payment_configs 表 (如果不存在)
 * 2. 插入支付宝和微信支付的初始配置 (默认禁用)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initPaymentConfigs() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi'
  });

  console.log('正在连接数据库...');

  try {
    // 创建 payment_configs 表
    console.log('正在创建 payment_configs 表...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel ENUM('alipay', 'wechat') NOT NULL UNIQUE COMMENT '支付渠道',
        is_enabled TINYINT(1) DEFAULT 0 COMMENT '是否启用',
        is_sandbox TINYINT(1) DEFAULT 0 COMMENT '是否沙箱环境',
        app_id VARCHAR(64) NOT NULL COMMENT '应用ID',
        gateway_url VARCHAR(255) DEFAULT NULL COMMENT '支付网关地址',
        app_private_key TEXT DEFAULT NULL COMMENT '应用私钥',
        app_public_key TEXT DEFAULT NULL COMMENT '应用公钥',
        alipay_public_key TEXT DEFAULT NULL COMMENT '支付宝公钥',
        app_cert_path VARCHAR(500) DEFAULT NULL COMMENT '应用公钥证书路径',
        alipay_cert_path VARCHAR(500) DEFAULT NULL COMMENT '支付宝公钥证书路径',
        root_cert_path VARCHAR(500) DEFAULT NULL COMMENT '支付宝根证书路径',
        sign_type VARCHAR(10) DEFAULT 'RSA2' COMMENT '签名类型',
        mch_id VARCHAR(32) DEFAULT NULL COMMENT '微信商户号',
        api_key VARCHAR(64) DEFAULT NULL COMMENT '微信API密钥V2',
        api_key_v3 VARCHAR(64) DEFAULT NULL COMMENT '微信API密钥V3',
        serial_no VARCHAR(64) DEFAULT NULL COMMENT '微信证书序列号',
        private_key_path VARCHAR(500) DEFAULT NULL COMMENT '微信商户私钥路径',
        notify_url VARCHAR(500) DEFAULT NULL COMMENT '异步通知地址',
        return_url VARCHAR(500) DEFAULT NULL COMMENT '同步跳转地址',
        extra_config TEXT DEFAULT NULL COMMENT '扩展配置(JSON)',
        description VARCHAR(500) DEFAULT NULL COMMENT '说明',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_channel (channel),
        INDEX idx_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';
    `);

    console.log('payment_configs 表创建成功!');

    // 检查是否已有数据
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM payment_configs');

    if (rows[0].count === 0) {
      console.log('正在插入初始配置数据...');

      // 插入支付宝配置 (默认禁用)
      await connection.execute(`
        INSERT INTO payment_configs
        (channel, is_enabled, is_sandbox, app_id, gateway_url, sign_type, description)
        VALUES
        ('alipay', 0, 0, '', 'https://openapi.alipay.com/gateway.do', 'RSA2', '支付宝支付配置')
      `);

      // 插入微信支付配置 (默认禁用)
      await connection.execute(`
        INSERT INTO payment_configs
        (channel, is_enabled, is_sandbox, app_id, description)
        VALUES
        ('wechat', 0, 0, '', '微信支付配置')
      `);

      console.log('初始配置数据插入成功!');
    } else {
      console.log('配置数据已存在，跳过插入');
    }

    // 显示当前配置
    const [configs] = await connection.execute(`
      SELECT channel, is_enabled, is_sandbox, app_id,
             CASE WHEN app_private_key IS NOT NULL AND app_private_key != '' THEN '已配置' ELSE '未配置' END as private_key_status,
             notify_url
      FROM payment_configs
    `);

    console.log('\n当前支付配置:');
    console.table(configs);

    console.log('\n配置说明:');
    console.log('1. 支付宝需要配置: app_id, app_private_key, alipay_public_key, notify_url');
    console.log('2. 微信需要配置: app_id, mch_id, api_key, notify_url');
    console.log('3. 配置完成后将 is_enabled 设为 1 启用');
    console.log('\n建议通过管理后台或直接更新数据库进行配置');

  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

initPaymentConfigs()
  .then(() => {
    console.log('\n初始化完成!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n初始化失败:', error);
    process.exit(1);
  });
