# SmartAPI Backend - Content Cube

后端服务 - 提供用户认证、视频提取、工作流商店、插件市场等功能

## 技术栈

- **Node.js** v18+
- **Express** v4.18 - Web框架
- **TypeScript** v5.3 - 类型安全
- **MySQL** v8.0 - 数据库
- **Sequelize** v6 - ORM
- **JWT** - 用户认证
- **bcryptjs** - 密码加密

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   └── database.ts  # 数据库连接
│   ├── models/          # Sequelize模型
│   │   └── User.ts      # 用户模型
│   ├── controllers/     # 控制器
│   │   └── authController.ts
│   ├── routes/          # 路由
│   │   ├── index.ts
│   │   └── authRoutes.ts
│   ├── middleware/      # 中间件
│   │   └── auth.ts      # JWT认证
│   ├── utils/           # 工具函数
│   │   ├── jwt.ts       # JWT工具
│   │   ├── password.ts  # 密码处理
│   │   ├── validation.ts # 参数验证
│   │   └── response.ts  # 响应格式化
│   └── index.ts         # 入口文件
├── .env                 # 环境变量
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

确保 `.env` 文件已正确配置：

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smartapi_dev
DB_USER=root
DB_PASSWORD=119689
JWT_SECRET=smartapi_jwt_secret_key_2024_change_in_production
JWT_EXPIRES_IN=7d
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API接口文档

### 基础端点

- **GET /** - 服务器信息
- **GET /api/health** - 健康检查

### 用户认证 (`/api/auth`)

#### 1. 用户注册

**POST /api/auth/register**

请求体：
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "phone": "13800138000",
  "password": "password123",
  "nickname": "Test User"
}
```

响应：
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "Test User",
      ...
    }
  }
}
```

#### 2. 用户登录

**POST /api/auth/login**

请求体：
```json
{
  "username": "testuser",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

#### 3. 获取当前用户信息

**GET /api/auth/me**

请求头：
```
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "username": "testuser",
    ...
  }
}
```

## 测试用户

数据库已预置测试用户：

1. **管理员账户**
   - 用户名: `admin`
   - 密码: `password123`
   - 类型: admin

2. **普通用户账户**
   - 用户名: `testuser`
   - 密码: `password123`
   - 类型: normal

## 开发进度

- [x] 用户认证系统
  - [x] 用户注册
  - [x] 用户登录
  - [x] JWT认证中间件
  - [x] 获取当前用户信息
- [ ] 视频提取功能 (ALAPI集成)
- [ ] 工作流商店
- [ ] 插件市场

## 许可证

MIT
