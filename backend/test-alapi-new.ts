import axios from 'axios';

async function testALAPI() {
  console.log('\n🧪 测试新 ALAPI Token');
  console.log('='.repeat(50));

  const token = 'twomkljgr6pdz0fcausjsfah6shqnx';
  const endpoint = 'https://v3.alapi.cn/api/video/url';

  // Test with different video URLs to isolate the issue
  const testUrls = [
    'https://v.douyin.com/iRNBho6V/',
    'https://www.bilibili.com/video/BV18QHUztEzN/'
  ];

  for (const testUrl of testUrls) {
    console.log(`\n📝 测试 URL: ${testUrl}`);

    try {
      const response = await axios.post(endpoint, {
        token: token,
        url: testUrl
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`状态码: ${response.status}`);
      console.log(`响应码: ${response.data.code}`);
      console.log(`响应消息: ${response.data.msg || response.data.message}`);

      if (response.data.code === 200) {
        console.log('✅ Token 可用！');
        console.log(`平台: ${response.data.data?.platform || '未知'}`);
        console.log(`标题: ${response.data.data?.title || '未知'}`);
      } else {
        console.log(`❌ Token 返回错误`);
        console.log(`完整响应:`, JSON.stringify(response.data, null, 2));
      }

    } catch (error: any) {
      console.log('❌ 请求失败');
      if (error.response) {
        console.log(`HTTP 状态码: ${error.response.status}`);
        console.log(`错误: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`错误: ${error.message}`);
      }
    }
  }
}

testALAPI();
