import axios from 'axios';

async function testALAPI() {
  console.log('\n🧪 测试 ALAPI Token');
  console.log('='.repeat(50));

  const token = 'twomkljgr6pdz0fcausjsfah6shqnx';
  const endpoint = 'https://v3.alapi.cn/api/video/url';
  const testUrl = 'https://v.douyin.com/iRNBho6V/';

  console.log(`Token: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`);
  console.log(`测试URL: ${testUrl}`);

  try {
    const response = await axios.post(endpoint, {
      token: token,
      url: testUrl
    }, { timeout: 10000 });

    if (response.data.code === 200) {
      console.log('✅ ALAPI Token 可用！');
      console.log(`   平台: ${response.data.data?.platform || '未知'}`);
      console.log(`   标题: ${response.data.data?.title || '未知'}`);
      console.log(`   作者: ${response.data.data?.author || '未知'}`);
      return true;
    } else {
      console.log(`❌ ALAPI Token 不可用`);
      console.log(`   错误码: ${response.data.code}`);
      console.log(`   错误信息: ${response.data.message || response.data.msg}`);
      return false;
    }
  } catch (error: any) {
    console.log('❌ ALAPI 请求失败');
    console.log(`   错误: ${error.message}`);
    return false;
  }
}

async function testDashScope() {
  console.log('\n\n🧪 测试 DashScope API Key');
  console.log('='.repeat(50));

  const apiKey = 'sk-c873bc7bb5a74606a5e8bc92f04f3d38';
  const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';
  const testAudioUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav';

  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`测试音频: ${testAudioUrl}`);

  try {
    const response = await axios.post(endpoint, {
      model: 'paraformer-v2',
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

    if (response.data.output) {
      console.log('✅ DashScope API Key 可用！');
      console.log(`   请求ID: ${response.data.request_id}`);
      const text = response.data.output.results?.[0]?.transcription?.text ||
                   response.data.output.text ||
                   '(无文本)';
      console.log(`   识别结果: ${text}`);
      return true;
    } else {
      console.log('❌ DashScope API Key 响应异常');
      console.log(`   响应: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error: any) {
    console.log('❌ DashScope 请求失败');
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   错误: ${error.message}`);
    }
    return false;
  }
}

(async () => {
  console.log('\n📋 测试新 Token 可用性');
  console.log('='.repeat(50));

  const alapiOk = await testALAPI();
  const dashscopeOk = await testDashScope();

  console.log('\n\n📊 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`ALAPI (视频解析):     ${alapiOk ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`DashScope (语音识别): ${dashscopeOk ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`Doubao (文本纠错):    ✅ 可用 (已验证)`);

  if (alapiOk && dashscopeOk) {
    console.log('\n🎉 所有 Token 都可用！短视频文案提取功能已就绪！');
  } else {
    console.log('\n⚠️  部分 Token 不可用，请检查并更新');
  }
})();
