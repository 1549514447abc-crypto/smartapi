/**
 * 初始化用户分类数据
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载.env文件
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartapi'
};

const defaultCategories = [
  {
    category_key: 'normal',
    category_name: '普通用户',
    default_course_rate: 10,
    default_membership_rate: 10,
    description: '默认用户分类，标准佣金比例',
    sort_order: 1
  },
  {
    category_key: 'blogger',
    category_name: '博主',
    default_course_rate: 20,
    default_membership_rate: 20,
    description: '有影响力的博主，更高佣金激励推广',
    sort_order: 2
  },
  {
    category_key: 'vip',
    category_name: '关系户',
    default_course_rate: 25,
    default_membership_rate: 25,
    description: '合作伙伴、关系用户，可单独调整佣金',
    sort_order: 3
  }
];

async function initUserCategories() {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('[OK] Database connected');

    // 1. 检查并创建user_categories表
    console.log('\n[CHECK] Checking user_categories table...');

    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'user_categories'"
    );

    if (tables.length === 0) {
      console.log('  [CREATE] Creating user_categories table...');
      await connection.query(`
        CREATE TABLE user_categories (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          category_key VARCHAR(50) NOT NULL UNIQUE COMMENT '分类标识',
          category_name VARCHAR(50) NOT NULL COMMENT '分类名称',
          default_course_rate DECIMAL(5,2) NOT NULL DEFAULT 10 COMMENT '默认课程佣金比例(%)',
          default_membership_rate DECIMAL(5,2) NOT NULL DEFAULT 10 COMMENT '默认会员佣金比例(%)',
          description TEXT NULL COMMENT '描述说明',
          is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
          sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_key (category_key),
          INDEX idx_is_active (is_active),
          INDEX idx_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  [OK] user_categories table created');
    } else {
      console.log('  [SKIP] user_categories table exists');
    }

    // 2. 添加User表的新字段
    console.log('\n[CHECK] Adding commission fields to users table...');

    const [userColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [config.database]
    );
    const userColumnNames = userColumns.map(col => col.COLUMN_NAME);

    if (!userColumnNames.includes('user_category')) {
      console.log('  [ADD] Adding user_category field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN user_category VARCHAR(50) NULL DEFAULT 'normal'
        COMMENT '用户分类（normal, blogger, vip等）'
        AFTER referred_at
      `);
      await connection.query(`ALTER TABLE users ADD INDEX idx_user_category (user_category)`);
      console.log('  [OK] user_category added');
    } else {
      console.log('  [SKIP] user_category exists');
    }

    if (!userColumnNames.includes('custom_course_rate')) {
      console.log('  [ADD] Adding custom_course_rate field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN custom_course_rate DECIMAL(5,2) NULL
        COMMENT '自定义课程佣金比例(%)'
        AFTER user_category
      `);
      console.log('  [OK] custom_course_rate added');
    } else {
      console.log('  [SKIP] custom_course_rate exists');
    }

    if (!userColumnNames.includes('custom_membership_rate')) {
      console.log('  [ADD] Adding custom_membership_rate field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN custom_membership_rate DECIMAL(5,2) NULL
        COMMENT '自定义会员佣金比例(%)'
        AFTER custom_course_rate
      `);
      console.log('  [OK] custom_membership_rate added');
    } else {
      console.log('  [SKIP] custom_membership_rate exists');
    }

    if (!userColumnNames.includes('commission_note')) {
      console.log('  [ADD] Adding commission_note field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN commission_note TEXT NULL
        COMMENT '佣金备注说明'
        AFTER custom_membership_rate
      `);
      console.log('  [OK] commission_note added');
    } else {
      console.log('  [SKIP] commission_note exists');
    }

    // 3. 插入默认分类数据
    console.log('\n[INIT] Inserting default categories...');

    for (const category of defaultCategories) {
      const [existing] = await connection.query(
        'SELECT id FROM user_categories WHERE category_key = ?',
        [category.category_key]
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO user_categories
           (category_key, category_name, default_course_rate, default_membership_rate, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            category.category_key,
            category.category_name,
            category.default_course_rate,
            category.default_membership_rate,
            category.description,
            category.sort_order
          ]
        );
        console.log(`  [ADD] ${category.category_name} (${category.category_key})`);
      } else {
        console.log(`  [SKIP] ${category.category_name} exists`);
      }
    }

    // 4. 将现有用户设置为普通用户
    console.log('\n[UPDATE] Setting default category for existing users...');
    await connection.query(`
      UPDATE users
      SET user_category = 'normal'
      WHERE user_category IS NULL
    `);
    console.log('  [OK] Existing users updated');

    // 5. 显示最终统计
    console.log('\n[STATS] Final statistics:');

    const [categories] = await connection.query('SELECT * FROM user_categories ORDER BY sort_order');
    console.log('  Categories:');
    for (const cat of categories) {
      console.log(`    - ${cat.category_name}: Course ${cat.default_course_rate}% / Membership ${cat.default_membership_rate}%`);
    }

    const [userStats] = await connection.query(`
      SELECT user_category, COUNT(*) as count
      FROM users
      GROUP BY user_category
    `);
    console.log('  User distribution:');
    for (const stat of userStats) {
      console.log(`    - ${stat.user_category || 'NULL'}: ${stat.count} users`);
    }

    console.log('\n[SUCCESS] User categories initialized!');

  } catch (error) {
    console.error('[ERROR] Initialization failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('[DONE] Database connection closed');
    }
  }
}

// 执行初始化
initUserCategories().catch(err => {
  console.error('[FATAL] Execution failed:', err);
  process.exit(1);
});
