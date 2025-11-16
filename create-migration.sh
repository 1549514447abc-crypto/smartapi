#!/bin/bash

# 创建数据库迁移文件
# 使用方法: bash create-migration.sh "描述"
# 示例: bash create-migration.sh "add_comments_table"

if [ -z "$1" ]; then
    echo "❌ 错误：请提供迁移描述"
    echo "使用方法: bash create-migration.sh \"描述\""
    echo "示例: bash create-migration.sh \"add_comments_table\""
    exit 1
fi

# 生成时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DESCRIPTION=$1
FILENAME="${TIMESTAMP}_${DESCRIPTION}.sql"
FILEPATH="database/migrations/${FILENAME}"

# 创建目录（如果不存在）
mkdir -p database/migrations

# 创建迁移文件
cat > "$FILEPATH" << 'EOF'
-- ==========================================
-- 迁移：DESCRIPTION_PLACEHOLDER
-- 创建时间：DATETIME_PLACEHOLDER
-- 描述：在这里添加详细描述
-- ==========================================

-- 在这里编写您的 SQL 语句

-- 示例：创建新表
-- CREATE TABLE IF NOT EXISTS `table_name` (
--   `id` INT PRIMARY KEY AUTO_INCREMENT,
--   `name` VARCHAR(255) NOT NULL,
--   `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 示例：添加字段
-- ALTER TABLE `users`
-- ADD COLUMN IF NOT EXISTS `new_field` VARCHAR(255) AFTER `existing_field`;

-- 示例：添加索引
-- ALTER TABLE `table_name`
-- ADD INDEX IF NOT EXISTS `idx_field_name` (`field_name`);

SELECT 'Migration created - please edit the file to add your SQL statements' AS message;
EOF

# 替换占位符
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
sed -i "s/DESCRIPTION_PLACEHOLDER/$DESCRIPTION/g" "$FILEPATH"
sed -i "s/DATETIME_PLACEHOLDER/$DATETIME/g" "$FILEPATH"

echo "✅ 迁移文件已创建: $FILEPATH"
echo ""
echo "接下来："
echo "1. 编辑文件并添加 SQL 语句"
echo "2. 在本地测试迁移："
echo "   mysql -u root -p smartapi_dev < $FILEPATH"
echo "3. 提交到 Git："
echo "   git add $FILEPATH"
echo "   git commit -m \"feat: $DESCRIPTION\""
echo "4. 部署时会自动执行迁移"
