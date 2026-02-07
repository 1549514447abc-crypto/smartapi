/**
 * 数据库迁移脚本: 添加视频提取任务的费用字段
 *
 * 运行方式:
 *   node scripts/add-video-task-cost-fields.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'smartapi'
  });

  console.log('Connected to database');

  try {
    // 检查 total_cost 字段是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_extraction_tasks' AND COLUMN_NAME = 'total_cost'
    `, [process.env.DB_NAME || 'smartapi']);

    if (columns.length === 0) {
      console.log('Adding total_cost column...');
      await connection.query(`
        ALTER TABLE video_extraction_tasks
        ADD COLUMN total_cost DECIMAL(10,4) NULL COMMENT '总费用(元)'
      `);
      console.log('✅ total_cost column added');
    } else {
      console.log('⏭️  total_cost column already exists');
    }

    // 检查 balance_after 字段是否存在
    const [columns2] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_extraction_tasks' AND COLUMN_NAME = 'balance_after'
    `, [process.env.DB_NAME || 'smartapi']);

    if (columns2.length === 0) {
      console.log('Adding balance_after column...');
      await connection.query(`
        ALTER TABLE video_extraction_tasks
        ADD COLUMN balance_after DECIMAL(10,4) NULL COMMENT '扣费后余额(元)'
      `);
      console.log('✅ balance_after column added');
    } else {
      console.log('⏭️  balance_after column already exists');
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

migrate().catch(console.error);
