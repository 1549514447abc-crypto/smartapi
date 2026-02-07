/**
 * 同步历史数据到 Supabase
 * 运行方式: node scripts/sync-to-supabase.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Supabase 配置（从命令行参数或环境变量读取，也可以从数据库读取）
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

async function getSupabaseConfig(connection) {
  const [configs] = await connection.execute(
    "SELECT config_key, config_value FROM api_configs WHERE service_name = 'supabase' AND is_active = 1"
  );

  for (const config of configs) {
    if (config.config_key === 'url') SUPABASE_URL = config.config_value;
    if (config.config_key === 'key') SUPABASE_KEY = config.config_value;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase 配置不完整');
  }

  console.log('✅ Supabase 配置已加载');
  console.log('   URL:', SUPABASE_URL);
}

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };
}

// 获取 Supabase 中已存在的用户
async function getExistingSupabaseUsers() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/unified_users?select=user_id`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`获取 Supabase 用户失败: ${response.status}`);
  }

  const users = await response.json();
  return new Set(users.map(u => u.user_id));
}

// 获取 Supabase 中已存在的 API Key
async function getExistingSupabaseApiKeys() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/unified_api_keys?select=api_key`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`获取 Supabase API Keys 失败: ${response.status}`);
  }

  const keys = await response.json();
  return new Set(keys.map(k => k.api_key));
}

// 同步用户到 Supabase
async function syncUser(userId, balance) {
  const unifiedUserId = `u_${userId}`;

  const userData = {
    user_id: unifiedUserId,
    balance: parseFloat(balance) || 0,
    total_recharged: 0,
    total_consumed: 0,
    status: 'active'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/unified_users`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`同步用户失败: ${response.status} ${errorText}`);
  }

  return true;
}

// 同步 API Key 到 Supabase
async function syncApiKey(apiKey, userId, keyName) {
  const unifiedUserId = `u_${userId}`;

  const apiKeyData = {
    api_key: apiKey,
    user_id: unifiedUserId,
    key_name: keyName || '默认密钥',
    status: 'active'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/unified_api_keys`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(apiKeyData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`同步 API Key 失败: ${response.status} ${errorText}`);
  }

  return true;
}

async function main() {
  console.log('🚀 开始同步历史数据到 Supabase...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartapi',
  });

  console.log('✅ 数据库连接成功\n');

  try {
    // 获取 Supabase 配置
    await getSupabaseConfig(connection);

    // 获取已存在的 Supabase 数据
    console.log('\n📥 获取 Supabase 现有数据...');
    const existingUsers = await getExistingSupabaseUsers();
    const existingApiKeys = await getExistingSupabaseApiKeys();
    console.log(`   已有用户: ${existingUsers.size} 个`);
    console.log(`   已有密钥: ${existingApiKeys.size} 个`);

    // 获取本地用户（有 API 密钥的用户）
    const [localUsers] = await connection.execute(`
      SELECT u.id, u.username, u.balance, ak.api_key, ak.key_name
      FROM users u
      INNER JOIN api_keys ak ON u.id = ak.user_id
      WHERE ak.status = 'active'
      ORDER BY u.id
    `);

    console.log(`\n📊 本地有 API 密钥的用户: ${localUsers.length} 个`);

    // 统计
    let syncedUsers = 0;
    let syncedKeys = 0;
    let skippedUsers = 0;
    let skippedKeys = 0;
    let errors = [];

    // 同步每个用户
    for (const user of localUsers) {
      const unifiedUserId = `u_${user.id}`;

      // 同步用户
      if (!existingUsers.has(unifiedUserId)) {
        try {
          await syncUser(user.id, user.balance);
          console.log(`✅ 同步用户: ${unifiedUserId} (${user.username}), 余额: ${user.balance}`);
          syncedUsers++;
        } catch (error) {
          console.error(`❌ 同步用户失败: ${unifiedUserId} - ${error.message}`);
          errors.push({ type: 'user', id: user.id, error: error.message });
        }
      } else {
        console.log(`⏭️  跳过用户: ${unifiedUserId} (已存在)`);
        skippedUsers++;
      }

      // 同步 API Key
      if (!existingApiKeys.has(user.api_key)) {
        try {
          await syncApiKey(user.api_key, user.id, user.key_name);
          console.log(`✅ 同步密钥: ${user.api_key.substring(0, 15)}...`);
          syncedKeys++;
        } catch (error) {
          console.error(`❌ 同步密钥失败: ${user.api_key} - ${error.message}`);
          errors.push({ type: 'api_key', key: user.api_key, error: error.message });
        }
      } else {
        console.log(`⏭️  跳过密钥: ${user.api_key.substring(0, 15)}... (已存在)`);
        skippedKeys++;
      }
    }

    // 输出统计
    console.log('\n' + '='.repeat(50));
    console.log('📊 同步完成统计:');
    console.log('='.repeat(50));
    console.log(`   新同步用户: ${syncedUsers} 个`);
    console.log(`   跳过用户:   ${skippedUsers} 个`);
    console.log(`   新同步密钥: ${syncedKeys} 个`);
    console.log(`   跳过密钥:   ${skippedKeys} 个`);

    if (errors.length > 0) {
      console.log(`\n❌ 错误: ${errors.length} 个`);
      errors.forEach(e => console.log(`   - ${e.type}: ${e.id || e.key} - ${e.error}`));
    } else {
      console.log('\n✅ 全部同步成功！');
    }

  } catch (error) {
    console.error('\n❌ 同步过程出错:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔚 数据库连接已关闭');
  }
}

main();
