# 创作魔方 Content Cube - 前端开发文档

## 📋 项目概述

创作魔方（Content Cube）是一个AI驱动的内容创作平台，集成了视频提取、工作流商店、插件市场等功能，旨在为创作者提供一站式的智能创作工具。

### 项目信息

- **项目名称**: Content Cube Frontend
- **技术栈**: React 19 + TypeScript + Vite + Ant Design 5
- **后端API**: http://localhost:3000/api
- **开发端口**: http://localhost:5173

---

## 🛠 技术栈

### 核心技术
- **React 19.1.1** - UI框架
- **TypeScript 5.9** - 类型系统
- **Vite 7.1** - 构建工具
- **React Router 7.9** - 路由管理

### UI & 样式
- **Ant Design 5.27** - UI组件库
- **@ant-design/icons** - 图标库
- **CSS Modules** - 样式隔离

### 状态管理 & 请求
- **Zustand 5.0** - 轻量级状态管理
- **Axios 1.12** - HTTP客户端

---

## 📂 目录结构

```
frontend/
├── public/                     # 静态资源
│   └── vite.svg
│
├── src/
│   ├── api/                    # API接口层
│   │   ├── request.ts          # Axios封装 & 拦截器
│   │   ├── auth.ts             # 用户认证API
│   │   ├── video.ts            # 视频提取API
│   │   ├── workflow.ts         # 工作流商店API
│   │   └── plugin.ts           # 插件市场API
│   │
│   ├── assets/                 # 资源文件
│   │   ├── images/             # 图片资源
│   │   └── styles/             # 全局样式
│   │       ├── variables.css   # CSS变量
│   │       └── global.css      # 全局样式
│   │
│   ├── components/             # 公共组件
│   │   ├── layout/             # 布局组件
│   │   │   ├── Header.tsx              # 顶部导航栏
│   │   │   ├── Sidebar.tsx             # 侧边栏
│   │   │   ├── Footer.tsx              # 页脚
│   │   │   └── MainLayout.tsx          # 主布局容器
│   │   │
│   │   ├── common/             # 通用业务组件
│   │   │   ├── WorkflowCard.tsx        # 工作流卡片
│   │   │   ├── PluginCard.tsx          # 插件卡片
│   │   │   ├── FilterSidebar.tsx       # 筛选侧边栏
│   │   │   ├── SearchBar.tsx           # 搜索栏
│   │   │   ├── PriceTag.tsx            # 价格标签
│   │   │   ├── RatingDisplay.tsx       # 评分展示
│   │   │   ├── EmptyState.tsx          # 空状态
│   │   │   └── LoadingSpinner.tsx      # 加载动画
│   │   │
│   │   └── auth/               # 认证相关组件
│   │       ├── LoginForm.tsx           # 登录表单
│   │       ├── RegisterForm.tsx        # 注册表单
│   │       └── ProtectedRoute.tsx      # 路由守卫
│   │
│   ├── pages/                  # 页面组件
│   │   ├── Home/               # 首页
│   │   │   └── index.tsx
│   │   │
│   │   ├── Auth/               # 认证页面
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   │
│   │   ├── VideoExtract/       # 视频提取
│   │   │   ├── index.tsx               # 视频提取主页
│   │   │   ├── TaskList.tsx            # 任务列表
│   │   │   └── TaskDetail.tsx          # 任务详情
│   │   │
│   │   ├── WorkflowStore/      # 工作流商店
│   │   │   ├── index.tsx               # 商店主页
│   │   │   ├── WorkflowDetail.tsx      # 工作流详情页
│   │   │   ├── MyWorkflows.tsx         # 我的工作流
│   │   │   └── CreateWorkflow.tsx      # 创建工作流
│   │   │
│   │   ├── PluginMarket/       # 插件市场
│   │   │   ├── index.tsx               # 市场主页
│   │   │   ├── PluginDetail.tsx        # 插件详情页
│   │   │   ├── MyPlugins.tsx           # 我的插件
│   │   │   └── CreatePlugin.tsx        # 创建插件
│   │   │
│   │   ├── Creator/            # 创作中心 (预留功能)
│   │   │   ├── index.tsx               # 创作工作台
│   │   │   ├── ProjectList.tsx         # 项目列表
│   │   │   └── ProjectDetail.tsx       # 项目详情
│   │   │
│   │   ├── User/               # 用户中心
│   │   │   ├── Profile.tsx             # 个人资料
│   │   │   ├── Settings.tsx            # 账户设置
│   │   │   ├── ApiKeys.tsx             # API密钥管理
│   │   │   └── Membership.tsx          # 会员中心 (SVIP)
│   │   │
│   │   ├── Admin/              # 管理后台 (预留功能)
│   │   │   ├── Dashboard.tsx           # 仪表盘
│   │   │   ├── WorkflowManage.tsx      # 工作流管理
│   │   │   ├── PluginReview.tsx        # 插件审核
│   │   │   ├── UserManage.tsx          # 用户管理
│   │   │   └── Statistics.tsx          # 统计分析
│   │   │
│   │   └── NotFound/           # 404页面
│   │       └── index.tsx
│   │
│   ├── store/                  # Zustand状态管理
│   │   ├── useAuthStore.ts             # 用户认证状态
│   │   ├── useWorkflowStore.ts         # 工作流状态
│   │   ├── usePluginStore.ts           # 插件状态
│   │   └── useAppStore.ts              # 应用全局状态
│   │
│   ├── hooks/                  # 自定义Hooks
│   │   ├── useAuth.ts                  # 认证相关Hook
│   │   ├── useDebounce.ts              # 防抖Hook
│   │   ├── usePagination.ts            # 分页Hook
│   │   ├── useAsync.ts                 # 异步状态管理
│   │   └── useLocalStorage.ts          # 本地存储Hook
│   │
│   ├── types/                  # TypeScript类型定义
│   │   ├── auth.ts                     # 认证相关类型
│   │   ├── workflow.ts                 # 工作流类型
│   │   ├── plugin.ts                   # 插件类型
│   │   ├── video.ts                    # 视频类型
│   │   ├── user.ts                     # 用户类型
│   │   └── common.ts                   # 通用类型
│   │
│   ├── utils/                  # 工具函数
│   │   ├── storage.ts                  # 本地存储工具
│   │   ├── format.ts                   # 格式化函数
│   │   ├── validators.ts               # 表单验证
│   │   ├── constants.ts                # 常量定义
│   │   └── helpers.ts                  # 辅助函数
│   │
│   ├── router/                 # 路由配置
│   │   └── index.tsx                   # 路由定义
│   │
│   ├── App.tsx                 # 根组件
│   ├── main.tsx                # 应用入口
│   ├── vite-env.d.ts           # Vite类型声明
│   └── index.css               # 全局样式
│
├── .gitignore
├── package.json
├── tsconfig.json               # TypeScript配置
├── tsconfig.node.json
├── vite.config.ts              # Vite配置
├── eslint.config.js            # ESLint配置
└── README.md                   # 本文档
```

