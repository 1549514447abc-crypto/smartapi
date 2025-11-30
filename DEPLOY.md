# SmartAPI 部署文档

## 服务器信息

- **服务器 IP**: 119.29.37.208
- **前端路径**: `/www/smartapi-web/` (宿主机和 Docker 容器内)
- **后端路径**: `/www/smartapi/`
- **后端端口**: 3000 (PM2 管理)
- **Nginx 容器**: docker-nginx-1

## 目录结构

```
服务器:
/www/
├── smartapi/              # 后端代码
│   ├── src/
│   ├── dist/
│   ├── node_modules/
│   └── package.json
└── smartapi-web/          # 前端静态文件 (需同步到 Docker)
    ├── index.html
    ├── vite.svg
    └── assets/
        ├── index-xxx.js
        └── index-xxx.css
```

## 关键配置

### 1. 前端环境变量

**文件**: `frontend/.env.production`

```env
# 生产环境配置
VITE_API_BASE_URL=/smartapi/api
```

**注意**: API 路径必须是 `/smartapi/api`，Nginx 会将其代理到后端的 `/api/` 路径。

### 2. Vite 构建配置

**文件**: `frontend/vite.config.ts`

```typescript
export default defineConfig({
  base: '/smartapi/',  // 重要：设置基础路径
  // ...
})
```

### 3. Nginx 配置

**位置**: Docker 容器内 `/etc/nginx/conf.d/default.conf`

需要添加以下配置到 server 块中：

```nginx
# SmartAPI 重定向 /smartapi 到 /smartapi/
location = /smartapi {
    return 301 /smartapi/;
}

# SmartAPI 前端静态文件
location /smartapi/ {
    alias /www/smartapi-web/;
    index index.html;
    try_files $uri $uri/ /smartapi/index.html;
}

# SmartAPI 后端 API 代理
location /smartapi/api/ {
    proxy_pass http://172.17.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

**重要说明**:
- `location = /smartapi`: 精确匹配，重定向无斜杠的请求
- `alias /www/smartapi-web/`: 前端文件目录
- `proxy_pass http://172.17.0.1:3000/api/`: 末尾的 `/api/` 很重要，用于路径重写

## 部署步骤

### 方式一：使用部署脚本 (推荐)

```bash
# 在项目根目录执行
./deploy.sh
```

### 方式二：手动部署

#### 1. 构建前端

```bash
cd frontend
npm run build
```

#### 2. 上传前端文件

```bash
# 上传到服务器
scp -r frontend/dist/* root@119.29.37.208:/www/smartapi-web/

# 同步到 Docker 容器
ssh root@119.29.37.208 "docker cp /www/smartapi-web/. docker-nginx-1:/www/smartapi-web/"
```

#### 3. 上传后端代码

```bash
# 打包并上传
cd backend
tar -czf - --exclude=node_modules --exclude=dist . | ssh root@119.29.37.208 "cd /www/smartapi && tar -xzf -"

# 安装依赖并构建
ssh root@119.29.37.208 "cd /www/smartapi && npm install && npm run build"

# 重启服务
ssh root@119.29.37.208 "pm2 restart smartapi-backend"
```

#### 4. 更新 Nginx 配置 (如需要)

```bash
# 上传配置
scp nginx-default.conf root@119.29.37.208:/tmp/default.conf

# 应用配置
ssh root@119.29.37.208 "docker cp /tmp/default.conf docker-nginx-1:/etc/nginx/conf.d/default.conf"

# 测试并重载
ssh root@119.29.37.208 "docker exec docker-nginx-1 nginx -t && docker exec docker-nginx-1 nginx -s reload"
```

## 常见问题

### 1. 访问 /smartapi 返回 404

**原因**: 缺少重定向配置，/smartapi (无斜杠) 被其他 location 匹配

**解决**: 确保 Nginx 配置中有 `location = /smartapi` 重定向规则

### 2. API 请求返回 404 (Endpoint not found)

**原因**: Nginx 代理路径配置错误

**检查**:
- 前端 `.env.production` 中 `VITE_API_BASE_URL=/smartapi/api`
- Nginx 配置 `proxy_pass http://172.17.0.1:3000/api/;` (注意末尾的 `/api/`)

### 3. 页面加载但资源 404

**原因**: Vite base 路径未正确配置

**检查**: `vite.config.ts` 中 `base: '/smartapi/'`

### 4. 前端更新后页面无变化

**原因**: 文件未同步到 Docker 容器

**解决**:
```bash
ssh root@119.29.37.208 "docker cp /www/smartapi-web/. docker-nginx-1:/www/smartapi-web/"
```

### 5. 后端服务未运行

**检查**:
```bash
ssh root@119.29.37.208 "pm2 status"
```

**重启**:
```bash
ssh root@119.29.37.208 "pm2 restart smartapi-backend"
```

## 验证部署

```bash
# 测试前端
curl -I "http://119.29.37.208/smartapi/"
# 应返回 200 OK

# 测试 API
curl "http://119.29.37.208/smartapi/api/plugin-categories"
# 应返回 JSON 数据

# 测试重定向
curl -I "http://119.29.37.208/smartapi"
# 应返回 301 Moved Permanently, Location: /smartapi/
```

## 日志查看

```bash
# 后端日志
ssh root@119.29.37.208 "pm2 logs smartapi-backend"

# Nginx 错误日志
ssh root@119.29.37.208 "docker exec docker-nginx-1 tail -50 /var/log/nginx/error.log"

# Nginx 访问日志
ssh root@119.29.37.208 "docker exec docker-nginx-1 tail -50 /var/log/nginx/access.log"
```

## 备份 Nginx 配置

每次修改前建议备份：

```bash
ssh root@119.29.37.208 "docker exec docker-nginx-1 cat /etc/nginx/conf.d/default.conf" > nginx-backup-$(date +%Y%m%d).conf
```
