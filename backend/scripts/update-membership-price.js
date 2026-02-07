/**
 * 更新会员价格为 499
 * 运行: node backend/scripts/update-membership-price.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'smartapi',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

async function updateMembershipPrice() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 更新会员价格配置
    const [result] = await sequelize.query(`
      UPDATE system_configs
      SET config_value = '499', updated_at = NOW()
      WHERE config_key = 'yearly_membership_price'
    `);

    console.log('更新结果:', result);
    console.log('✅ 会员价格已更新为 499 元');

    // 查询当前配置确认
    const [configs] = await sequelize.query(`
      SELECT config_key, config_value FROM system_configs
      WHERE config_key IN ('yearly_membership_price', 'course_price')
    `);
    console.log('当前价格配置:', configs);

  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await sequelize.close();
  }
}

updateMembershipPrice();
