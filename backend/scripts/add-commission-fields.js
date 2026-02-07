/**
 * 添加佣金系统新字段
 *
 * User表新增字段：
 * - pending_commission_balance: 待结算佣金余额（15天内）
 * - total_commission_earned: 累计获得佣金
 * - total_commission_withdrawn: 累计提现佣金
 *
 * Commission表新增字段：
 * - confirmed_at: 确认时间（15天后确认）
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

console.log('[CONFIG] Database configuration:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  Database:', config.database);
console.log('  User:', config.user);
console.log('');

async function addCommissionFields() {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('[OK] Database connected');

    // 1. 检查并添加 User 表的新字段
    console.log('\n[CHECK] Checking users table fields...');

    const [userColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [config.database]
    );
    const userColumnNames = userColumns.map(col => col.COLUMN_NAME);

    // 添加 pending_commission_balance
    if (!userColumnNames.includes('pending_commission_balance')) {
      console.log('  [ADD] Adding pending_commission_balance field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN pending_commission_balance DECIMAL(10, 4) NOT NULL DEFAULT 0
        COMMENT '待结算佣金余额（15天结算期内）'
        AFTER commission_balance
      `);
      console.log('  [OK] pending_commission_balance added');
    } else {
      console.log('  [SKIP] pending_commission_balance already exists');
    }

    // 添加 total_commission_earned
    if (!userColumnNames.includes('total_commission_earned')) {
      console.log('  [ADD] Adding total_commission_earned field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN total_commission_earned DECIMAL(10, 4) NOT NULL DEFAULT 0
        COMMENT '累计获得佣金总额'
        AFTER pending_commission_balance
      `);
      console.log('  [OK] total_commission_earned added');
    } else {
      console.log('  [SKIP] total_commission_earned already exists');
    }

    // 添加 total_commission_withdrawn
    if (!userColumnNames.includes('total_commission_withdrawn')) {
      console.log('  [ADD] Adding total_commission_withdrawn field...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN total_commission_withdrawn DECIMAL(10, 4) NOT NULL DEFAULT 0
        COMMENT '累计提现佣金总额'
        AFTER total_commission_earned
      `);
      console.log('  [OK] total_commission_withdrawn added');
    } else {
      console.log('  [SKIP] total_commission_withdrawn already exists');
    }

    // 2. 检查并添加 Commission 表的新字段
    console.log('\n[CHECK] Checking commissions table fields...');

    const [commissionColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'commissions'",
      [config.database]
    );
    const commissionColumnNames = commissionColumns.map(col => col.COLUMN_NAME);

    // 添加 confirmed_at
    if (!commissionColumnNames.includes('confirmed_at')) {
      console.log('  [ADD] Adding confirmed_at field...');
      await connection.query(`
        ALTER TABLE commissions
        ADD COLUMN confirmed_at DATETIME NULL
        COMMENT '确认时间（15天后自动确认的时间）'
        AFTER settled_at
      `);
      console.log('  [OK] confirmed_at added');
    } else {
      console.log('  [SKIP] confirmed_at already exists');
    }

    // 3. 初始化现有用户的新字段数据
    console.log('\n[INIT] Initializing existing user data...');

    // 计算每个用户的累计获得佣金（从commissions表汇总）
    await connection.query(`
      UPDATE users u
      LEFT JOIN (
        SELECT referrer_id,
               SUM(amount) as total_earned,
               SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
        FROM commissions
        GROUP BY referrer_id
      ) c ON u.id = c.referrer_id
      SET
        u.total_commission_earned = COALESCE(c.total_earned, 0),
        u.pending_commission_balance = COALESCE(c.pending_amount, 0)
      WHERE c.referrer_id IS NOT NULL
    `);
    console.log('  [OK] User commission data initialized');

    // 4. 显示迁移后的统计信息
    console.log('\n[STATS] Migration statistics:');

    const [userStats] = await connection.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN pending_commission_balance > 0 THEN 1 END) as users_with_pending,
        SUM(pending_commission_balance) as total_pending,
        SUM(total_commission_earned) as total_earned
      FROM users
    `);
    console.log('  Total users:', userStats[0].total_users);
    console.log('  Users with pending commission:', userStats[0].users_with_pending);
    console.log('  Total pending commission: $' + parseFloat(userStats[0].total_pending || 0).toFixed(2));
    console.log('  Total earned commission: $' + parseFloat(userStats[0].total_earned || 0).toFixed(2));

    console.log('\n[SUCCESS] Database migration completed!');

  } catch (error) {
    console.error('[ERROR] Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('[DONE] Database connection closed');
    }
  }
}

// 执行迁移
addCommissionFields().catch(err => {
  console.error('[FATAL] Execution failed:', err);
  process.exit(1);
});
