#!/bin/bash

# 剪映登录服务部署脚本
# 用于快速部署到腾讯云服务器
# 
# 使用方法:
# 1. 修改下面的配置变量
# 2. chmod +x deploy.sh
# 3. ./deploy.sh

# ============ 配置区域 ============
SERVER_USER="root"                          # TODO: 替换为你的服务器用户名
SERVER_HOST="your-server-ip"                # TODO: 替换为你的服务器IP
SERVER_PATH="/www/jianying-server"          # 服务器上的部署目录
APP_NAME="jianying-api"                     # PM2 应用名称

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============ 函数定义 ============

# 打印信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 打印警告
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 打印错误
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装"
        exit 1
    fi
}

# ============ 部署流程 ============

print_info "开始部署剪映登录服务..."

# 1. 检查本地环境
print_info "检查本地环境..."
check_command ssh
check_command rsync

# 2. 检查配置文件
if [ ! -f ".env" ]; then
    print_warning ".env 文件不存在"
    print_info "请先创建 .env 文件并配置微信凭证"
    print_info "参考 env.example 文件"
    exit 1
fi

# 3. 创建服务器目录
print_info "创建服务器目录..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}"

# 4. 同步文件到服务器
print_info "同步文件到服务器..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'logs' \
    --exclude '.DS_Store' \
    --exclude 'pyJianYingDraft-main' \
    server.js \
    package.json \
    package-lock.json \
    ecosystem.config.js \
    .env \
    ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

if [ $? -ne 0 ]; then
    print_error "文件同步失败"
    exit 1
fi

print_info "文件同步成功"

# 5. 在服务器上安装依赖
print_info "安装 Node.js 依赖..."
ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && npm install --production"

if [ $? -ne 0 ]; then
    print_error "依赖安装失败"
    exit 1
fi

# 6. 重启服务
print_info "重启 PM2 服务..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /www/jianying-server

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "PM2 未安装，正在安装..."
    npm install -g pm2
fi

# 创建日志目录
mkdir -p logs

# 重启或启动服务
if pm2 list | grep -q jianying-api; then
    echo "重启现有服务..."
    pm2 restart ecosystem.config.js
else
    echo "首次启动服务..."
    pm2 start ecosystem.config.js
fi

# 保存 PM2 进程列表
pm2 save

# 设置 PM2 开机自启
pm2 startup
ENDSSH

if [ $? -ne 0 ]; then
    print_error "服务启动失败"
    exit 1
fi

# 7. 检查服务状态
print_info "检查服务状态..."
ssh ${SERVER_USER}@${SERVER_HOST} "pm2 status ${APP_NAME}"

# 8. 显示日志
print_info "最近的日志输出:"
ssh ${SERVER_USER}@${SERVER_HOST} "pm2 logs ${APP_NAME} --lines 20 --nostream"

# 9. 完成
print_info "================================"
print_info "部署完成！"
print_info "================================"
print_info ""
print_info "常用命令:"
print_info "  查看日志: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs ${APP_NAME}'"
print_info "  重启服务: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 restart ${APP_NAME}'"
print_info "  查看状态: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 status ${APP_NAME}'"
print_info ""
print_warning "请确保已配置 Nginx 反向代理和 SSL 证书"
print_warning "参考 nginx.conf.example 文件"



