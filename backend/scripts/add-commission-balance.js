/**
 * 添加 commission_balance 字段到 users 表
 * 用于存储可提现的推广返现余额
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCommissionBalanceColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi'
  });

  try {
    console.log('检查 commission_balance 字段是否存在...');

    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'commission_balance'
    `, [process.env.DB_NAME || 'smartapi']);

    if (columns.length > 0) {
      console.log('✅ commission_balance 字段已存在，无需添加');
      return;
    }

    // 添加字段
    console.log('添加 commission_balance 字段...');
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN commission_balance DECIMAL(10,4) NOT NULL DEFAULT 0
      COMMENT '推广返现余额（可提现）'
      AFTER balance
    `);

    console.log('✅ commission_balance 字段添加成功！');

    // 显示当前用户余额情况
    const [users] = await connection.query(`
      SELECT id, username, balance, commission_balance
      FROM users
      ORDER BY id
      LIMIT 10
    `);

    console.log('\n当前用户余额情况（前10名）：');
    console.table(users);

  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addCommissionBalanceColumn()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
