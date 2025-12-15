/**
 * 初始化提示词分类数据
 * 运行: node scripts/init-prompt-categories.js
 */

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

const PromptCategory = sequelize.define('PromptCategory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  icon: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'prompt_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

const defaultCategories = [
  { key: 'content', name: '内容创作', icon: 'edit', description: '文章、文案、创意写作等', sort_order: 100 },
  { key: 'design', name: '设计创意', icon: 'highlight', description: '设计灵感、创意方案等', sort_order: 90 },
  { key: 'code', name: '开发编程', icon: 'code', description: '代码生成、技术文档等', sort_order: 80 },
  { key: 'office', name: '办公效率', icon: 'file-text', description: '邮件、报告、会议纪要等', sort_order: 70 },
  { key: 'education', name: '教育学习', icon: 'read', description: '学习辅导、知识问答等', sort_order: 60 },
  { key: 'analysis', name: '思维分析', icon: 'bulb', description: '问题分析、决策支持等', sort_order: 50 },
  { key: 'translation', name: '翻译写作', icon: 'translation', description: '多语言翻译、润色等', sort_order: 40 },
  { key: 'marketing', name: '营销文案', icon: 'shopping', description: '广告文案、营销策划等', sort_order: 30 },
  { key: 'other', name: '其他', icon: 'appstore', description: '其他类型提示词', sort_order: 0 },
];

async function initCategories() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步表结构
    await PromptCategory.sync();
    console.log('表结构同步完成');

    // 插入默认分类
    for (const cat of defaultCategories) {
      const [category, created] = await PromptCategory.findOrCreate({
        where: { key: cat.key },
        defaults: cat
      });

      if (created) {
        console.log(`创建分类: ${cat.name}`);
      } else {
        console.log(`分类已存在: ${cat.name}`);
      }
    }

    console.log('\n初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

initCategories();
