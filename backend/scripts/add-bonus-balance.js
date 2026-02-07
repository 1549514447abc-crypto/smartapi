/**
 * 添加 bonus_balance 字段到 users 表
 *
 * 运行方式:
 *   node scripts/add-bonus-balance.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addBonusBalance() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'smartapi'
  });

  console.log('Connected to database');

  try {
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bonus_balance'
    `, [process.env.DB_NAME || 'smartapi']);

    if (columns.length > 0) {
      console.log('✅ bonus_balance 字段已存在，无需添加');
    } else {
      console.log('Adding bonus_balance column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN bonus_balance DECIMAL(10, 4) NOT NULL DEFAULT 0
        COMMENT '赠金余额'
        AFTER balance
      `);
      console.log('✅ bonus_balance 字段添加成功');
    }

    // 显示当前表结构
    const [fields] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('balance', 'bonus_balance')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'smartapi']);

    console.log('\n当前余额相关字段:');
    fields.forEach(f => {
      console.log(`  ${f.COLUMN_NAME}: ${f.COLUMN_TYPE} - ${f.COLUMN_COMMENT}`);
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed');
  }
}

addBonusBalance().catch(console.error);
