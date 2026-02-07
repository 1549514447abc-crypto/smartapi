# 余额双向同步 API 文档

## 概述

本文档描述创作魔方平台与 Supabase 插件系统之间的余额双向同步机制。

**同步架构：**

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │  充值后   │                 │  同步     │                 │
│   用户充值      │ ───────> │   创作魔方网站   │ ───────> │    Supabase     │
│                 │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
                                     ▲                            │
                                     │ 调用API                    │ 插件调用
                                     │ 扣费+同步                  │
                                     │                            ▼
                             ┌─────────────────┐          ┌─────────────────┐
                             │                 │ <─────── │                 │
                             │   网站更新余额   │          │   Supabase插件  │
                             │                 │          │                 │
                             └─────────────────┘          └─────────────────┘
```

---

## 一、插件调用网站 API（Supabase → 网站）

### Base URL

```
https://api.contentcube.cn/api/plugin
```

### 限流规则

每分钟最多 60 次请求

---

### 1.1 查询余额

**请求**

```
GET /api/plugin/balance?api_key={api_key}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| api_key | string | 是 | 用户的 API Key |

**请求示例**

```bash
curl -X GET "https://api.contentcube.cn/api/plugin/balance?api_key=sk_xxxxxxxxxxxxxxxx"
```

**JavaScript 示例**

```javascript
async function getBalance(apiKey) {
  const response = await fetch(
    `https://api.contentcube.cn/api/plugin/balance?api_key=${apiKey}`
  );
  const result = await response.json();

  if (result.success) {
    return result.data.balance;
  } else {
    throw new Error(result.message);
  }
}
```

**成功响应**

```json
{
  "success": true,
  "data": {
    "balance": 99.50
  }
}
```

**错误响应**

| 错误信息 | HTTP状态码 | 说明 |
|----------|------------|------|
| 缺少 api_key 参数 | 400 | 请求未携带 api_key |
| 无效的 API Key | 401 | API Key 不存在或已禁用 |

---

### 1.2 扣减余额

**请求**

```
POST /api/plugin/balance/deduct
Content-Type: application/json
```

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| api_key | string | 是 | 用户的 API Key |
| amount | number | 是 | 扣减金额（必须大于0） |
| service_name | string | 否 | 服务名称，用于消费记录展示 |
| description | string | 否 | 扣费描述，详细说明扣费原因 |

**请求示例**

```bash
curl -X POST "https://api.contentcube.cn/api/plugin/balance/deduct" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_xxxxxxxxxxxxxxxx",
    "amount": 0.5,
    "service_name": "AI写作助手",
    "description": "生成文章1篇"
  }'
```

**JavaScript 示例**

```javascript
async function deductBalance(apiKey, amount, serviceName, description) {
  const response = await fetch('https://api.contentcube.cn/api/plugin/balance/deduct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      amount: amount,
      service_name: serviceName,
      description: description
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log(`扣费成功，剩余余额: ${result.data.balance}`);
    return result.data;
  } else {
    throw new Error(result.message);
  }
}

// 使用示例
await deductBalance('sk_xxx', 0.5, 'AI助手', '生成内容1次');
```

**成功响应**

```json
{
  "success": true,
  "message": "扣费成功",
  "data": {
    "balance": 99.00,
    "deducted": 0.5
  }
}
```

**错误响应**

| 错误信息 | HTTP状态码 | 说明 |
|----------|------------|------|
| 缺少 api_key 参数 | 400 | 请求未携带 api_key |
| 金额必须是大于0的数字 | 400 | amount 参数无效 |
| 无效的 API Key | 401 | API Key 不存在或已禁用 |
| 余额不足 | 400 | 用户余额小于扣减金额 |

**余额不足响应示例**

```json
{
  "success": false,
  "message": "余额不足",
  "data": {
    "balance": 0.30
  }
}
```

---

## 二、网站同步到 Supabase（网站 → Supabase）

网站在以下场景会自动同步数据到 Supabase：

| 场景 | 同步内容 |
|------|----------|
| 用户注册 | 创建 unified_users 记录 |
| 用户充值成功 | 更新 balance 字段 |
| 插件扣费成功 | 更新 balance 字段 |
| 创建 API Key | 创建 unified_api_keys 记录 |
| 重置 API Key | 删除旧记录，创建新记录 |

### Supabase 表结构

**unified_users 表**

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | string | 用户唯一标识，格式: `u_{网站用户ID}` |
| balance | decimal | 用户余额 |
| total_recharged | decimal | 累计充值 |
| total_consumed | decimal | 累计消费 |
| status | string | 状态: active/inactive |

**unified_api_keys 表**

| 字段 | 类型 | 说明 |
|------|------|------|
| api_key | string | API Key |
| user_id | string | 关联用户ID，格式: `u_{网站用户ID}` |
| key_name | string | 密钥名称 |
| status | string | 状态: active/inactive |

### 配置说明

网站通过 `api_configs` 表配置 Supabase 连接：

| config_key | 说明 |
|------------|------|
| enabled | 是否启用同步（true/false） |
| url | Supabase 项目 URL |
| key | Supabase anon/service key |

---

## 三、完整调用流程示例

### 场景：插件扣费

```javascript
// Supabase Edge Function 示例

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { api_key, feature } = await req.json()

  // 1. 先查询余额
  const balanceRes = await fetch(
    `https://api.contentcube.cn/api/plugin/balance?api_key=${api_key}`
  )
  const balanceData = await balanceRes.json()

  if (!balanceData.success) {
    return new Response(JSON.stringify({ error: balanceData.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. 检查余额是否足够
  const cost = 0.5 // 假设每次调用0.5元
  if (balanceData.data.balance < cost) {
    return new Response(JSON.stringify({
      error: '余额不足，请充值',
      balance: balanceData.data.balance
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 3. 执行业务逻辑...
  const result = await doSomething(feature)

  // 4. 扣减余额
  const deductRes = await fetch('https://api.contentcube.cn/api/plugin/balance/deduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: api_key,
      amount: cost,
      service_name: 'AI助手',
      description: `使用${feature}功能`
    })
  })

  const deductData = await deductRes.json()

  if (!deductData.success) {
    // 扣费失败，但业务已执行，记录日志
    console.error('扣费失败:', deductData.message)
  }

  // 5. 返回结果
  return new Response(JSON.stringify({
    success: true,
    data: result,
    balance: deductData.data?.balance
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## 四、错误码汇总

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | API Key 无效 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

---

## 五、获取 API Key

用户可在创作魔方平台获取 API Key：

1. 访问 https://contentcube.cn
2. 登录账号
3. 进入「个人中心」
4. 点击「API Key」查看或重新生成

---

## 六、联系支持

- 微信公众号：创作魔方ContentCube
- 邮箱：support@contentcube.cn
