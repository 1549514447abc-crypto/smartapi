/**
 * 添加 related_links 字段到 workflows 表
 */

const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 13306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '119689Abc.',
    database: process.env.DB_NAME || 'smartapi_dev'
  });

  try {
    console.log('检查 related_links 字段是否存在...');

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'smartapi_dev'
       AND TABLE_NAME = 'workflows'
       AND COLUMN_NAME = 'related_links'`
    );

    if (columns.length > 0) {
      console.log('related_links 字段已存在，跳过');
    } else {
      console.log('添加 related_links 字段...');
      await connection.execute(`
        ALTER TABLE workflows
        ADD COLUMN related_links JSON DEFAULT NULL
        COMMENT '相关链接数组 [{title, url, description}]'
        AFTER feishu_link
      `);
      console.log('related_links 字段添加成功！');
    }

    console.log('迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
