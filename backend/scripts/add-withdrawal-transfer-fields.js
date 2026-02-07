/**
 * 添加 batch_status 和 package_info 字段到 withdrawal_transfers 表
 * 用于支持微信支付2025年新版本商家转账功能
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('开始迁移：添加 withdrawal_transfers 表字段...');

    // 检查字段是否已存在
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM withdrawal_transfers WHERE Field IN ('batch_status', 'package_info')"
    );

    if (columns.length > 0) {
      console.log('字段已存在，跳过迁移');
      return;
    }

    // 添加 batch_status 字段
    await connection.query(`
      ALTER TABLE withdrawal_transfers
      ADD COLUMN batch_status VARCHAR(32) NULL COMMENT '批次状态（ACCEPTED, PROCESSING, FINISHED, CLOSED, WAIT_USER_CONFIRM）'
      AFTER wechat_detail_id
    `);
    console.log('✓ 添加 batch_status 字段成功');

    // 添加 package_info 字段
    await connection.query(`
      ALTER TABLE withdrawal_transfers
      ADD COLUMN package_info TEXT NULL COMMENT '用于调起用户确认收款（新版本）'
      AFTER batch_status
    `);
    console.log('✓ 添加 package_info 字段成功');

    console.log('迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
