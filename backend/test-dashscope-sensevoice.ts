import axios from 'axios';

async function testSenseVoice() {
  console.log('\n🧪 测试 DashScope SenseVoice 异步识别');
  console.log('='.repeat(50));

  const apiKey = 'sk-c873bc7bb5a74606a5e8bc92f04f3d38';
  const testAudioUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav';

  // Try different combinations of endpoints and models
  const testCases = [
    {
      name: 'SenseVoice with transcription endpoint',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      model: 'sensevoice-v1'
    },
    {
      name: 'Paraformer with paraformer-realtime-v2',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      model: 'paraformer-realtime-v2'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n\n📝 测试: ${testCase.name}`);
    console.log(`Endpoint: ${testCase.endpoint}`);
    console.log(`Model: ${testCase.model}`);

    try {
      const response = await axios.post(testCase.endpoint, {
        model: testCase.model,
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

      console.log('✅ 请求成功！');
      console.log(`Task ID: ${response.data.output?.task_id}`);
      console.log(`完整响应:`, JSON.stringify(response.data, null, 2));

    } catch (error: any) {
      console.log('❌ 请求失败');
      if (error.response) {
        console.log(`状态码: ${error.response.status}`);
        console.log(`错误: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`错误: ${error.message}`);
      }
    }
  }
}

testSenseVoice();
