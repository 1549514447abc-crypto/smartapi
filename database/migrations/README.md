# 数据库迁移说明

## 📝 什么是数据库迁移？

数据库迁移是一种版本控制系统，用于跟踪和管理数据库结构的变化。每次修改数据库结构（添加表、修改字段等）时，都应该创建一个迁移文件。

## 📂 文件命名规范

```
YYYYMMDD_HHMMSS_描述.sql
```

**示例：**
- `20241117_120000_add_comments_table.sql` - 添加评论表
- `20241118_093000_add_user_avatar_column.sql` - 添加用户头像字段
- `20241119_150000_create_course_orders_table.sql` - 创建课程订单表

## ✍️ 创建迁移文件

### 方式1：手动创建

```bash
# 在 database/migrations 目录下创建新文件
# 格式：日期时间_描述.sql
touch database/migrations/20241117_120000_add_comments_table.sql
```

### 方式2：使用脚本（推荐）

```bash
# 会自动生成带时间戳的文件
npm run migration:create "add_comments_table"
```

## 📄 迁移文件内容

每个迁移文件应该包含：

```sql
-- ==========================================
-- 迁移：添加评论表
-- 创建时间：2024-11-17 12:00:00
-- 描述：为课程添加用户评论功能
-- ==========================================

-- 创建评论表
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

-- 插入示例数据（可选）
-- INSERT INTO `comments` (`user_id`, `course_id`, `content`, `rating`)
-- VALUES (1, 1, '课程很棒！', 5);
```

## 🚀 执行迁移

部署脚本会自动执行所有未执行的迁移文件。

**手动执行：**

```bash
# 在服务器上执行单个迁移文件
mysql -u root -p smartapi_dev < database/migrations/20241117_120000_add_comments_table.sql
```

## ⚠️ 注意事项

### 1. 使用 IF NOT EXISTS
始终使用 `IF NOT EXISTS` 避免重复创建：

```sql
CREATE TABLE IF NOT EXISTS `table_name` (...);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `avatar` VARCHAR(255);
```

### 2. 添加索引
为外键和常用查询字段添加索引：

```sql
INDEX `idx_user_id` (`user_id`)
```

### 3. 字符集
统一使用 utf8mb4：

```sql
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. 不要修改已部署的迁移文件
一旦迁移文件已经部署到生产环境，就不要再修改它。如果需要改动，创建新的迁移文件。

### 5. 测试迁移
在部署到生产环境之前，先在开发环境测试：

```bash
# 在本地测试
mysql -u root -p smartapi_dev < database/migrations/新迁移文件.sql
```

## 📋 常见操作示例

### 添加新表

```sql
CREATE TABLE IF NOT EXISTS `new_table` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 添加字段

```sql
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `phone` VARCHAR(20) AFTER `email`;
```

### 修改字段

```sql
ALTER TABLE `users`
MODIFY COLUMN `username` VARCHAR(100) NOT NULL;
```

### 添加索引

```sql
ALTER TABLE `courses`
ADD INDEX IF NOT EXISTS `idx_category` (`category`);
```

### 添加外键

```sql
ALTER TABLE `orders`
ADD CONSTRAINT `fk_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
```

### 插入初始数据

```sql
INSERT IGNORE INTO `categories` (`id`, `name`) VALUES
(1, '前端开发'),
(2, '后端开发'),
(3, '移动开发');
```

## 🔄 部署流程中的迁移

当你执行 `bash deploy.sh` 时，脚本会：

1. ✅ 上传所有迁移文件到服务器
2. ✅ 按文件名顺序执行所有 .sql 文件
3. ✅ 记录执行日志
4. ✅ 如果某个迁移失败，会显示错误并停止

## 📊 迁移历史追踪

可以创建一个迁移历史表来追踪哪些迁移已经执行：

```sql
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `migration` VARCHAR(255) NOT NULL UNIQUE,
  `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

每次执行迁移后记录：

```sql
INSERT INTO `migrations` (`migration`)
VALUES ('20241117_120000_add_comments_table.sql');
```

## 🎯 最佳实践

1. **小步迭代** - 每次迁移只做一件事
2. **清晰命名** - 文件名要能看出做了什么
3. **添加注释** - 在 SQL 中说明为什么要这样改
4. **测试优先** - 在开发环境先测试
5. **可回滚** - 考虑如何回滚这个变更（虽然不建议回滚）
6. **备份数据** - 重要变更前先备份数据库

## 🆘 问题排查

### 迁移执行失败怎么办？

1. 查看错误信息
2. 在本地数据库测试 SQL
3. 修复问题
4. 重新执行迁移

### 如何回滚迁移？

不建议回滚，而是创建新的迁移来修复：

```sql
-- 如果之前添加了字段
ALTER TABLE `users` DROP COLUMN IF EXISTS `phone`;

-- 如果之前创建了表
DROP TABLE IF EXISTS `comments`;
```

---

**最后更新：** 2024年11月

**维护者：** SmartAPI Team
