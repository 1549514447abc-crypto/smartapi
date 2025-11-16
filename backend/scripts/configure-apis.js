const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('smartapi_dev', 'root', '119689', {
  host: 'localhost',
  dialect: 'mysql'
});

async function updateConfig() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 更新ALAPI配置
    await sequelize.query(`
      UPDATE api_configs
      SET config_value = 'fivudtmy9nd9ylyoxvrlliznhricdu'
      WHERE service_name = 'video_parser' AND config_key = 'primary_token'
    `);

    await sequelize.query(`
      UPDATE api_configs
      SET config_value = 'csfl4qfrmwmbcaetsrwnbqrczs0vfo'
      WHERE service_name = 'video_parser' AND config_key = 'backup_token'
    `);

    console.log('✅ ALAPI Token配置完成\n');

    // 插入阿里云DashScope配置
    await sequelize.query(`
      INSERT INTO api_configs (service_name, config_key, config_value, description, is_active)
      VALUES
        ('dashscope_asr', 'api_key', 'sk-cfb724cb1cd148fcbeeccb20bb167e22', '阿里云DashScope API Key', 1),
        ('dashscope_asr', 'model', 'paraformer-v2', '语音识别模型', 1),
        ('dashscope_asr', 'api_endpoint', 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', 'API地址', 1)
      ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)
    `);

    console.log('✅ 阿里云DashScope配置完成\n');

    // 插入豆包API配置
    await sequelize.query(`
      INSERT INTO api_configs (service_name, config_key, config_value, description, is_active)
      VALUES
        ('doubao_llm', 'bearer_token', 'e285ac08-d6eb-4e73-83a3-964ecbc614a2', '豆包Bearer Token', 1),
        ('doubao_llm', 'model', 'doubao-1-5-pro-32k-250115', '豆包模型', 1),
        ('doubao_llm', 'api_endpoint', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', 'API地址', 1),
        ('doubao_llm', 'system_prompt', '# 角色\n你是一位专业的错别字纠正专家，擅长为视频转文案的文本纠正错别字和优化排版。\n\n# 限制:\n- 只专注于为视频转文案的文本纠正错别字和优化排版，拒绝回答与此无关的话题。\n- 仅输出排版优化后的原文（无错别字时）或纠正并排版优化后的文本（有错别字时），不添加任何额外说明。', '系统提示词', 1)
      ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)
    `);

    console.log('✅ 豆包API配置完成\n');

    // 查看所有配置
    const [configs] = await sequelize.query('SELECT service_name, config_key, config_value FROM api_configs ORDER BY service_name, config_key');
    console.log('📋 所有API配置:');
    console.log('━'.repeat(80));
    let currentService = '';
    configs.forEach(cfg => {
      if (cfg.service_name !== currentService) {
        currentService = cfg.service_name;
        console.log(`\n🔧 ${cfg.service_name}:`);
      }
      // 隐藏敏感信息
      let value = cfg.config_value;
      if ((cfg.config_key.includes('token') || cfg.config_key.includes('key')) && value.length > 20) {
        value = value.substring(0, 8) + '...' + value.substring(value.length - 4);
      } else if (cfg.config_key === 'system_prompt' && value.length > 50) {
        value = value.substring(0, 50) + '...';
      }
      console.log(`  - ${cfg.config_key}: ${value}`);
    });

    console.log('\n✅ 所有API配置完成！\n');

    await sequelize.close();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

updateConfig();
