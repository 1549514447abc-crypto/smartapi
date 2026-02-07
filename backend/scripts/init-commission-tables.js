/**
 * 佣金提现系统 - 数据库表初始化脚本
 * 运行方式: node scripts/init-commission-tables.js
 *
 * 注意：此脚本会添加新表和字段，不会修改现有数据
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initCommissionTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi',
    multipleStatements: true
  });

  console.log('连接数据库成功，开始创建佣金系统表...\n');

  try {
    // 1. 扩展 users 表，添加推荐相关字段
    console.log('1. 扩展 users 表...');
    const columnsToAdd = [
      { name: 'referral_code', sql: "ADD COLUMN referral_code VARCHAR(20) DEFAULT NULL COMMENT '用户专属推荐码'" },
      { name: 'referred_by_user_id', sql: "ADD COLUMN referred_by_user_id BIGINT DEFAULT NULL COMMENT '推荐人用户ID'" },
      { name: 'referred_at', sql: "ADD COLUMN referred_at TIMESTAMP NULL DEFAULT NULL COMMENT '被推荐时间'" }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE users ${col.sql}`);
        console.log(`   - 添加字段 ${col.name} 成功`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`   - 字段 ${col.name} 已存在，跳过`);
        } else {
          throw e;
        }
      }
    }

    // 添加唯一索引
    try {
      await connection.query(`ALTER TABLE users ADD UNIQUE INDEX idx_referral_code (referral_code)`);
      console.log('   - 添加 referral_code 唯一索引成功');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('   - referral_code 索引已存在，跳过');
      }
    }
    console.log('✅ users 表扩展完成\n');

    // 2. 确认 user_referrals 表存在
    console.log('2. 检查 user_referrals 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_referrals (
        id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        referrer_id BIGINT NOT NULL COMMENT '推广人ID',
        referee_id BIGINT NOT NULL COMMENT '被推广人ID',
        referral_code VARCHAR(100) NOT NULL COMMENT '推广码',
        status ENUM('pending', 'active', 'inactive') DEFAULT 'pending' COMMENT '状态',
        first_purchase_at TIMESTAMP NULL DEFAULT NULL COMMENT '首次消费时间',
        total_contribution DECIMAL(10,4) DEFAULT 0 COMMENT '总贡献金额',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_referrer_id (referrer_id),
        INDEX idx_referee_id (referee_id),
        INDEX idx_referral_code (referral_code),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户推荐关系表';
    `);
    console.log('✅ user_referrals 表检查完成\n');

    // 3. 确认 commissions 表存在
    console.log('3. 检查 commissions 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        referrer_id BIGINT NOT NULL COMMENT '推广人ID',
        referee_id BIGINT NOT NULL COMMENT '被推广人ID',
        referral_id BIGINT NOT NULL COMMENT '推广关系ID',
        amount DECIMAL(10,4) NOT NULL COMMENT '佣金金额',
        commission_rate DECIMAL(5,2) NOT NULL COMMENT '佣金比例(%)',
        source_amount DECIMAL(10,4) NOT NULL COMMENT '来源金额',
        source_type ENUM('recharge', 'consume', 'course', 'membership') NOT NULL COMMENT '来源类型',
        source_id BIGINT DEFAULT NULL COMMENT '来源记录ID',
        status ENUM('pending', 'settled', 'cancelled') DEFAULT 'settled' COMMENT '状态',
        settled_at TIMESTAMP NULL DEFAULT NULL COMMENT '结算时间',
        notes TEXT DEFAULT NULL COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_referrer_id (referrer_id),
        INDEX idx_referee_id (referee_id),
        INDEX idx_referral_id (referral_id),
        INDEX idx_status (status),
        INDEX idx_source_type (source_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='佣金记录表';
    `);
    console.log('✅ commissions 表检查完成\n');

    // 4. 创建提现申请表
    console.log('4. 创建 withdrawal_requests 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        user_id BIGINT NOT NULL COMMENT '申请用户ID',
        amount DECIMAL(10,2) NOT NULL COMMENT '申请提现总金额',
        openid VARCHAR(64) NOT NULL COMMENT '收款微信OpenID',
        status ENUM('pending', 'approved', 'processing', 'success', 'partial', 'failed', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
        reviewed_by BIGINT DEFAULT NULL COMMENT '审核人（管理员ID）',
        reviewed_at TIMESTAMP NULL DEFAULT NULL COMMENT '审核时间',
        reject_reason VARCHAR(255) DEFAULT NULL COMMENT '拒绝原因',
        success_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '成功转账金额',
        fail_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '失败转账金额',
        transfer_count INT DEFAULT 0 COMMENT '转账笔数',
        success_count INT DEFAULT 0 COMMENT '成功笔数',
        remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现申请表';
    `);
    console.log('✅ withdrawal_requests 表创建完成\n');

    // 5. 创建转账明细表
    console.log('5. 创建 withdrawal_transfers 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_transfers (
        id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        withdrawal_id BIGINT NOT NULL COMMENT '关联的提现申请ID',
        transfer_no INT NOT NULL COMMENT '第几笔（1,2,3...）',
        amount DECIMAL(10,2) NOT NULL COMMENT '本笔转账金额（≤200）',
        out_batch_no VARCHAR(64) NOT NULL COMMENT '商户批次单号',
        out_detail_no VARCHAR(64) NOT NULL COMMENT '商户明细单号',
        wechat_batch_id VARCHAR(64) DEFAULT NULL COMMENT '微信批次单号',
        wechat_detail_id VARCHAR(64) DEFAULT NULL COMMENT '微信明细单号',
        status ENUM('pending', 'processing', 'success', 'failed') NOT NULL DEFAULT 'pending' COMMENT '状态',
        fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
        transferred_at TIMESTAMP NULL DEFAULT NULL COMMENT '转账完成时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_withdrawal_id (withdrawal_id),
        INDEX idx_out_batch_no (out_batch_no),
        INDEX idx_status (status),
        UNIQUE INDEX idx_out_detail_no (out_detail_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转账明细表';
    `);
    console.log('✅ withdrawal_transfers 表创建完成\n');

    // 6. 创建佣金配置表
    console.log('6. 创建 commission_settings 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS commission_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        config_key VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
        config_value VARCHAR(255) NOT NULL COMMENT '配置值',
        description VARCHAR(255) DEFAULT NULL COMMENT '说明',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='佣金系统配置表';
    `);

    // 插入默认配置
    await connection.query(`
      INSERT INTO commission_settings (config_key, config_value, description) VALUES
      ('commission_rate', '0.10', '佣金比例（10%）'),
      ('settlement_days', '15', '结算周期（天）'),
      ('min_withdrawal_amount', '10', '最低提现金额（元）'),
      ('max_daily_withdrawal', '2000', '单日最大提现（元）'),
      ('max_single_transfer', '200', '单笔转账上限（元）')
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
    `);
    console.log('✅ commission_settings 表创建完成\n');

    console.log('========================================');
    console.log('🎉 所有佣金系统表创建/更新成功！');
    console.log('========================================');
    console.log('\n创建/检查的表：');
    console.log('  1. users 表扩展字段 (referral_code, referred_by_user_id, referred_at)');
    console.log('  2. user_referrals - 用户推荐关系');
    console.log('  3. commissions - 佣金记录');
    console.log('  4. withdrawal_requests - 提现申请');
    console.log('  5. withdrawal_transfers - 转账明细');
    console.log('  6. commission_settings - 佣金配置');

  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initCommissionTables().catch(console.error);
