/**
 * 工作流字段迁移脚本
 * 添加新字段：download_url, file_size, video_url, feishu_link, requires_paid_plugin, plugin_note
 * 删除旧字段：price, is_svip_free, workflow_config
 *
 * 运行方式: node scripts/migrate-workflow-fields.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi',
  });

  console.log('连接数据库成功');

  try {
    // 检查并添加新字段
    const newColumns = [
      { name: 'download_url', sql: 'ALTER TABLE workflows ADD COLUMN download_url VARCHAR(500) NULL COMMENT \'压缩包下载链接\' AFTER cover_url' },
      { name: 'file_size', sql: 'ALTER TABLE workflows ADD COLUMN file_size VARCHAR(50) NULL COMMENT \'文件大小\' AFTER download_url' },
      { name: 'video_url', sql: 'ALTER TABLE workflows ADD COLUMN video_url VARCHAR(500) NULL COMMENT \'教学视频链接\' AFTER file_size' },
      { name: 'feishu_link', sql: 'ALTER TABLE workflows ADD COLUMN feishu_link VARCHAR(500) NULL COMMENT \'飞书文档链接\' AFTER video_url' },
      { name: 'requires_paid_plugin', sql: 'ALTER TABLE workflows ADD COLUMN requires_paid_plugin TINYINT(1) DEFAULT 0 COMMENT \'是否需要付费插件\' AFTER feishu_link' },
      { name: 'plugin_note', sql: 'ALTER TABLE workflows ADD COLUMN plugin_note VARCHAR(500) NULL COMMENT \'插件说明\' AFTER requires_paid_plugin' },
      { name: 'images', sql: 'ALTER TABLE workflows ADD COLUMN images JSON NULL COMMENT \'教学图片数组\' AFTER plugin_note' },
    ];

    // 检查列是否存在
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'workflows'`,
      [process.env.DB_NAME || 'smartapi']
    );
    const existingColumns = columns.map(c => c.COLUMN_NAME);

    // 添加新字段
    for (const col of newColumns) {
      if (!existingColumns.includes(col.name)) {
        try {
          await connection.execute(col.sql);
          console.log(`✅ 添加字段: ${col.name}`);
        } catch (err) {
          console.log(`⚠️ 字段 ${col.name} 可能已存在或添加失败:`, err.message);
        }
      } else {
        console.log(`⏭️ 字段已存在: ${col.name}`);
      }
    }

    // 删除旧字段（可选，先注释掉，确认无影响后再执行）
    const oldColumns = ['price', 'is_svip_free', 'workflow_config'];

    console.log('\n--- 以下旧字段建议删除（已注释，手动确认后执行）---');
    for (const colName of oldColumns) {
      if (existingColumns.includes(colName)) {
        console.log(`🗑️ 可删除字段: ${colName}`);
        // 取消注释下面一行来执行删除
        // await connection.execute(`ALTER TABLE workflows DROP COLUMN ${colName}`);
      }
    }

    // 查看最终表结构
    const [result] = await connection.execute('DESCRIBE workflows');
    console.log('\n当前 workflows 表结构:');
    console.table(result.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })));

    console.log('\n✅ 迁移完成!');
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await connection.end();
  }
}

migrate();
