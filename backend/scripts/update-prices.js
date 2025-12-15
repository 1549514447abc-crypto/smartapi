const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

async function updatePrices() {
  try {
    const [results] = await sequelize.query('UPDATE prompts SET price = 9.90 WHERE price != 9.90');
    console.log('更新成功');

    const [prompts] = await sequelize.query('SELECT id, title, price FROM prompts');
    console.log('\n当前提示词价格:');
    prompts.forEach(p => {
      console.log('  ' + p.id + '. ' + p.title + ': ¥' + p.price);
    });

    await sequelize.close();
  } catch (err) {
    console.error('错误:', err.message);
  }
}

updatePrices();
