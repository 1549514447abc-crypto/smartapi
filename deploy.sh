#!/bin/bash

# 部署脚本 - 一键部署到生产服务器
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

SERVER_IP="119.29.37.208"
SERVER_USER="root"
SERVER_PATH="/www/smartapi"
DB_NAME="smartapi_dev"
DB_USER="root"
DB_PASSWORD="119689Abc."

echo "======================================"
echo "开始部署到生产服务器"
echo "服务器: $SERVER_USER@$SERVER_IP"
echo "======================================"

# 0. 检查当前分支
echo ""
echo "[0/6] 检查 Git 状态..."
CURRENT_BRANCH=$(git branch --show-current)
echo "当前分支: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  警告：您不在 main 分支上"
    echo "建议先执行 bash release.sh 发布到 main 分支"
    read -p "是否继续部署当前分支 ($CURRENT_BRANCH)? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消部署"
        exit 1
    fi
fi
echo "✓ 准备部署 $CURRENT_BRANCH 分支"

# 1. 构建前端
echo ""
echo "[1/6] 构建前端..."
cd frontend
npm run build
echo "✓ 前端构建完成"

# 2. 上传后端代码
echo ""
echo "[2/6] 上传后端代码..."
cd ../backend
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'dist' \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

echo "✓ 后端代码上传完成"

# 3. 上传前端构建文件
echo ""
echo "[3/6] 上传前端文件..."
ssh $SERVER_USER@$SERVER_IP "rm -rf /www/smartapi-web/*"
scp -r ../frontend/dist/* $SERVER_USER@$SERVER_IP:/www/smartapi-web/

echo "✓ 前端文件上传完成"

# 4. 上传数据库迁移文件
echo ""
echo "[4/6] 上传数据库迁移文件..."
cd ..
if [ -d "database/migrations" ]; then
    ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_PATH/database/migrations"
    scp database/migrations/*.sql $SERVER_USER@$SERVER_IP:$SERVER_PATH/database/migrations/ 2>/dev/null || echo "没有新的迁移文件"
    echo "✓ 迁移文件上传完成"
else
    echo "⚠️  没有找到迁移目录，跳过"
fi

# 5. 执行数据库迁移
echo ""
echo "[5/6] 执行数据库迁移..."
ssh $SERVER_USER@$SERVER_IP bash << ENDSSH
cd $SERVER_PATH/database/migrations
if ls *.sql 1> /dev/null 2>&1; then
    echo "找到迁移文件，开始执行..."
    for migration in \$(ls *.sql | sort); do
        echo "执行迁移: \$migration"
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < "\$migration" && echo "  ✓ \$migration 执行成功" || echo "  ⚠️  \$migration 执行失败（可能已执行过）"
    done
    echo "✓ 数据库迁移完成"
else
    echo "没有迁移文件，跳过"
fi
ENDSSH

# 6. 安装依赖并重启后端
echo ""
echo "[6/6] 安装后端依赖并重启..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /www/smartapi
npm install --production
npm run build
pm2 restart smartapi-backend || pm2 start dist/index.js --name smartapi-backend

# 更新前端到 Docker Nginx
docker exec docker-nginx-1 rm -rf /www/smartapi-web
docker cp /www/smartapi-web docker-nginx-1:/www/
docker exec docker-nginx-1 nginx -s reload
ENDSSH

echo "✓ 后端服务重启完成"
echo "✓ Nginx 更新完成"

echo ""
echo "======================================"
echo "部署完成！"
echo "访问地址: http://$SERVER_IP/smartapi/"
echo "======================================"
