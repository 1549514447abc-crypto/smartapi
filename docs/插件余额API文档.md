# 插件余额 API

## 接口地址

```
https://api.contentcube.cn/api/plugin
```

---

## 认证

所有请求必须在 Header 中携带服务商密钥：

```
X-Plugin-Secret: {服务商密钥}
```

**服务商密钥配置（服务端）：**

- 文件位置：`/www/smartapi/plugin-secret.txt`
- 直接编辑文件内容即可修改密钥
- 修改后立即生效，无需重启服务

---

## 1. 查询余额

```
GET /api/plugin/balance?api_key={api_key}
```

**请求示例**

```bash
curl -X GET "https://api.contentcube.cn/api/plugin/balance?api_key=sk_xxx" \
  -H "X-Plugin-Secret: 你的服务商密钥"
```

**响应**

```json
{
  "success": true,
  "data": {
    "balance": 99.50
  }
}
```

---

## 2. 扣减余额

```
POST /api/plugin/balance/deduct
Content-Type: application/json
X-Plugin-Secret: {服务商密钥}
```

**请求体**

```json
{
  "api_key": "sk_xxx",
  "amount": 0.5,
  "service_name": "插件名称",
  "description": "使用说明"
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| api_key | 是 | 用户 API Key |
| amount | 是 | 扣减金额 |
| service_name | 否 | 服务名称 |
| description | 否 | 扣费描述 |

**请求示例**

```bash
curl -X POST "https://api.contentcube.cn/api/plugin/balance/deduct" \
  -H "Content-Type: application/json" \
  -H "X-Plugin-Secret: 你的服务商密钥" \
  -d '{"api_key":"sk_xxx","amount":0.5,"service_name":"AI助手","description":"生成内容"}'
```

**响应**

```json
{
  "success": true,
  "data": {
    "balance": 99.00,
    "deducted": 0.5
  }
}
```

---

## 错误响应

```json
{ "success": false, "message": "缺少服务商密钥" }
{ "success": false, "message": "服务商密钥无效" }
{ "success": false, "message": "无效的 API Key" }
{ "success": false, "message": "余额不足", "data": { "balance": 0.30 } }
```

---

## 获取 API Key

用户登录 https://contentcube.cn → 个人中心 → API Key
