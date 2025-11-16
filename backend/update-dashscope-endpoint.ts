import sequelize from './src/config/database';
import { QueryTypes } from 'sequelize';

(async () => {
  console.log('Updating DashScope endpoint to file-transcription...');

  await sequelize.query(
    `UPDATE api_configs
     SET config_value = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/file-transcription'
     WHERE service_name = 'dashscope_asr' AND config_key = 'api_endpoint'`
  );

  console.log('✅ Endpoint updated successfully');

  // Verify
  const result: any[] = await sequelize.query(
    'SELECT config_value FROM api_configs WHERE service_name = ? AND config_key = ?',
    { replacements: ['dashscope_asr', 'api_endpoint'], type: QueryTypes.SELECT }
  );

  console.log(`Current endpoint: ${result[0]?.config_value}`);

  await sequelize.close();
})();