---

## 🛣️ 路由规划

### 公开路由 (无需登录)
| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 平台介绍、功能展示 |
| `/login` | 登录页 | 用户登录 |
| `/register` | 注册页 | 用户注册 |
| `/workflows` | 工作流商店 | 浏览工作流 (公开) |
| `/workflows/:id` | 工作流详情 | 查看工作流详情 |
| `/plugins` | 插件市场 | 浏览插件 (公开) |
| `/plugins/:id` | 插件详情 | 查看插件详情 |

### 私有路由 (需要登录)
| 路径 | 页面 | 说明 |
|------|------|------|
| `/video-extract` | 视频提取 | 提取视频功能 |
| `/video-extract/tasks` | 任务列表 | 查看提取任务 |
| `/workflows/my` | 我的工作流 | 用户创建的工作流 |
| `/workflows/create` | 创建工作流 | 创建新工作流 |
| `/plugins/my` | 我的插件 | 已安装的插件 |
| `/plugins/create` | 创建插件 | 提交新插件 |
| `/creator` | 创作中心 | 创作工作台 (预留) |
| `/creator/projects` | 项目列表 | 我的创作项目 (预留) |
| `/user/profile` | 个人资料 | 查看/编辑个人信息 |
| `/user/settings` | 账户设置 | 账户配置 |
| `/user/api-keys` | API密钥 | 管理ALAPI Token |
| `/user/membership` | 会员中心 | SVIP会员管理 |

