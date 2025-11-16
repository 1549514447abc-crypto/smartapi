# SmartAPI - 创作魔方Content Cube

智能API管理平台，提供视频文案提取、工作流商店、课程系统等功能。

## 技术栈

### 后端
- Node.js + Express + TypeScript
- MySQL + Sequelize ORM
- JWT 身份认证

### 前端
- React + TypeScript
- Vite
- Ant Design
- Zustand 状态管理

## 分支说明

- `main` - 生产环境分支（部署到服务器）
- `dev` - 开发/测试分支（本地开发）

## 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/1549514447abc-crypto/smartapi.git
cd smartapi
```

### 2. 后端设置

```bash
cd backend
npm install

# 复制环境变量模板并配置
cp .env.example .env
# 编辑 .env 文件，配置数据库等信息

# 启动开发服务器
npm run dev
```

### 3. 前端设置

```bash
cd frontend
npm install

# 复制环境变量模板并配置
cp .env.example .env.development

# 启动开发服务器
npm run dev
```

### 4. 数据库设置

导入数据库文件：
```bash
mysql -u root -p smartapi_dev < smartapi_dev.sql
```

## 生产部署

### 方式1：使用部署脚本（推荐）

```bash
# 部署到生产服务器
npm run deploy:prod
```

### 方式2：手动部署

1. 合并 dev 到 main：
```bash
git checkout main
git merge dev
git push origin main
```

2. 在服务器上拉取最新代码：
```bash
ssh root@your-server "cd /www/smartapi && git pull origin main"
```

3. 重启服务：
```bash
ssh root@your-server "pm2 restart smartapi-backend"
```

## 常用命令

### 开发流程

```bash
# 1. 在 dev 分支开发
git checkout dev
git add .
git commit -m "feat: 添加新功能"
git push origin dev

# 2. 测试通过后，合并到 main
git checkout main
git merge dev
git push origin main

# 3. 部署到生产
npm run deploy:prod
```

## 项目结构

```
smartapi/
├── backend/              # 后端代码
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # 路由
│   │   ├── middleware/   # 中间件
│   │   └── utils/        # 工具函数
│   └── package.json
├── frontend/             # 前端代码
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   ├── store/        # 状态管理
│   │   └── types/        # 类型定义
│   └── package.json
└── README.md
```

## 环境变量说明

### 后端 (.env)
- `PORT` - 服务器端口
- `DB_HOST` - 数据库地址
- `DB_NAME` - 数据库名称
- `JWT_SECRET` - JWT 密钥

### 前端 (.env.development / .env.production)
- `VITE_API_BASE_URL` - API 基础路径

## License

Private
