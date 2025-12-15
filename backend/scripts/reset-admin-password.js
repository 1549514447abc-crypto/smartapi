/**
 * 重置管理员密码脚本
 */

const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  }
);

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(50), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  user_type: { type: DataTypes.ENUM('normal', 'admin'), defaultValue: 'normal' },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

async function resetPassword() {
  try {
    await sequelize.authenticate();

    const newPassword = '123456';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [updated] = await User.update(
      { password_hash: passwordHash },
      { where: { username: 'admin' } }
    );

    if (updated) {
      console.log('密码重置成功!');
      console.log('用户名: admin');
      console.log('新密码: 123456');
    } else {
      console.log('未找到 admin 用户');
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

resetPassword();