### 管理员路由 (需要管理员权限)
| 路径 | 页面 | 说明 |
|------|------|------|
| `/admin` | 管理首页 | 管理后台仪表盘 (预留) |
| `/admin/dashboard` | 数据统计 | 平台数据分析 |
| `/admin/workflows` | 工作流管理 | 审核/管理工作流 |
| `/admin/plugins` | 插件审核 | 审核/管理插件 |
| `/admin/users` | 用户管理 | 用户管理 |

---

## 🎨 核心功能模块

### 1. 用户认证模块 (Auth)

**功能：**
- 用户注册（用户名/邮箱/手机号）
- 用户登录（JWT Token）
- Token自动刷新
- 退出登录
- 记住登录状态

**API接口：**
```typescript
POST /api/auth/register        # 注册
POST /api/auth/login           # 登录
GET  /api/auth/me              # 获取当前用户信息
POST /api/auth/logout          # 退出登录
```

**状态管理：**
```typescript
// store/useAuthStore.ts
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
  register: (data) => Promise<void>;
}
```

---

### 2. 视频提取模块 (Video Extract)

**功能：**
- 支持抖音/快手/小红书等平台
- URL解析和视频信息提取
- 提取任务管理
- 任务状态跟踪
- 历史记录查看

**API接口：**
```typescript
POST /api/video/extract             # 提取视频
GET  /api/video/tasks               # 获取任务列表
GET  /api/video/tasks/:id           # 获取任务详情
GET  /api/video/statistics          # 提取统计
```

**页面功能：**
- **提取页面**: 输入URL、一键提取、实时进度
- **任务列表**: 查看历史任务、筛选状态、批量操作

---

### 3. 工作流商店模块 (Workflow Store)

**功能：**
- 工作流浏览（网格/列表视图）
- 多维度筛选（平台/分类/价格）
- 关键词搜索
- 工作流详情展示
- 工作流使用/收藏
- 创建/编辑工作流

**API接口：**
```typescript
GET    /api/workflows              # 获取工作流列表
GET    /api/workflows/:id          # 获取工作流详情
POST   /api/workflows              # 创建工作流
PUT    /api/workflows/:id          # 更新工作流
DELETE /api/workflows/:id          # 删除工作流
POST   /api/workflows/:id/use      # 使用工作流
```

**筛选条件：**
- **平台**: COZE / MAKE / N8N / ComfyUI
- **分类**: video / scraping / image / content / automation / social / analysis / other
- **价格**: 全部 / 免费 / 付费 / SVIP免费
- **排序**: 最新 / 热门 / 评分 / 价格低到高 / 价格高到低

**工作流卡片信息：**
- 封面图
- 名称和描述
- 平台标签
- 价格标签（免费/SVIP/价格）
- 官方认证标识
- 统计数据（浏览/使用/评分）
- 创建者信息

---

### 4. 插件市场模块 (Plugin Market)

**功能：**
- 插件浏览
- 分类筛选
- 插件安装/卸载
- 我的插件管理
- 插件提交审核

