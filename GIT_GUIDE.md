# Git 使用指南

本文档详细介绍 SmartAPI 项目的 Git 工作流程和最佳实践。

## 📋 目录

- [分支策略](#分支策略)
- [日常开发流程](#日常开发流程)
- [常用命令](#常用命令)
- [提交规范](#提交规范)
- [部署流程](#部署流程)
- [常见问题](#常见问题)

---

## 🌳 分支策略

### 主要分支

- **`main`** - 生产环境分支
  - 始终保持可部署状态
  - 只接受来自 `dev` 分支的合并
  - 每次合并都应该部署到生产服务器
  - 受保护，不允许直接提交

- **`dev`** - 开发环境分支
  - 日常开发分支
  - 新功能开发在此分支进行
  - 测试通过后合并到 `main`

### 功能分支（可选）

对于大型功能开发，可以创建临时功能分支：

```bash
# 从 dev 创建功能分支
git checkout dev
git checkout -b feature/用户系统优化

# 开发完成后合并回 dev
git checkout dev
git merge feature/用户系统优化
git branch -d feature/用户系统优化
```

---

## 🔄 日常开发流程

### 1. 开始新功能开发

```bash
# 确保在 dev 分支
git checkout dev

# 拉取最新代码
git pull origin dev

# 开始开发...
```

### 2. 提交代码

```bash
# 查看修改的文件
git status

# 添加文件到暂存区
git add .                    # 添加所有修改
git add <文件路径>           # 添加指定文件

# 提交到本地仓库
git commit -m "feat: 添加用户头像上传功能"

# 推送到远程仓库
git push origin dev
```

### 3. 发布到生产环境

```bash
# 切换到 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 合并 dev 分支
git merge dev

# 推送到远程
git push origin main

# 部署到服务器（一键部署）
bash deploy.sh
```

---

## 📝 提交规范

### Commit Message 格式

```
<类型>(<范围>): <简短描述>

<详细描述>（可选）

<关联问题>（可选）
```

### 类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加视频文案提取功能` |
| `fix` | Bug修复 | `fix: 修复登录跳转路径错误` |
| `docs` | 文档更新 | `docs: 更新API文档` |
| `style` | 代码格式调整 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor: 重构用户认证模块` |
| `perf` | 性能优化 | `perf: 优化数据库查询` |
| `test` | 测试相关 | `test: 添加单元测试` |
| `build` | 构建相关 | `build: 升级依赖版本` |
| `ci` | CI/CD相关 | `ci: 添加自动部署脚本` |
| `chore` | 其他杂项 | `chore: 更新.gitignore` |

### 提交示例

```bash
# 好的提交
git commit -m "feat: 添加课程购买支付功能"
git commit -m "fix: 修复API响应401时跳转路径错误"
git commit -m "docs: 更新部署文档"

# 不好的提交
git commit -m "修改代码"
git commit -m "update"
git commit -m "bug fix"
```

---

## 🚀 部署流程

### 方式1：使用一键部署脚本（推荐）

```bash
# 确保在项目根目录
cd D:\code-program\smartapi

# 执行部署脚本
bash deploy.sh
```

脚本会自动完成：
1. ✅ 构建前端（`npm run build`）
2. ✅ 上传后端代码到服务器
3. ✅ 上传前端构建文件
4. ✅ 安装依赖并重启后端服务
5. ✅ 更新 Nginx 配置

### 方式2：手动部署

```bash
# 1. 在服务器上拉取代码
ssh root@119.29.37.208 "cd /www/smartapi && git pull origin main"

# 2. 安装依赖并构建
ssh root@119.29.37.208 "cd /www/smartapi && npm install && npm run build"

# 3. 重启服务
ssh root@119.29.37.208 "pm2 restart smartapi-backend"
```

---

## 💡 常用命令

### 基础操作

```bash
# 克隆仓库
git clone https://github.com/1549514447abc-crypto/smartapi.git

# 查看状态
git status

# 查看提交历史
git log --oneline --graph --all

# 查看远程仓库
git remote -v
```

### 分支管理

```bash
# 查看所有分支
git branch -a

# 创建并切换到新分支
git checkout -b feature/新功能

# 切换分支
git checkout dev
git checkout main

# 删除本地分支
git branch -d feature/旧功能

# 删除远程分支
git push origin --delete feature/旧功能
```

### 撤销操作

```bash
# 撤销工作区修改（未add）
git checkout -- <文件名>
git restore <文件名>

# 撤销暂存区（已add未commit）
git reset HEAD <文件名>
git restore --staged <文件名>

# 撤销最后一次提交（保留修改）
git reset --soft HEAD^

# 撤销最后一次提交（丢弃修改）⚠️ 危险操作
git reset --hard HEAD^

# 修改最后一次提交
git commit --amend -m "新的提交信息"
```

### 远程操作

```bash
# 拉取远程更新
git pull origin dev

# 推送到远程
git push origin dev

# 强制推送（⚠️ 危险，谨慎使用）
git push origin dev --force
```

### 合并操作

```bash
# 合并指定分支到当前分支
git merge dev

# 如果有冲突，解决后：
git add .
git commit -m "merge: 合并dev分支"

# 取消合并
git merge --abort
```

### 储藏操作

```bash
# 临时保存当前工作
git stash

# 查看储藏列表
git stash list

# 恢复最近的储藏
git stash pop

# 恢复指定储藏
git stash apply stash@{0}
```

---

## 🔧 常见问题

### Q1: 如何解决代码冲突？

```bash
# 1. 拉取最新代码时出现冲突
git pull origin dev

# 2. Git会提示冲突文件，打开文件会看到：
<<<<<<< HEAD
你的代码
=======
别人的代码
>>>>>>> origin/dev

# 3. 手动编辑文件，保留需要的代码

# 4. 标记为已解决
git add <冲突文件>

# 5. 提交合并
git commit -m "merge: 解决合并冲突"
```

### Q2: 误提交了不该提交的文件怎么办？

```bash
# 如果还没push
git reset --soft HEAD^
git restore --staged <文件名>

# 如果已经push
# 修改.gitignore，然后：
git rm --cached <文件名>
git commit -m "chore: 移除误提交的文件"
git push origin dev
```

### Q3: 想放弃本地所有修改，恢复到远程状态

```bash
# ⚠️ 这会丢失所有本地修改
git fetch origin
git reset --hard origin/dev
```

### Q4: 如何查看某个文件的修改历史？

```bash
# 查看文件的提交历史
git log -- <文件路径>

# 查看文件的具体修改
git log -p -- <文件路径>
```

### Q5: 推送时提示 "rejected"

```bash
# 原因：远程有新提交，需要先拉取
git pull origin dev

# 如果有冲突，解决后再推送
git push origin dev
```

### Q6: 如何重置token配置？

```bash
# 删除旧token
git config --unset credential.helper
rm ~/.git-credentials

# 配置新token
git remote set-url origin https://<新token>@github.com/1549514447abc-crypto/smartapi.git
```

---

## 📊 工作流示例

### 完整开发流程示例

```bash
# Day 1: 开始开发新功能
git checkout dev
git pull origin dev
# 开发代码...
git add .
git commit -m "feat: 添加课程评论功能（进行中）"
git push origin dev

# Day 2: 继续开发
# 开发代码...
git add .
git commit -m "feat: 完成课程评论功能"
git push origin dev

# Day 3: 测试通过，准备上线
git checkout main
git pull origin main
git merge dev
git push origin main

# 部署到生产
bash deploy.sh
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **经常提交** - 小步快跑，每完成一个小功能就提交
2. **写清楚commit message** - 让别人（和未来的自己）能看懂
3. **提交前先pull** - 避免不必要的冲突
4. **在dev分支开发** - 保持main分支稳定
5. **测试后再合并到main** - 确保生产环境稳定
6. **定期推送到远程** - 避免代码丢失

### ❌ 避免做法

1. ❌ 直接在main分支开发
2. ❌ 提交大量无关文件（node_modules, .env等）
3. ❌ 使用无意义的commit message
4. ❌ 随意使用 `--force` 强制推送
5. ❌ 长期不合并代码，导致大量冲突
6. ❌ 提交敏感信息（密码、token等）

---

## 🔐 安全提醒

### 环境变量管理

```bash
# ✅ 正确：不提交真实配置
.env  → 添加到 .gitignore
.env.example → 提交模板

# ❌ 错误：提交真实密码
.env → 直接提交（危险！）
```

### Token安全

1. **不要在代码中硬编码token**
2. **使用环境变量存储敏感信息**
3. **token暴露后立即删除重建**
4. **定期更换token**

---

## 📞 获取帮助

### Git官方文档
- https://git-scm.com/doc

### 常用Git工具
- **GitHub Desktop** - 图形化界面（推荐新手）
- **VS Code** - 内置Git功能
- **SourceTree** - 强大的Git GUI工具

### 紧急情况

如果遇到Git问题无法解决：

1. **备份当前代码** - 复制整个项目文件夹
2. **寻求帮助** - 在项目群里询问
3. **最坏情况** - 重新克隆仓库，手动恢复修改

---

## 📝 快速参考

### 一行命令速查

```bash
# 快速提交
git add . && git commit -m "feat: xxx" && git push

# 切换并拉取
git checkout dev && git pull

# 合并并推送
git checkout main && git merge dev && git push

# 查看简洁日志
git log --oneline -10

# 撤销最后一次提交
git reset --soft HEAD^
```

---

**最后更新：** 2024年11月

**维护者：** SmartAPI Team

**问题反馈：** https://github.com/1549514447abc-crypto/smartapi/issues
