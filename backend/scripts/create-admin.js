/**
 * 创建管理员账户脚本
 * 运行: node scripts/create-admin.js
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
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended'),
    defaultValue: 'active',
  },
  user_type: {
    type: DataTypes.ENUM('normal', 'admin'),
    defaultValue: 'normal',
  },
  balance: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
  },
  referral_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 默认管理员账号
    const adminUsername = 'admin';
    const adminPassword = 'admin123456';

    // 检查是否已存在
    const existingAdmin = await User.findOne({
      where: { username: adminUsername }
    });

    if (existingAdmin) {
      // 更新为管理员
      if (existingAdmin.user_type !== 'admin') {
        await existingAdmin.update({ user_type: 'admin' });
        console.log('已将用户升级为管理员');
      } else {
        console.log('管理员账户已存在');
      }
      console.log(`用户名: ${adminUsername}`);
      console.log(`密码: ${adminPassword} (如果之前设置过其他密码，请使用原密码)`);
    } else {
      // 创建新管理员
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: adminUsername,
        nickname: '管理员',
        password_hash: passwordHash,
        user_type: 'admin',
        status: 'active',
      });
      console.log('管理员账户创建成功!');
      console.log(`用户名: ${adminUsername}`);
      console.log(`密码: ${adminPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

createAdmin();