**API接口：**
```typescript
GET    /api/plugins                    # 获取插件列表
GET    /api/plugins/:id                # 获取插件详情
POST   /api/plugins                    # 创建插件
PUT    /api/plugins/:id                # 更新插件
DELETE /api/plugins/:id                # 删除插件
POST   /api/plugins/:id/install        # 安装插件
POST   /api/plugins/:id/uninstall      # 卸载插件
GET    /api/plugins/my/installed       # 我的插件
```

**筛选条件：**
- **分类**: video / scraping / image / content / automation / social / analysis / other
- **价格**: 全部 / 免费 / 付费
- **排序**: 最新 / 热门下载 / 评分最高

**插件卡片信息：**
- 图标
- 名称和描述
- 版本号
- 价格标签
- 安装量
- 评分
- 安装状态

---

### 5. 用户中心模块 (User Center)

**功能：**
- 个人资料管理
- 头像上传
- 密码修改
- API密钥管理
- 会员中心（SVIP）
- 使用统计

**页面：**
- **个人资料**: 基本信息编辑
- **账户设置**: 安全设置、通知设置
- **API密钥**: ALAPI Token管理、主备Token切换
- **会员中心**: SVIP特权、升级入口、有效期

---

### 6. 创作中心 (预留功能)

**规划功能：**
- 创作工作台
- 使用工作流进行创作
- 项目管理
- 文件管理
- 创作历史

**预留入口：**
- 顶部导航栏"创作中心"
- 工作流详情页"开始创作"按钮
- 首页"立即创作"按钮

---

### 7. 管理后台 (预留功能)

**规划功能：**
- 数据统计仪表盘
- 工作流审核管理
- 插件审核管理
- 用户管理
- 系统配置

**权限控制：**
- 只有管理员可访问
- 路由守卫 + 权限验证

---

## 🎯 状态管理设计

### useAuthStore (认证状态)

```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

### useWorkflowStore (工作流状态)

```typescript
interface WorkflowStore {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  filters: WorkflowFilters;
  loading: boolean;
  fetchWorkflows: (params?: QueryParams) => Promise<void>;
  fetchWorkflowById: (id: number) => Promise<void>;
  setFilters: (filters: Partial<WorkflowFilters>) => void;
  useWorkflow: (id: number) => Promise<void>;
}
```

### usePluginStore (插件状态)

```typescript
interface PluginStore {
  plugins: Plugin[];
  installedPlugins: Plugin[];
  currentPlugin: Plugin | null;
  loading: boolean;
  fetchPlugins: (params?: QueryParams) => Promise<void>;
  fetchMyPlugins: () => Promise<void>;
  installPlugin: (id: number) => Promise<void>;
  uninstallPlugin: (id: number) => Promise<void>;
}
```

### useAppStore (全局状态)

```typescript
interface AppStore {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}
```

---

## 🔧 开发规范

### 命名规范

**文件命名：**
- 组件文件：PascalCase (例: `WorkflowCard.tsx`)
- 工具函数文件：camelCase (例: `format.ts`)
- 样式文件：kebab-case (例: `workflow-card.module.css`)

**变量命名：**
- 组件：PascalCase (例: `const WorkflowCard = () => {}`)
- 函数：camelCase (例: `const fetchWorkflows = () => {}`)
- 常量：UPPER_SNAKE_CASE (例: `const API_BASE_URL = ''`)

### 代码风格

**React组件结构：**
```typescript
import React from 'react';
import type { FC } from 'react';

// 类型定义
interface Props {
  title: string;
  count?: number;
}

// 组件实现
const MyComponent: FC<Props> = ({ title, count = 0 }) => {
  // Hooks
  const [state, setState] = React.useState(0);

  // 事件处理
  const handleClick = () => {
    // ...
  };

  // 渲染
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
    </div>
  );
};

export default MyComponent;
```

**API调用规范：**
```typescript
// api/workflow.ts
import request from './request';
import type { Workflow, WorkflowQueryParams } from '@/types/workflow';

