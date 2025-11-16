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

(async () => {
  console.log('\n🧪 DashScope 语音识别服务 - 详细测试');
  console.log('='.repeat(50));

  const endpoint = await getConfig('dashscope_asr', 'api_endpoint');
  const apiKey = await getConfig('dashscope_asr', 'api_key');
  const model = await getConfig('dashscope_asr', 'model');

  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`Model: ${model}`);

  // 使用正确的参数格式
  const testAudioUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav';

  console.log(`\n测试音频: ${testAudioUrl}`);

  try {
    // Step 1: 提交异步任务
    console.log('\n📤 提交异步识别任务...');
    const submitResponse = await axios.post(endpoint, {
      model: model,
      input: {
        file_urls: [testAudioUrl]
      },
      parameters: {
        format: 'wav'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const taskId = submitResponse.data.output?.task_id;
    if (!taskId) {
      console.log('❌ 未返回 task_id');
      console.log(`响应: ${JSON.stringify(submitResponse.data)}`);
      return;
    }

    console.log(`✅ 任务已提交: ${taskId}`);

    // Step 2: 轮询任务状态
    console.log('\n🔍 等待任务完成...');
    let attempts = 0;
    const maxAttempts = 60; // 最多等待3分钟（每3秒一次）
    let taskCompleted = false;
    let finalResponse: any;

    while (attempts < maxAttempts && !taskCompleted) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

      const statusResponse = await axios.get(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 10000
        }
      );

      const status = statusResponse.data.output?.task_status;
      console.log(`   尝试 ${attempts}: 状态 = ${status}`);

      if (status === 'SUCCEEDED') {
        taskCompleted = true;
        finalResponse = statusResponse.data;
      } else if (status === 'FAILED') {
        console.log('❌ 任务失败');
        console.log(`   错误: ${JSON.stringify(statusResponse.data)}`);
        return;
      }
    }

    if (!taskCompleted) {
      console.log('❌ 任务超时');
      return;
    }

    console.log('\n✅ DashScope API Key 可用！');
    console.log(`识别文本: ${finalResponse.output?.results?.[0]?.transcription?.text || '(无)'}`);
    console.log(`请求ID: ${finalResponse.request_id}`);
    console.log('\n完整响应:');
    console.log(JSON.stringify(finalResponse, null, 2));

  } catch (error: any) {
    console.log('\n❌ DashScope API Key 测试失败');
    if (error.response) {
      console.log(`状态码: ${error.response.status}`);
      console.log(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`错误: ${error.message}`);
    }
  } finally {
    await sequelize.close();
  }
})();
