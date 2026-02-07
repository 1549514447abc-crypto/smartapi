/**
 * 初始化插件市场数据
 * 运行: node scripts/init-plugins.js
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

const Plugin = sequelize.define('Plugin', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  developer_id: { type: DataTypes.BIGINT, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: true },
  icon_url: { type: DataTypes.STRING(500), allowNull: true },
  plugin_config: { type: DataTypes.JSON, allowNull: true },
  version: { type: DataTypes.STRING(20), defaultValue: '1.0.0' },
  install_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.00 },
  review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_free: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('approved', 'pending', 'rejected', 'offline'), defaultValue: 'pending' },
  feishu_link: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'plugins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

const PluginCategory = sequelize.define('PluginCategory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  category_key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  category_name: { type: DataTypes.STRING(100), allowNull: false },
  icon: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: true },
  plugin_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'plugin_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// 插件分类
const pluginCategories = [
  { category_key: 'all', category_name: '全部', icon: '🔌', sort_order: 0 },
  { category_key: 'scraping', category_name: '数据采集', icon: '🌐', sort_order: 10 },
  { category_key: 'video', category_name: '视频处理', icon: '🎬', sort_order: 20 },
  { category_key: 'image', category_name: '图片处理', icon: '🖼️', sort_order: 30 },
  { category_key: 'content', category_name: '文档处理', icon: '📄', sort_order: 40 },
  { category_key: 'editing', category_name: '视频剪辑', icon: '✂️', sort_order: 50 },
  { category_key: 'llm', category_name: 'AI模型', icon: '🤖', sort_order: 60 },
  { category_key: 'ai_image', category_name: 'AI绘图', icon: '🎨', sort_order: 70 },
  { category_key: 'ai_video', category_name: 'AI视频', icon: '📹', sort_order: 80 },
  { category_key: 'ai_digital', category_name: 'AI数字人', icon: '👤', sort_order: 90 },
  { category_key: 'voice', category_name: '语音合成', icon: '🎤', sort_order: 100 },
  { category_key: 'music', category_name: '音乐生成', icon: '🎵', sort_order: 110 },
  { category_key: 'tools', category_name: '工具', icon: '🔧', sort_order: 120 },
  { category_key: 'other', category_name: '其他', icon: '📦', sort_order: 999 },
];

// 已上线插件（8个）
const launchedPlugins = [
  {
    name: '抖音视频全能工具箱',
    description: '获取公开的抖音视频、主页链接、评论等。计费：大部分0.03元/次；fetch_fan_portrait 0.3元/次；get_all_comments 0.3元/200条；get_user_video_links 0.15元/次',
    category: 'scraping',
    is_free: false,
    status: 'approved',
    install_count: 356,
    rating: 4.8,
    review_count: 42,
  },
  {
    name: '小红书插件',
    description: '获取公开的小红书视频、标题、评论等。计费：0.3元/次',
    category: 'scraping',
    is_free: false,
    status: 'approved',
    install_count: 289,
    rating: 4.7,
    review_count: 35,
  },
  {
    name: '小红书单篇笔记解析',
    description: '获取单篇笔记的标题、正文、发布日期和图片链接。计费：0.03元/次',
    category: 'scraping',
    is_free: false,
    status: 'approved',
    install_count: 412,
    rating: 4.6,
    review_count: 28,
  },
  {
    name: '公众号多功能插件',
    description: '主页链接获取、文章点赞统计、关键词搜索。计费：get_kw_search 1.5元/次，其他 0.3元/次',
    category: 'scraping',
    is_free: false,
    status: 'approved',
    install_count: 198,
    rating: 4.5,
    review_count: 22,
  },
  {
    name: '全平台视频文案提取器',
    description: '支持抖音、小红书、快手、西瓜、B站等平台。计费：非会员0.02元/秒，会员0.015元/秒，学员0.0133元/秒',
    category: 'video',
    is_free: false,
    status: 'approved',
    install_count: 867,
    rating: 4.9,
    review_count: 76,
  },
  {
    name: 'PDF转图片工具',
    description: 'PDF转图片、图片转PDF、合并、拆分等功能。计费：0.02元/次',
    category: 'content',
    is_free: false,
    status: 'approved',
    install_count: 245,
    rating: 4.4,
    review_count: 18,
  },
  {
    name: '剪映小助手数据生成器',
    description: '自动剪辑的数据预处理，为剪映小助手准备素材数据',
    category: 'editing',
    is_free: true,
    status: 'approved',
    install_count: 523,
    rating: 4.7,
    review_count: 45,
  },
  {
    name: '剪映小助手视频合成',
    description: '自动剪辑的视频合成助手，一键完成视频合成',
    category: 'editing',
    is_free: true,
    status: 'approved',
    install_count: 498,
    rating: 4.8,
    review_count: 52,
  },
];

// 待上线插件（32个）
const upcomingPlugins = [
  { name: 'FISH AUDIO语音克隆器', description: '高质量AI语音克隆，支持多种音色', category: 'voice' },
  { name: '调用Claude大模型', description: '接入Anthropic Claude大模型API', category: 'llm' },
  { name: '调用ChatGPT', description: '接入OpenAI ChatGPT API', category: 'llm' },
  { name: '调用豆包文生图', description: '豆包AI文字生成图片', category: 'ai_image' },
  { name: '调用豆包图生视频', description: '豆包AI图片生成视频', category: 'ai_video' },
  { name: '调用即梦文生图', description: '即梦AI文字生成图片', category: 'ai_image' },
  { name: '可灵图生视频', description: '可灵AI图片生成视频', category: 'ai_video' },
  { name: '调用SORA 2', description: 'OpenAI SORA 2视频生成', category: 'ai_video' },
  { name: '调用Nano banana', description: 'Nano banana AI模型接入', category: 'llm' },
  { name: '定时器', description: '工作流定时触发器', category: 'tools' },
  { name: '时间等待器', description: '工作流延时等待节点', category: 'tools' },
  { name: '短视频解析', description: '短视频平台链接解析', category: 'scraping' },
  { name: '背景音乐库', description: '海量免版权背景音乐', category: 'music' },
  { name: '全网热点获取', description: '实时获取全网热点话题', category: 'scraping' },
  { name: '常见代码块', description: '常用代码片段快速调用', category: 'tools' },
  { name: '通义万相_视频换脸', description: '通义万相AI视频换脸', category: 'ai_video' },
  { name: '通义万相_图生视频', description: '通义万相AI图生视频', category: 'ai_video' },
  { name: '调用LIBLIB AI', description: 'LIBLIB AI模型接入', category: 'llm' },
  { name: '数字人插件', description: 'AI数字人生成与驱动', category: 'ai_digital' },
  { name: '海螺图生视频', description: '海螺AI图片生成视频', category: 'ai_video' },
  { name: 'Suno音乐生成', description: 'Suno AI音乐创作', category: 'music' },
  { name: '即梦对口型图片开口说话', description: '即梦AI让图片开口说话', category: 'ai_digital' },
  { name: 'ChatGPT 4o图像生成', description: 'GPT-4o图像生成能力', category: 'ai_image' },
  { name: 'ComfyUI工具箱', description: 'ComfyUI工作流集成工具', category: 'ai_image' },
  { name: 'Eleven Labs语音识别', description: 'Eleven Labs语音转文字', category: 'voice' },
  { name: 'Vidu图生视频', description: 'Vidu AI图片生成视频', category: 'ai_video' },
  { name: '图片去水印', description: 'AI智能去除图片水印', category: 'image' },
  { name: 'Flux文生图', description: 'Flux AI文字生成图片', category: 'ai_image' },
  { name: '视频中的音频提取', description: '从视频文件提取音频', category: 'video' },
  { name: '视频理解', description: 'AI视频内容理解分析', category: 'ai_video' },
  { name: '文本审查', description: 'AI内容安全审核', category: 'tools' },
  { name: 'OmniHuman数字人', description: 'OmniHuman全身数字人生成', category: 'ai_digital' },
].map(p => ({
  ...p,
  is_free: false,
  status: 'pending',
  install_count: 0,
  rating: 0,
  review_count: 0,
}));

async function initPlugins() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步表结构
    await Plugin.sync();
    await PluginCategory.sync();
    console.log('表结构同步完成');

    // ===== 初始化插件分类 =====
    console.log('\n--- 初始化插件分类 ---');
    for (const cat of pluginCategories) {
      const [category, created] = await PluginCategory.findOrCreate({
        where: { category_key: cat.category_key },
        defaults: cat
      });

      if (created) {
        console.log(`✅ 创建分类: ${cat.category_name}`);
      } else {
        await category.update({
          category_name: cat.category_name,
          icon: cat.icon,
          sort_order: cat.sort_order,
          is_active: true
        });
        console.log(`🔄 更新分类: ${cat.category_name}`);
      }
    }

    // ===== 初始化插件数据 =====
    console.log('\n--- 初始化插件数据 ---');

    // 先删除用户插件关联，再删除插件（避免外键约束错误）
    await sequelize.query('DELETE FROM user_plugins');
    console.log('已清空用户插件关联');

    await Plugin.destroy({ where: {} });
    console.log('已清空旧插件数据');

    // 插入已上线插件
    for (const plugin of launchedPlugins) {
      await Plugin.create(plugin);
      console.log(`✅ 创建已上线插件: ${plugin.name}`);
    }

    // 插入待上线插件
    for (const plugin of upcomingPlugins) {
      await Plugin.create(plugin);
      console.log(`⏳ 创建待上线插件: ${plugin.name}`);
    }

    // ===== 更新分类插件计数 =====
    console.log('\n--- 更新分类计数 ---');
    const allPlugins = [...launchedPlugins, ...upcomingPlugins];
    for (const cat of pluginCategories) {
      if (cat.category_key === 'all') {
        await PluginCategory.update(
          { plugin_count: allPlugins.length },
          { where: { category_key: 'all' } }
        );
      } else {
        const count = allPlugins.filter(p => p.category === cat.category_key).length;
        await PluginCategory.update(
          { plugin_count: count },
          { where: { category_key: cat.category_key } }
        );
      }
    }

    console.log('\n========================================');
    console.log('✅ 初始化完成！');
    console.log(`   插件分类: ${pluginCategories.length} 个`);
    console.log(`   已上线插件: ${launchedPlugins.length} 个`);
    console.log(`   待上线插件: ${upcomingPlugins.length} 个`);
    console.log(`   插件总计: ${launchedPlugins.length + upcomingPlugins.length} 个`);
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

initPlugins();
