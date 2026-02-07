const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log
  }
);

async function addMembershipFields() {
  try {
    console.log('正在添加会员相关字段...');

    // 检查字段是否存在
    const [columns] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'membership_type'");

    if (columns.length === 0) {
      // 添加 membership_type 字段
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN membership_type ENUM('none', 'yearly', 'course') DEFAULT 'none'
        COMMENT '会员类型: none-非会员, yearly-年度会员, course-课程学员'
      `);
      console.log('✓ 已添加 membership_type 字段');
    } else {
      console.log('- membership_type 字段已存在，跳过');
    }

    // 检查 membership_expiry 字段
    const [expiryCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'membership_expiry'");
    if (expiryCol.length === 0) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN membership_expiry DATETIME NULL
        COMMENT '会员到期时间'
      `);
      console.log('✓ 已添加 membership_expiry 字段');
    } else {
      console.log('- membership_expiry 字段已存在，跳过');
    }

    // 检查 is_course_student 字段
    const [studentCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'is_course_student'");
    if (studentCol.length === 0) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN is_course_student TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '是否课程学员'
      `);
      console.log('✓ 已添加 is_course_student 字段');
    } else {
      console.log('- is_course_student 字段已存在，跳过');
    }

    console.log('\n会员字段添加完成！');

    // 显示当前用户表结构中与会员相关的字段
    const [result] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('membership_type', 'membership_expiry', 'is_course_student')
    `);

    console.log('\n当前会员相关字段：');
    result.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (默认: ${col.COLUMN_DEFAULT || 'NULL'}) - ${col.COLUMN_COMMENT}`);
    });

    await sequelize.close();
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
}

addMembershipFields();
