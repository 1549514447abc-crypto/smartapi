/**
 * 创建计费系统相关数据库表
 * 包括：扩展users表、创建api_keys、balance_logs、recharge_records、service_configs表
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'smartapi',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '123456',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log,
  }
);

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 1. 扩展 users 表 - 添加余额相关字段
    console.log('\n📝 扩展 users 表...');

    // 检查并添加各个列
    const columns = [
      { name: 'balance', definition: 'DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT \'账户余额\'' },
      { name: 'total_recharged', definition: 'DECIMAL(10,4) DEFAULT 0 COMMENT \'累计充值\'' },
      { name: 'total_consumed', definition: 'DECIMAL(10,4) DEFAULT 0 COMMENT \'累计消费\'' },
      { name: 'workflow_member_status', definition: 'VARCHAR(20) COMMENT \'工作流会员状态\'' },
      { name: 'workflow_member_expire', definition: 'DATETIME COMMENT \'工作流会员到期时间\'' },
      { name: 'ai_content_member_status', definition: 'VARCHAR(20) COMMENT \'降AI率会员状态\'' },
      { name: 'ai_content_member_expire', definition: 'DATETIME COMMENT \'降AI率会员到期时间\'' }
    ];

    for (const col of columns) {
      try {
        await sequelize.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`  ✓ 添加列: ${col.name}`);
      } catch (error) {
        if (error.parent && error.parent.errno === 1060) {
          console.log(`  - 列已存在: ${col.name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ users 表扩展完成');

    // 2. 创建 api_keys 表
    console.log('\n📝 创建 api_keys 表...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        api_key VARCHAR(100) PRIMARY KEY COMMENT 'API密钥',
        user_id BIGINT NOT NULL COMMENT '用户ID',
        key_name VARCHAR(100) DEFAULT '默认密钥' COMMENT '密钥名称',
        status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/inactive',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        last_used_at DATETIME COMMENT '最后使用时间',
        total_calls INT DEFAULT 0 COMMENT '总调用次数',
        expires_at DATETIME COMMENT '过期时间',
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API密钥表'
    `);
    console.log('✅ api_keys 表创建完成');

    // 3. 创建 balance_logs 表
    console.log('\n📝 创建 balance_logs 表...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS balance_logs (
        log_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
        user_id BIGINT NOT NULL COMMENT '用户ID',
        change_type VARCHAR(20) NOT NULL COMMENT 'recharge/consume/adjust',
        change_amount DECIMAL(10,4) NOT NULL COMMENT '变动金额（正数=增加，负数=减少）',
        balance_before DECIMAL(10,4) NOT NULL COMMENT '变动前余额',
        balance_after DECIMAL(10,4) NOT NULL COMMENT '变动后余额',
        source VARCHAR(50) NOT NULL COMMENT 'web/plugin/admin',
        service_name VARCHAR(50) COMMENT '服务名称',
        description TEXT COMMENT '描述信息',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        metadata JSON COMMENT '额外信息',
        INDEX idx_user_id (user_id),
        INDEX idx_created (created_at),
        INDEX idx_source (source),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额变动日志表'
    `);
    console.log('✅ balance_logs 表创建完成');

    // 4. 创建 recharge_records 表
    console.log('\n📝 创建 recharge_records 表...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recharge_records (
        record_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
        user_id BIGINT NOT NULL COMMENT '用户ID',
        order_no VARCHAR(100) NOT NULL UNIQUE COMMENT '订单号',
        amount_paid DECIMAL(10,4) NOT NULL COMMENT '实付金额',
        amount_received DECIMAL(10,4) NOT NULL COMMENT '到账金额',
        bonus_amount DECIMAL(10,4) DEFAULT 0 COMMENT '赠送金额',
        payment_method VARCHAR(50) COMMENT 'alipay/wechat/stripe',
        status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT 'success/pending/failed',
        balance_before DECIMAL(10,4) NOT NULL COMMENT '充值前余额',
        balance_after DECIMAL(10,4) NOT NULL COMMENT '充值后余额',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        completed_at DATETIME COMMENT '完成时间',
        INDEX idx_user_id (user_id),
        INDEX idx_order_no (order_no),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值记录表'
    `);
    console.log('✅ recharge_records 表创建完成');

    // 5. 创建 service_configs 表
    console.log('\n📝 创建 service_configs 表...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_configs (
        service_name VARCHAR(50) PRIMARY KEY COMMENT '服务标识',
        display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
        unit_price DECIMAL(10,4) NOT NULL COMMENT '单价（元）',
        billing_unit VARCHAR(20) NOT NULL COMMENT 'per_call/per_second/per_token',
        requires_membership VARCHAR(20) COMMENT '需要的会员类型',
        is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        description TEXT COMMENT '服务描述',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务定价配置表'
    `);
    console.log('✅ service_configs 表创建完成');

    // 6. 初始化服务配置数据
    console.log('\n📝 初始化服务配置数据...');
    await sequelize.query(`
      INSERT IGNORE INTO service_configs (service_name, display_name, unit_price, billing_unit, requires_membership, description) VALUES
      ('douyin_extract', '抖音提取', 0.0300, 'per_call', NULL, '抖音视频信息采集服务'),
      ('xiaohongshu_extract', '小红书提取', 0.3000, 'per_call', NULL, '小红书视频信息采集服务'),
      ('video_extract', '短视频文案提取', 0.0100, 'per_second', NULL, '短视频文案提取服务（按视频时长计费）'),
      ('dify_chat', 'Dify对话', 0.0030, 'per_token', NULL, 'Dify AI对话服务（按token计费）'),
      ('ai_content_reduce', '文章降AI率', 0.0030, 'per_token', 'ai_content', '文章降AI率服务（需会员）')
    `);
    console.log('✅ 服务配置数据初始化完成');

    console.log('\n🎉 所有表创建完成！');
    console.log('\n📊 创建的表：');
    console.log('  1. users (扩展) - 添加余额相关字段');
    console.log('  2. api_keys - API密钥表');
    console.log('  3. balance_logs - 余额变动日志表');
    console.log('  4. recharge_records - 充值记录表');
    console.log('  5. service_configs - 服务定价配置表');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

createTables().catch(console.error);
