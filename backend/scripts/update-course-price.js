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

async function updateCoursePrice() {
  try {
    // 更新课程价格为799
    await sequelize.query('UPDATE course_settings SET current_price = 799, original_price = 999 WHERE id = 1');
    console.log('课程价格更新成功！');

    // 查询当前课程设置
    const [settings] = await sequelize.query('SELECT id, title, original_price, current_price FROM course_settings');
    console.log('\n当前课程价格:');
    settings.forEach(s => {
      console.log(`  ${s.id}. ${s.title}: 原价¥${s.original_price} -> 现价¥${s.current_price}`);
    });

    await sequelize.close();
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
}

updateCoursePrice();
