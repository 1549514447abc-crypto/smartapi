/**
 * 添加微信登录相关字段到 users 表
 * 运行方式: node scripts/add-wechat-fields.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function addWechatFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'smartapi_dev'
  });

  try {
    console.log('检查并添加微信相关字段...');

    // 检查 wechat_openid 字段是否存在
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'wechat_openid'`,
      [process.env.DB_NAME || 'smartapi_dev']
    );

    if (columns.length === 0) {
      // 添加 wechat_openid 字段
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN wechat_openid VARCHAR(64) NULL UNIQUE COMMENT '微信OpenID' AFTER password_hash
      `);
      console.log('✅ 添加 wechat_openid 字段成功');

      // 添加 wechat_unionid 字段
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN wechat_unionid VARCHAR(64) NULL COMMENT '微信UnionID' AFTER wechat_openid
      `);
      console.log('✅ 添加 wechat_unionid 字段成功');

      // 添加索引
      await connection.query(`
        CREATE INDEX idx_wechat_openid ON users(wechat_openid)
      `);
      console.log('✅ 添加 wechat_openid 索引成功');
    } else {
      console.log('⏭️  wechat_openid 字段已存在，跳过');
    }

    console.log('\n🎉 微信字段添加完成！');

  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addWechatFields();
