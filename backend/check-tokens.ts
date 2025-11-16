import sequelize from './src/config/database';
import { QueryTypes } from 'sequelize';

(async () => {
  console.log('===== 短视频文案提取相关 API Token 配置 =====\n');

  const services = ['video_parser', 'dashscope_asr', 'doubao_llm'];

  for (const service of services) {
    const configs: any[] = await sequelize.query(
      'SELECT config_key, config_value FROM api_configs WHERE service_name = ? ORDER BY config_key',
      { replacements: [service], type: QueryTypes.SELECT }
    );

    console.log(`\n【${service}】`);

    if (configs.length === 0) {
      console.log('  ❌ 未配置');
    } else {
      configs.forEach((c) => {
        if (c.config_key.includes('token') || c.config_key.includes('key')) {
          const val = c.config_value || '';
          const masked = val.length > 12 ? `${val.substring(0, 8)}...${val.substring(val.length - 4)}` : val;
          console.log(`  ${c.config_key}: ${masked}`);
        } else {
          console.log(`  ${c.config_key}: ${c.config_value}`);
        }
      });
    }
  }

  await sequelize.close();
})();
