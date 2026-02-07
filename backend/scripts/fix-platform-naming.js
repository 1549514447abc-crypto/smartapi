/**
 * 修复平台命名错误
 * COZE0 -> COZE, MAKE0 -> MAKE
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

async function fixPlatformNaming() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 修复 workflows 表
    const [workflowResults] = await sequelize.query(`
      UPDATE workflows
      SET name = REPLACE(REPLACE(name, 'COZE0', 'COZE'), 'MAKE0', 'MAKE')
      WHERE name LIKE '%COZE0%' OR name LIKE '%MAKE0%'
    `);
    console.log('workflows 表更新:', workflowResults);

    // 修复 plugins 表
    const [pluginResults] = await sequelize.query(`
      UPDATE plugins
      SET name = REPLACE(REPLACE(name, 'COZE0', 'COZE'), 'MAKE0', 'MAKE')
      WHERE name LIKE '%COZE0%' OR name LIKE '%MAKE0%'
    `);
    console.log('plugins 表更新:', pluginResults);

    // 修复 prompts 表
    const [promptResults] = await sequelize.query(`
      UPDATE prompts
      SET name = REPLACE(REPLACE(name, 'COZE0', 'COZE'), 'MAKE0', 'MAKE')
      WHERE name LIKE '%COZE0%' OR name LIKE '%MAKE0%'
    `);
    console.log('prompts 表更新:', promptResults);

    // 同时修复 description 字段中的命名
    await sequelize.query(`
      UPDATE workflows
      SET description = REPLACE(REPLACE(description, 'COZE0', 'COZE'), 'MAKE0', 'MAKE')
      WHERE description LIKE '%COZE0%' OR description LIKE '%MAKE0%'
    `);

    await sequelize.query(`
      UPDATE plugins
      SET description = REPLACE(REPLACE(description, 'COZE0', 'COZE'), 'MAKE0', 'MAKE')
      WHERE description LIKE '%COZE0%' OR description LIKE '%MAKE0%'
    `);

    console.log('平台命名修复完成！');
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await sequelize.close();
  }
}

fixPlatformNaming();
