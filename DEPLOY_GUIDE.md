# 部署指南

## 🎯 快速开始

### 完整发布流程（三步走）

```bash
# Step 1: 开发测试（dev 分支）
git checkout dev
git add .
git commit -m "feat: 新功能"
git push origin dev

# Step 2: 发布到生产分支
bash release.sh

# Step 3: 部署到服务器
bash deploy.sh
```

---

## 📚 详细说明

### 1. 开发阶段（dev 分支）

在 `dev` 分支进行所有开发和测试工作：

```bash
# 切换到 dev 分支
git checkout dev
git pull origin dev

# 开发代码...

# 如果需要修改数据库结构
bash create-migration.sh "add_comments_table"
# 编辑 database/migrations/20241117_120000_add_comments_table.sql
# 在本地测试迁移
mysql -u root -p smartapi_dev < database/migrations/20241117_120000_add_comments_table.sql

# 提交代码
git add .
git commit -m "feat: 添加评论功能"
git push origin dev
```

### 2. 发布阶段（main 分支）

当 dev 分支测试通过后，使用 `release.sh` 发布到 main 分支：

```bash
bash release.sh
```

**脚本执行流程：**
1. ✅ 检查工作区状态（确保无未提交修改）
2. ✅ 更新 dev 分支（git pull origin dev）
3. ✅ 更新 main 分支（git pull origin main）
4. ✅ 合并 dev 到 main（git merge dev）
5. ✅ 推送到远程仓库（git push origin main）
6. ✅ 切换回 dev 分支

**如果遇到合并冲突：**
```bash
# 脚本会提示冲突，手动解决后：
git add .
git commit
git push origin main
```

### 3. 部署阶段（生产服务器）

使用 `deploy.sh` 将 main 分支代码部署到生产服务器：

```bash
bash deploy.sh
```

**脚本执行流程：**

#### [0/6] 检查 Git 状态
- 检查当前分支（建议在 main 分支）
- 如果不在 main 分支会提示确认

#### [1/6] 构建前端
```bash
cd frontend
npm run build
```
- 使用 Vite 构建 React 应用
- 生成优化后的静态文件到 `frontend/dist/`

#### [2/6] 上传后端代码
```bash
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'dist' \
  backend/ root@119.29.37.208:/www/smartapi/
```
- 使用 rsync 增量上传
- 排除 node_modules、.env、dist

#### [3/6] 上传前端文件
```bash
ssh root@119.29.37.208 "rm -rf /www/smartapi-web/*"
scp -r frontend/dist/* root@119.29.37.208:/www/smartapi-web/
```
- 清空旧的静态文件
- 上传新的构建文件

#### [4/6] 上传数据库迁移文件
```bash
scp database/migrations/*.sql root@119.29.37.208:/www/smartapi/database/migrations/
```
- 上传所有 SQL 迁移文件

#### [5/6] 执行数据库迁移
```bash
for migration in $(ls *.sql | sort); do
    mysql -u root -p119689Abc. smartapi_dev < "$migration"
done
```
- 按文件名顺序执行所有迁移
- 如果某个迁移已执行过会跳过（使用 IF NOT EXISTS）

#### [6/6] 重启服务
```bash
# 安装依赖
npm install --production

# 构建 TypeScript
npm run build

# 重启 PM2 服务
pm2 restart smartapi-backend

# 更新 Docker Nginx
docker cp /www/smartapi-web docker-nginx-1:/www/
docker exec docker-nginx-1 nginx -s reload
```

---

## 🗄️ 数据库迁移

### 创建迁移

```bash
# 使用脚本创建（推荐）
bash create-migration.sh "add_comments_table"

# 会生成文件：
# database/migrations/20241117_120000_add_comments_table.sql
```

### 编写迁移 SQL

```sql
-- database/migrations/20241117_120000_add_comments_table.sql

-- ==========================================
-- 迁移：add_comments_table
-- 创建时间：2024-11-17 12:00:00
-- 描述：为课程添加评论功能
-- ==========================================

CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `rating` INT DEFAULT 5,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  INDEX `idx_course_id` (`course_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 测试迁移

```bash
# 在本地数据库测试
mysql -u root -p smartapi_dev < database/migrations/20241117_120000_add_comments_table.sql

# 检查是否成功
mysql -u root -p smartapi_dev -e "SHOW TABLES;"
mysql -u root -p smartapi_dev -e "DESCRIBE comments;"
```

### 提交迁移

```bash
git add database/migrations/20241117_120000_add_comments_table.sql
git commit -m "feat: 添加课程评论表"
git push origin dev
```

### 部署时自动执行

执行 `bash deploy.sh` 时会自动执行所有迁移文件。

---

## ⚙️ 服务器配置

### 服务器信息

- **IP**: 119.29.37.208
- **用户**: root
- **密码**: 119689Abc.

### 目录结构

```
/www/
├── smartapi/              # 后端代码目录
│   ├── src/
│   ├── dist/              # TypeScript 编译输出
│   ├── node_modules/
│   ├── .env               # 生产环境变量
│   ├── package.json
│   └── database/
│       └── migrations/    # 数据库迁移文件
└── smartapi-web/          # 前端静态文件目录
    ├── index.html
    ├── assets/
    └── ...
```

