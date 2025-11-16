import axios from 'axios';
import sequelize from './src/config/database';
import { QueryTypes } from 'sequelize';

async function getConfig(service: string, key: string): Promise<string> {
  const result: any[] = await sequelize.query(
    'SELECT config_value FROM api_configs WHERE service_name = ? AND config_key = ?',
    { replacements: [service, key], type: QueryTypes.SELECT }
  );
  return result[0]?.config_value || '';
}

async function testALAPI() {
  console.log('\n🧪 测试 1: ALAPI 视频解析服务');
  console.log('='.repeat(50));

  const endpoint = await getConfig('video_parser', 'api_endpoint');
  const primaryToken = await getConfig('video_parser', 'primary_token');
  const backupToken = await getConfig('video_parser', 'backup_token');

  console.log(`Endpoint: ${endpoint}`);
  console.log(`Primary Token: ${primaryToken.substring(0, 8)}...${primaryToken.substring(primaryToken.length - 4)}`);
  console.log(`Backup Token: ${backupToken.substring(0, 8)}...${backupToken.substring(backupToken.length - 4)}`);

  // 测试一个简单的抖音视频链接
  const testUrl = 'https://v.douyin.com/iRNBho6V/';

  console.log(`\n测试 URL: ${testUrl}`);
  console.log('\n测试 Primary Token...');

  try {
    const response = await axios.post(endpoint, {
      token: primaryToken,
      url: testUrl
    }, { timeout: 10000 });

    if (response.data.code === 200) {
      console.log('✅ Primary Token 可用');
      console.log(`   返回数据:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`❌ Primary Token 不可用`);
      console.log(`   错误码: ${response.data.code}`);
      console.log(`   错误信息: ${response.data.message || response.data.msg}`);
    }
  } catch (error: any) {
    console.log('❌ Primary Token 请求失败');
    console.log(`   错误: ${error.message}`);
  }

  console.log('\n测试 Backup Token...');

  try {
    const response = await axios.post(endpoint, {
      token: backupToken,
      url: testUrl
    }, { timeout: 10000 });

    if (response.data.code === 200) {
      console.log('✅ Backup Token 可用');
    } else {
      console.log(`❌ Backup Token 不可用`);
      console.log(`   错误码: ${response.data.code}`);
      console.log(`   错误信息: ${response.data.message || response.data.msg}`);
    }
  } catch (error: any) {
    console.log('❌ Backup Token 请求失败');
    console.log(`   错误: ${error.message}`);
  }
}

async function testDashScope() {
  console.log('\n\n🧪 测试 2: DashScope 语音识别服务');
  console.log('='.repeat(50));

  const endpoint = await getConfig('dashscope_asr', 'api_endpoint');
  const apiKey = await getConfig('dashscope_asr', 'api_key');
  const model = await getConfig('dashscope_asr', 'model');

  console.log(`Endpoint: ${endpoint}`);
  console.log(`API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`Model: ${model}`);

  // 测试一个公开的音频URL
  const testAudioUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav';

  console.log(`\n测试音频 URL: ${testAudioUrl}`);

  try {
    const response = await axios.post(endpoint, {
      model: model,
      input: {
        audio_url: testAudioUrl
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.output) {
      console.log('✅ DashScope API Key 可用');
      console.log(`   识别文本: ${response.data.output.text || '(无)'}`);
      console.log(`   请求ID: ${response.data.request_id}`);
    } else {
      console.log('❌ DashScope API Key 不可用');
      console.log(`   响应:`, response.data);
    }
  } catch (error: any) {
    console.log('❌ DashScope API Key 请求失败');
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   错误: ${error.message}`);
    }
  }
}

async function testDoubao() {
  console.log('\n\n🧪 测试 3: Doubao LLM 文本纠错服务');
  console.log('='.repeat(50));

  const endpoint = await getConfig('doubao_llm', 'api_endpoint');
  const bearerToken = await getConfig('doubao_llm', 'bearer_token');
  const model = await getConfig('doubao_llm', 'model');

  console.log(`Endpoint: ${endpoint}`);
  console.log(`Bearer Token: ${bearerToken.substring(0, 8)}...${bearerToken.substring(bearerToken.length - 4)}`);
  console.log(`Model: ${model}`);

  const testText = '这是一个测试文本，包含一些错别字。';

  console.log(`\n测试文本: ${testText}`);

  try {
    const response = await axios.post(endpoint, {
      model: model,
      messages: [
        { role: 'system', content: '你是文本纠错助手' },
        { role: 'user', content: testText }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.choices && response.data.choices.length > 0) {
      console.log('✅ Doubao Bearer Token 可用');
      console.log(`   返回文本: ${response.data.choices[0].message.content}`);
      console.log(`   请求ID: ${response.data.id}`);
    } else {
      console.log('❌ Doubao Bearer Token 不可用');
      console.log(`   响应:`, response.data);
    }
  } catch (error: any) {
    console.log('❌ Doubao Bearer Token 请求失败');
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   错误: ${error.message}`);
    }
  }
}

(async () => {
  try {
    console.log('\n📋 短视频文案提取功能 - Token 可用性测试');
    console.log('='.repeat(50));

    await testALAPI();
    await testDashScope();
    await testDoubao();

    console.log('\n\n✅ 测试完成！');

  } catch (error) {
    console.error('测试过程出错:', error);
  } finally {
    await sequelize.close();
  }
})();
