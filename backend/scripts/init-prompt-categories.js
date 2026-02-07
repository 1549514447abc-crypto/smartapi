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

// 新分类列表（2024-12更新）
const defaultCategories = [
  { key: 'self_media', name: '自媒体文案', icon: '📱', description: '公众号、小红书、抖音等自媒体文案', sort_order: 170 },
  { key: 'other_copywriting', name: '其他文案', icon: '📝', description: '各类通用文案写作', sort_order: 160 },
  { key: 'ai_drawing', name: 'AI绘图', icon: '🎨', description: 'Midjourney、Stable Diffusion等AI绘图提示词', sort_order: 150 },
  { key: 'ai_video', name: 'AI视频生成', icon: '🎬', description: 'Sora、Runway等AI视频生成提示词', sort_order: 140 },
  { key: 'screenplay', name: '剧本创作', icon: '🎭', description: '剧本、脚本、分镜创作', sort_order: 130 },
  { key: 'novel', name: '小说生成', icon: '📚', description: '网文、小说、故事创作', sort_order: 120 },
  { key: 'business', name: '商业', icon: '💼', description: '商业计划、市场分析等', sort_order: 110 },
  { key: 'coding', name: '编程助手', icon: '💻', description: '代码生成、调试、技术文档', sort_order: 100 },
  { key: 'story_assist', name: '故事创作/辅助文案', icon: '✍️', description: '故事创作、文案辅助', sort_order: 90 },
  { key: 'education', name: '教育学习', icon: '📖', description: '学习辅导、知识问答', sort_order: 80 },
  { key: 'marketing', name: '市场营销', icon: '📈', description: '营销策划、推广文案', sort_order: 70 },
  { key: 'roleplay', name: '角色扮演', icon: '🎮', description: '虚拟角色、对话模拟', sort_order: 60 },
  { key: 'office', name: '办公辅助', icon: '📋', description: '邮件、报告、会议纪要等', sort_order: 50 },
  { key: 'ecommerce', name: '电商运营', icon: '🛒', description: '商品文案、运营策划', sort_order: 40 },
  { key: 'job_resume', name: '求职/简历', icon: '📄', description: '简历优化、面试准备', sort_order: 30 },
  { key: 'legal', name: '法律', icon: '⚖️', description: '法律咨询、合同文书', sort_order: 20 },
  { key: 'other_professional', name: '其他专业领域', icon: '🔧', description: '其他专业领域提示词', sort_order: 10 },
];

async function initCategories() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步表结构
    await PromptCategory.sync();
    console.log('表结构同步完成');

    // 获取新分类的所有key
    const newCategoryKeys = defaultCategories.map(c => c.key);

    // 禁用不在新列表中的旧分类
    const [disabledCount] = await PromptCategory.update(
      { is_active: false },
      { where: { key: { [Sequelize.Op.notIn]: newCategoryKeys } } }
    );
    if (disabledCount > 0) {
      console.log(`已禁用 ${disabledCount} 个旧分类`);
    }

    // 插入或更新分类
    for (const cat of defaultCategories) {
      const [category, created] = await PromptCategory.findOrCreate({
        where: { key: cat.key },
        defaults: cat
      });

      if (created) {
        console.log(`✅ 创建分类: ${cat.name}`);
      } else {
        // 更新已存在的分类
        await category.update({
          name: cat.name,
          icon: cat.icon,
          description: cat.description,
          sort_order: cat.sort_order,
          is_active: true
        });
        console.log(`🔄 更新分类: ${cat.name}`);
      }
    }

    console.log('\n✅ 初始化完成！');
    console.log(`共 ${defaultCategories.length} 个分类`);
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

initCategories();
