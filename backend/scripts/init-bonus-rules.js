/**
 * 初始化充值赠金规则
 *
 * 运行方式:
 *   node scripts/init-bonus-rules.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const defaultRules = [
  { min_amount: 1000, bonus_rate: 0.40, display_text: '充1000送400', priority: 5 },
  { min_amount: 500, bonus_rate: 0.25, display_text: '充500送125', priority: 4 },
  { min_amount: 300, bonus_rate: 0.20, display_text: '充300送60', priority: 3 },
  { min_amount: 100, bonus_rate: 0.15, display_text: '充100送15', priority: 2 },
  { min_amount: 50, bonus_rate: 0.10, display_text: '充50送5', priority: 1 },
  { min_amount: 10, bonus_rate: 0.00, display_text: '充10不送', priority: 0 }
];

async function initBonusRules() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'smartapi'
  });

  console.log('Connected to database');

  try {
    // 检查表是否存在
    const [tables] = await connection.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recharge_bonus_rules'
    `, [process.env.DB_NAME || 'smartapi']);

    if (tables.length === 0) {
      console.log('Creating recharge_bonus_rules table...');
      await connection.query(`
        CREATE TABLE recharge_bonus_rules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          min_amount DECIMAL(10, 4) NOT NULL COMMENT '最低充值金额',
          bonus_rate DECIMAL(5, 4) NOT NULL DEFAULT 0 COMMENT '赠送比例 (0.1 = 10%)',
          bonus_type ENUM('rate', 'fixed') DEFAULT 'rate' COMMENT '赠送类型',
          bonus_fixed_amount DECIMAL(10, 4) DEFAULT NULL COMMENT '固定赠送金额',
          display_text VARCHAR(200) DEFAULT NULL COMMENT '显示文本',
          priority INT DEFAULT 0 COMMENT '优先级',
          is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          start_time DATETIME DEFAULT NULL,
          end_time DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_min_amount (min_amount),
          INDEX idx_active (is_active),
          INDEX idx_priority (priority)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值赠送规则表'
      `);
      console.log('✅ Table created');
    } else {
      console.log('✅ Table already exists');
    }

    // 检查是否有数据
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM recharge_bonus_rules');
    const existingCount = existing[0].count;

    if (existingCount === 0) {
      console.log('Inserting default bonus rules...');

      for (const rule of defaultRules) {
        await connection.query(`
          INSERT INTO recharge_bonus_rules (min_amount, bonus_rate, display_text, priority, is_active)
          VALUES (?, ?, ?, ?, TRUE)
        `, [rule.min_amount, rule.bonus_rate, rule.display_text, rule.priority]);
      }

      console.log(`✅ Inserted ${defaultRules.length} bonus rules`);
    } else {
      console.log(`✅ ${existingCount} bonus rules already exist`);

      // 显示现有规则
      const [rules] = await connection.query(`
        SELECT min_amount, bonus_rate, display_text, is_active
        FROM recharge_bonus_rules
        ORDER BY priority DESC
      `);

      console.log('\nCurrent bonus rules:');
      rules.forEach(r => {
        const status = r.is_active ? '✅' : '❌';
        console.log(`  ${status} ${r.display_text} (rate: ${r.bonus_rate}, active: ${r.is_active})`);
      });
    }

    console.log('\n✅ Bonus rules initialization complete!');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

initBonusRules().catch(console.error);
