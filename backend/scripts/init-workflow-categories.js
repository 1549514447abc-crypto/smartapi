/**
 * 初始化工作流分类脚本
 * 运行方式: node scripts/init-workflow-categories.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const categories = [
  { category_key: 'all', category_name: '全部', icon: '📦', description: '所有工作流', sort_order: 0 },
  { category_key: 'self_media', category_name: '自媒体工作流', icon: '📱', description: '抖音、小红书、B站等自媒体数据采集与分析工作流', sort_order: 1 },
  { category_key: 'celebrity', category_name: '名人角色扮演', icon: '🎭', description: '名人角色扮演、虚拟人物对话工作流', sort_order: 2 },
  { category_key: 'tools', category_name: '工具类', icon: '🔧', description: '通用工具类工作流', sort_order: 3 },
  { category_key: 'image_process', category_name: '图片处理类', icon: '🖼️', description: '图片编辑、处理、优化相关工作流', sort_order: 4 },
  { category_key: 'ecommerce', category_name: '电商图片类', icon: '🛒', description: '电商产品图、主图、详情图制作工作流', sort_order: 5 },
  { category_key: 'video', category_name: '视频生成类', icon: '🎬', description: '视频生成、剪辑、特效相关工作流', sort_order: 6 },
  { category_key: 'education', category_name: '教育类', icon: '📚', description: '教育、培训、知识整理相关工作流', sort_order: 7 },
  { category_key: 'image_gen', category_name: '图像生成类', icon: '🎨', description: 'AI绘图、图像生成、风格迁移工作流', sort_order: 8 },
  { category_key: 'novel', category_name: '小说生成类', icon: '📖', description: '小说、故事、剧本生成工作流', sort_order: 9 },
];

async function initCategories() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi',
  });

  console.log('连接数据库成功');

  try {
    // 检查表是否存在，不存在则创建
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workflow_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_key VARCHAR(50) NOT NULL UNIQUE,
        category_name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT '📁',
        description VARCHAR(500),
        workflow_count INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('确认 workflow_categories 表存在');

    // 插入或更新分类
    for (const cat of categories) {
      const [existing] = await connection.execute(
        'SELECT id FROM workflow_categories WHERE category_key = ?',
        [cat.category_key]
      );

      if (existing.length > 0) {
        // 更新
        await connection.execute(
          `UPDATE workflow_categories
           SET category_name = ?, icon = ?, description = ?, sort_order = ?, is_active = 1
           WHERE category_key = ?`,
          [cat.category_name, cat.icon, cat.description, cat.sort_order, cat.category_key]
        );
        console.log(`更新分类: ${cat.category_name}`);
      } else {
        // 插入
        await connection.execute(
          `INSERT INTO workflow_categories (category_key, category_name, icon, description, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [cat.category_key, cat.category_name, cat.icon, cat.description, cat.sort_order]
        );
        console.log(`新增分类: ${cat.category_name}`);
      }
    }

    // 禁用旧分类
    const oldCategories = ['scraping', 'content', 'automation', 'social', 'analysis', 'image'];
    for (const oldCat of oldCategories) {
      await connection.execute(
        'UPDATE workflow_categories SET is_active = 0 WHERE category_key = ?',
        [oldCat]
      );
    }
    console.log('已禁用旧分类');

    // 更新各分类的工作流数量（统计所有状态的工作流）
    await connection.execute(`
      UPDATE workflow_categories wc
      SET workflow_count = (
        SELECT COUNT(*) FROM workflows w
        WHERE w.category COLLATE utf8mb4_unicode_ci = wc.category_key COLLATE utf8mb4_unicode_ci
      )
      WHERE category_key != 'all'
    `);

    // 更新"全部"分类的数量
    await connection.execute(`
      UPDATE workflow_categories
      SET workflow_count = (SELECT COUNT(*) FROM workflows)
      WHERE category_key = 'all'
    `);
    console.log('已更新各分类的工作流数量');

    // 查询结果
    const [result] = await connection.execute(
      'SELECT category_key, category_name, icon, workflow_count, sort_order FROM workflow_categories WHERE is_active = 1 ORDER BY sort_order'
    );
    console.log('\n当前分类列表:');
    console.table(result);

    console.log('\n工作流分类初始化完成!');
  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    await connection.end();
  }
}

initCategories();
