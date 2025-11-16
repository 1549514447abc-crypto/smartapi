#!/bin/bash

# 部署脚本 - 一键部署到生产服务器
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

SERVER_IP="119.29.37.208"
SERVER_USER="root"
SERVER_PATH="/www/smartapi"

echo "======================================"
echo "开始部署到生产服务器"
echo "服务器: $SERVER_USER@$SERVER_IP"
echo "======================================"

# 1. 构建前端
echo ""
echo "[1/5] 构建前端..."
cd frontend
npm run build
echo "✓ 前端构建完成"

# 2. 上传后端代码
echo ""
echo "[2/5] 上传后端代码..."
cd ../backend
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'dist' \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

echo "✓ 后端代码上传完成"

# 3. 上传前端构建文件
echo ""
echo "[3/5] 上传前端文件..."
ssh $SERVER_USER@$SERVER_IP "rm -rf /www/smartapi-web/*"
scp -r ../frontend/dist/* $SERVER_USER@$SERVER_IP:/www/smartapi-web/

echo "✓ 前端文件上传完成"

# 4. 安装依赖并重启后端
echo ""
echo "[4/5] 安装后端依赖并重启..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /www/smartapi
npm install --production
npm run build
pm2 restart smartapi-backend || pm2 start dist/index.js --name smartapi-backend
ENDSSH

echo "✓ 后端服务重启完成"

# 5. 更新前端到 Docker Nginx
echo ""
echo "[5/5] 更新 Nginx..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
docker exec docker-nginx-1 rm -rf /www/smartapi-web
docker cp /www/smartapi-web docker-nginx-1:/www/
docker exec docker-nginx-1 nginx -s reload
ENDSSH

echo "✓ Nginx 更新完成"

echo ""
echo "======================================"
echo "部署完成！"
echo "访问地址: http://$SERVER_IP/smartapi/"
echo "======================================"
