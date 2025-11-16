# Repository Guidelines

## 项目结构与模块职责
- `backend/` 是 TypeScript + Express 后端，核心层按 `config/`、`models/`、`services/`、`controllers/`、`routes/`、`middleware/`、`utils/` 分层；新增特性时保持同样的职责划分。
- `frontend/` 为 Vite + React 前端。页面与通用组件在 `src/`，静态资源放在 `public/`，构建配置集中在 `vite.config.ts` 与 `tsconfig*.json`。
- `main.py` 是 FastAPI 原型，用于探索 Python 方案或调试 API；如需扩展请单独记录依赖。
- 仓库根目录下的 `database-init.sql`、`insert-test-data.sql`、`update-workflows-table.sql` 等脚本记录数据库初始化与升级流程，新的迁移脚本请与之并列存放。

## 构建、测试与开发命令
- 后端：首次进入执行 `cd backend && npm install`。日常开发用 `npm run dev` 热更新，产出构建物用 `npm run build`，部署前验证用 `npm start`，单元测试通过 `npm test` 运行 Jest。
- 前端：在 `frontend/` 目录执行 `npm install`，本地预览用 `npm run dev`，生成产物用 `npm run build`，代码质量检查用 `npm run lint`。
- Python 原型：运行 `uvicorn main:app --reload` 可在 8000 端口启动实验性服务。

## 代码风格与命名规范
- TypeScript 与 React 文件采用两个空格缩进、单引号字符串、导出函数需要显式返回类型；导入顺序遵循「第三方库 → 内部模块」，配套工具放在对应层目录。
- 组件与类使用 `PascalCase`，函数、Hooks、实例使用 `camelCase`，全局常量使用 `UPPER_SNAKE_CASE`。
- 前端使用 ESLint 规则（`npm run lint`），后端通过 TypeScript 编译与默认 ESLint 提醒把关；提交前清理所有警告。
- Python 代码遵循 PEP 8 与类型注解习惯，保持命名清晰。

## 测试准则
- 后端单测使用 Jest（`npm test`）。测试文件放在 `backend/src/__tests__` 或与被测模块同目录，后缀 `.spec.ts`，必要时模拟 Sequelize、ALAPI 等外部依赖。
- 提交前记录执行过的命令，重点覆盖控制器与服务层，新增模块建议覆盖率不低于 75%。
- 前端目前主要依赖 ESLint；若引入复杂交互，请添加 React Testing Library + Vitest 测试，并在 PR 中说明手动验证步骤。

## 提交与 PR 规范
- 推荐遵循 Conventional Commits（如 `feat:`、`fix:`、`docs:`），方便生成变更日志。
- 每个 PR 需提供简要概述、关联的任务或文档链接、执行过的命令/测试，并在涉及界面或接口变化时附上截图或请求示例。
- 如有数据库表结构或环境变量调整，请在描述中指出对应 SQL 脚本与配置项，便于上线同步。

## 环境与数据提示
- 将数据库、JWT 等敏感配置写入后端目录下的 `.env`，严禁提交到版本库。
- 初始化数据库请执行 `database-init.sql`，需要示例数据时运行 `insert-test-data.sql`；新增迁移脚本建议按时间戳命名，并标注回滚方案。