### Docker Nginx 配置

```nginx
# 前端静态文件
location /smartapi/ {
    alias /www/smartapi-web/;
    index index.html;
    try_files $uri $uri/ /smartapi/index.html;
}

# 后端 API
location /smartapi-api/ {
    proxy_pass http://172.17.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### PM2 进程管理

```bash
# 查看服务状态
ssh root@119.29.37.208 "pm2 status"

# 查看日志
ssh root@119.29.37.208 "pm2 logs smartapi-backend"

# 重启服务
ssh root@119.29.37.208 "pm2 restart smartapi-backend"

# 停止服务
ssh root@119.29.37.208 "pm2 stop smartapi-backend"
```

### 数据库

- **主机**: localhost
- **端口**: 3306
- **数据库名**: smartapi_dev
- **用户**: root
- **密码**: 119689Abc.

---

## 🔍 故障排查

### 部署失败

#### 1. 前端构建失败

```bash
# 检查本地是否能构建成功
cd frontend
npm install
npm run build

# 查看错误信息
```

#### 2. 后端上传失败

```bash
# 检查 SSH 连接
ssh root@119.29.37.208 "echo 连接成功"

# 手动上传测试
scp backend/package.json root@119.29.37.208:/www/smartapi/
```

#### 3. 数据库迁移失败

```bash
# 登录服务器检查
ssh root@119.29.37.208

# 查看迁移文件
ls -la /www/smartapi/database/migrations/

# 手动执行迁移
cd /www/smartapi/database/migrations/
mysql -u root -p smartapi_dev < 20241117_120000_add_comments_table.sql

# 查看错误信息
```

#### 4. 服务启动失败

```bash
# 登录服务器
ssh root@119.29.37.208

# 查看 PM2 日志
pm2 logs smartapi-backend --lines 100

# 查看错误日志
cat /www/smartapi/logs/error.log

# 手动启动测试
cd /www/smartapi
npm run build
node dist/index.js
```

### 服务运行异常

#### API 返回 500 错误

```bash
# 查看后端日志
ssh root@119.29.37.208 "pm2 logs smartapi-backend --lines 50"

# 检查数据库连接
ssh root@119.29.37.208 "mysql -u root -p -e 'SHOW DATABASES;'"

# 检查环境变量
ssh root@119.29.37.208 "cat /www/smartapi/.env"
```

#### 前端白屏

```bash
# 检查静态文件是否存在
ssh root@119.29.37.208 "ls -la /www/smartapi-web/"

# 检查 Docker Nginx
ssh root@119.29.37.208 "docker exec docker-nginx-1 ls -la /www/smartapi-web/"

# 查看 Nginx 日志
ssh root@119.29.37.208 "docker logs docker-nginx-1 --tail 50"
```

#### 数据库连接失败

```bash
# 检查 MySQL 是否运行
ssh root@119.29.37.208 "systemctl status mysql"

# 测试数据库连接
ssh root@119.29.37.208 "mysql -u root -p119689Abc. -e 'SELECT 1;'"

# 检查数据库是否存在
ssh root@119.29.37.208 "mysql -u root -p119689Abc. -e 'SHOW DATABASES;'"
```

---

## 📝 最佳实践

### 1. 开发流程

- ✅ 所有开发在 `dev` 分支进行
- ✅ 本地充分测试后再发布
- ✅ 数据库变更使用迁移文件
- ✅ 遵循提交规范（feat/fix/docs等）

### 2. 发布流程

- ✅ 确保 dev 分支测试通过
- ✅ 使用 `release.sh` 自动合并到 main
- ✅ 检查合并后的 main 分支

### 3. 部署流程

- ✅ 在 main 分支执行 `deploy.sh`
- ✅ 部署前备份重要数据
- ✅ 部署后验证功能正常
- ✅ 监控服务器日志

### 4. 数据库迁移

- ✅ 始终使用 `IF NOT EXISTS`
- ✅ 本地测试通过后再提交
- ✅ 不要修改已部署的迁移文件
- ✅ 大型变更前备份数据库

### 5. 回滚策略

```bash
# 1. 如果部署后发现严重问题，快速回滚：

# 方式1：重新部署上一个版本
git checkout main
git reset --hard HEAD^  # 回退到上一个提交
bash deploy.sh

# 方式2：手动回滚数据库（如果数据库变更有问题）
# 编写回滚 SQL 并执行
```

---

## 🔗 相关文档

- [Git 使用指南](./GIT_GUIDE.md) - 详细的 Git 工作流程
- [数据库迁移说明](./database/migrations/README.md) - 数据库迁移详细文档
- [项目说明](./README.md) - 项目总体介绍

---

## 📞 紧急联系

如果遇到无法解决的问题：

1. 查看错误日志
2. 检查服务器状态
3. 联系团队成员
4. 必要时回滚到上一个稳定版本

---

**最后更新：** 2024年11月

**维护者：** SmartAPI Team
