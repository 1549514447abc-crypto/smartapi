/**
 * 为 recharge_records 表添加支付链接字段
 * 用于存储支付二维码链接和跳转链接
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'smartapi_dev',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function addPaymentUrlFields() {
  try {
    console.log('开始为 recharge_records 表添加支付链接字段...\n');

    // 添加 code_url 字段（微信支付二维码链接）
    try {
      await sequelize.query(`
        ALTER TABLE recharge_records
        ADD COLUMN code_url VARCHAR(500) DEFAULT NULL COMMENT '微信支付二维码链接'
      `);
      console.log('✅ 添加 code_url 字段成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⚠️ code_url 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 添加 pay_url 字段（支付宝跳转链接）
    try {
      await sequelize.query(`
        ALTER TABLE recharge_records
        ADD COLUMN pay_url TEXT DEFAULT NULL COMMENT '支付宝跳转链接'
      `);
      console.log('✅ 添加 pay_url 字段成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⚠️ pay_url 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 支付链接字段添加完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
}

addPaymentUrlFields();