export const workflowApi = {
  // 获取列表
  getList: (params?: WorkflowQueryParams) => {
    return request.get<{ workflows: Workflow[]; pagination: Pagination }>(
      '/workflows',
      { params }
    );
  },

  // 获取详情
  getById: (id: number) => {
    return request.get<Workflow>(`/workflows/${id}`);
  },

  // 创建
  create: (data: CreateWorkflowData) => {
    return request.post<Workflow>('/workflows', data);
  }
};
```

### TypeScript规范

1. **优先使用interface而非type**（除非需要联合类型）
2. **为所有Props定义类型**
3. **避免使用any**，使用unknown或具体类型
4. **使用泛型提高代码复用性**

---

## 📦 依赖包说明

### 生产依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | ^19.1.1 | React核心库 |
| react-dom | ^19.1.1 | React DOM操作 |
| react-router-dom | ^7.9.4 | 路由管理 |
| antd | ^5.27.6 | UI组件库 |
| @ant-design/icons | ^6.1.0 | Ant Design图标 |
| axios | ^1.12.2 | HTTP请求库 |
| zustand | ^5.0.8 | 状态管理 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| vite | ^7.1.7 | 构建工具 |
| typescript | ~5.9.3 | TypeScript编译器 |
| @vitejs/plugin-react | ^5.0.4 | Vite React插件 |
| eslint | ^9.36.0 | 代码检查 |
| @types/react | ^19.1.16 | React类型定义 |

---

## 🚀 开发指南

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问: http://localhost:5173

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

---

## 🌐 环境配置

### 开发环境 (.env.development)

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=创作魔方 Content Cube
VITE_UPLOAD_MAX_SIZE=10485760
```

### 生产环境 (.env.production)

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_APP_TITLE=创作魔方 Content Cube
VITE_UPLOAD_MAX_SIZE=10485760
```

---

## 📝 待实现功能清单

### Phase 1: 基础架构 ✅
- [x] 项目初始化
- [ ] 目录结构搭建
- [ ] 路由配置
- [ ] API封装
- [ ] 布局组件
- [ ] 主题配置

### Phase 2: 认证系统
- [ ] 登录页面
- [ ] 注册页面
- [ ] Token管理
- [ ] 路由守卫
- [ ] 用户状态管理

### Phase 3: 核心功能
- [ ] 视频提取页面
- [ ] 工作流商店页面
- [ ] 工作流详情页
- [ ] 插件市场页面
- [ ] 插件详情页
- [ ] 用户中心

### Phase 4: 高级功能
- [ ] 创作中心（占位）
- [ ] 管理后台（占位）
- [ ] 通知系统
- [ ] 文件上传
- [ ] 搜索优化

### Phase 5: 优化 & 部署
- [ ] 性能优化
- [ ] SEO优化
- [ ] 错误处理
- [ ] 单元测试
- [ ] 部署配置

---

## 🐛 常见问题

### 1. Vite启动失败
**问题**: 端口占用
**解决**: 修改vite.config.ts中的端口配置

### 2. API请求CORS错误
**问题**: 跨域请求被拦截
**解决**: 确保后端已配置CORS，允许前端域名

### 3. Ant Design样式不生效
**问题**: CSS导入顺序问题
**解决**: 确保在main.tsx中先导入Ant Design样式

---

## 📚 参考资源

- [React官方文档](https://react.dev/)
- [Ant Design官方文档](https://ant.design/)
- [React Router文档](https://reactrouter.com/)
- [Zustand文档](https://github.com/pmndrs/zustand)
- [Vite文档](https://vitejs.dev/)

---

## 👥 开发团队

如有问题，请联系开发团队。

---

## 📄 版本历史

### v0.1.0 (2024-10-27)
- 项目初始化
- 基础架构设计
- 技术栈确定

---

最后更新: 2024-10-27
