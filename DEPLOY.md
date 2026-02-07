# SmartAPI 部署文档

> 最后更新: 2025-12-31

## 目录

1. [服务器环境](#服务器环境)
2. [支付配置](#支付配置)
3. [腾讯云安全组配置](#腾讯云安全组配置)
4. [安全防护 (fail2ban)](#安全防护-fail2ban)
5. [部署步骤](#部署步骤)
6. [Nginx配置](#nginx配置)
7. [常用命令](#常用命令)
8. [故障排查](#故障排查)

---

## 服务器环境

### 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器IP | 119.29.37.208 |
| 操作系统 | OpenCloudOS (CentOS兼容) |
| SSH端口 | 22, 443 (备用) |
| SSH账号 | root |
| SSH密码 | 119689Abc. |

> **SSH端口说明**: 部分运营商会封锁22端口，如果连不上可以用443端口：`ssh -p 443 root@119.29.37.208`

### 宝塔面板

| 项目 | 值 |
|------|-----|
| 访问地址 | http://119.29.37.208:8888/tencentcloud |
| 端口 | 8888 |
| 安全入口 | /tencentcloud |
| 用户名 | 3de94525 |
| 密码 | a9a02484d775 |
| API Key | AB9966Ibbzl8Q2ZFg6aUo6no5fe9u5Sn |

> **注意**: 可在服务器上执行 `bt default` 命令查看面板信息，`bt 5` 修改密码

### 服务组件

| 组件 | 版本 | 端口 | 说明 |
|------|------|------|------|
| Nginx | 1.28.0 | 80 | 反向代理 + 静态文件 |
| Node.js | 18.x | - | 后端运行环境 |
| PM2 | 6.x | - | 进程管理 |
| MySQL | 8.0 (Docker) | 13306 | 数据库 |
| Docker | 最新 | - | 容器运行环境 |
| Python | 3.11 | - | 语音识别脚本 |

### Python 环境 (语音识别功能必需)

视频文案提取功能依赖 Python 和阿里云 DashScope SDK。

```bash
# 检查 python 命令是否可用
which python

# 如果只有 python3，创建 symlink
ln -s /usr/bin/python3 /usr/local/bin/python

# 安装 dashscope 依赖
pip3 install dashscope

# 验证安装
python -c "from dashscope.audio.asr import Transcription; print('OK')"
```

**API 配置** (数据库 `api_configs` 表):

| service_name | config_key | 说明 |
|--------------|------------|------|
| dashscope_asr | api_key | 阿里云 DashScope API Key |
| dashscope_asr | model | 语音识别模型 (paraformer-v2) |
| dashscope_asr | api_endpoint | API 地址 |

### MySQL配置

| 项目 | 值 |
|------|-----|
| 容器名 | mysql_xppk-mysql_XpPK-1 |
| 外部端口 | 13306 |
| 内部端口 | 3306 |
| 用户名 | root |
| 密码 | 119689Abc. |
| 数据库名 | smartapi_dev |

### 目录结构

```
服务器目录:
/www/
├── smartapi/              # 后端代码
│   ├── dist/              # 编译后的JS
│   ├── node_modules/
│   ├── uploads/           # 上传文件
│   ├── .env               # 环境变量
│   └── package.json
├── smartapi-web/          # 前端静态文件 (用户端)
│   ├── index.html
│   └── assets/
├── smartapi-admin/        # 管理后台静态文件
│   ├── index.html
│   └── assets/
└── smartapi-videos/       # 课程视频文件

/www/server/panel/vhost/nginx/
└── smartapi.conf          # Nginx配置
```

### 访问地址

| 站点 | 地址 |
|------|------|
| 用户前端 | https://contentcube.cn/smartapi/ |
| 管理后台 | https://contentcube.cn/admin/ |
| API | https://contentcube.cn/api/ |
| 视频文件 | https://contentcube.cn/videos/ |

### 公司信息

| 项目 | 值 |
|------|-----|
| 公司名称 | 长沙芯跃科技有限公司 |
| ICP备案号 | 湘ICP备2025140799号 |
| 邮箱 | contentcubecn@163.com |
| 微信 | OTR4936 |

### 管理员账号

| 项目 | 值 |
|------|-----|
| 用户名 | admin |
| 密码 | 123456 |

---

## 支付配置

### 证书目录结构

```
/www/certs/                      # 证书专用目录 (chmod 700)
├── alipay/                      # 支付宝证书 (chmod 700)
│   ├── appCertPublicKey.crt     # 应用公钥证书 (chmod 600)
│   ├── alipayCertPublicKey.crt  # 支付宝公钥证书 (chmod 600)
│   └── alipayRootCert.crt       # 支付宝根证书 (chmod 600)
└── wechat/                      # 微信支付证书 (chmod 700)
    ├── apiclient_cert.pem       # 商户证书 (chmod 600)
    ├── apiclient_key.pem        # 商户私钥 (chmod 600)
    └── apiclient_cert.p12       # PKCS12格式证书 (chmod 600)
```

### 环境变量配置 (/www/smartapi/.env)

```env
# ===== 基础配置 =====
PORT=3000
NODE_ENV=production
JWT_SECRET=smartapi_jwt_secret_key_2024

# ===== 数据库配置 =====
DB_HOST=127.0.0.1
DB_PORT=13306
DB_USER=root
DB_PASSWORD=119689Abc.
DB_NAME=smartapi_dev

# ===== API 配置 =====
ALAPI_TOKEN=CgCwvYmlF0jTkqsG
UPLOAD_BASE_URL=http://contentcube.cn

# ===== 支付宝配置 =====
ALIPAY_APP_ID=2021006115621581
ALIPAY_PRIVATE_KEY=你的私钥内容
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_APP_CERT_PATH=/www/certs/alipay/appCertPublicKey.crt
ALIPAY_PUBLIC_CERT_PATH=/www/certs/alipay/alipayCertPublicKey.crt
ALIPAY_ROOT_CERT_PATH=/www/certs/alipay/alipayRootCert.crt
ALIPAY_NOTIFY_URL=https://contentcube.cn/api/payment/alipay/notify
ALIPAY_RETURN_URL=https://contentcube.cn/smartapi/payment/result

# ===== 微信支付配置 =====
WECHAT_APP_ID=wx68b9c82d7b905aea
WECHAT_APP_SECRET=你的AppSecret
WECHAT_MCH_ID=1737634691
WECHAT_API_KEY_V2=你的V2密钥
WECHAT_API_KEY_V3=你的V3密钥
WECHAT_CERT_PATH=/www/certs/wechat/apiclient_cert.pem
WECHAT_KEY_PATH=/www/certs/wechat/apiclient_key.pem
WECHAT_NOTIFY_URL=https://contentcube.cn/api/payment/wechat/notify
WECHAT_RETURN_URL=https://contentcube.cn/smartapi/payment/result

# ===== 阿里云短信配置 (待配置) =====
# ALIYUN_ACCESS_KEY_ID=
# ALIYUN_ACCESS_KEY_SECRET=
# ALIYUN_SMS_SIGN_NAME=长沙芯跃科技
# ALIYUN_SMS_TEMPLATE_LOGIN=SMS_500495002
# ALIYUN_SMS_TEMPLATE_REGISTER=SMS_500560002
```

### 支付宝配置信息

| 项目 | 值 |
|------|-----|
| AppID | 2021006115621581 |
| 签名方式 | RSA2 (证书模式) |
| 网关 | https://openapi.alipay.com/gateway.do |

### 微信支付配置信息

| 项目 | 值 |
|------|-----|
| 公众号 | 创作魔方ContentCube服务号 |
| AppID | wx68b9c82d7b905aea |
| 商户号 | 1737634691 |

### 阿里云短信配置信息

| 项目 | 值 |
|------|-----|
| AccessKey ID | LTAI5t7S85zKvNPEw45NVyUY |
| 短信签名 | 长沙芯跃科技 |
| 登录验证码模板 | SMS_500495002 |
| 注册验证码模板 | SMS_500560002 |

### 支付 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/payment/alipay/status` | GET | 检查支付宝服务状态 |
| `/api/payment/alipay/create` | POST | 创建PC端支付订单 |
| `/api/payment/alipay/wap` | POST | 创建手机网站支付订单 |
| `/api/payment/alipay/notify` | POST | 支付宝异步通知回调 |
| `/api/payment/alipay/return` | GET | 支付宝同步返回页面 |
| `/api/payment/wechat/status` | GET | 检查微信支付状态 |
| `/api/payment/wechat/native` | POST | 创建扫码支付订单 |
| `/api/payment/wechat/h5` | POST | 创建H5支付订单 |
| `/api/payment/wechat/notify` | POST | 微信支付异步通知回调 |

### 证书权限设置

```bash
# 设置证书目录权限
chmod 700 /www/certs/alipay /www/certs/wechat

# 设置证书文件权限
chmod 600 /www/certs/alipay/*
chmod 600 /www/certs/wechat/*
```

---

## 腾讯云安全组配置

### ⚠️ 安全建议

**不要开放所有端口！** 只开放必要的端口可以大大降低被攻击的风险。

### 入站规则 (必须)

以下是必须开放的入站端口：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 你的IP/0.0.0.0/0 | SSH远程登录 |
| TCP | 80 | 0.0.0.0/0 | HTTP网站访问 |
| TCP | 443 | 0.0.0.0/0 | HTTPS网站访问 |
| TCP | 8888 | 你的IP | 宝塔面板 (建议限制IP) |

### 入站规则 (可选)

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 3306/13306 | 你的IP | MySQL远程连接 (不建议开放) |
| TCP | 3000 | 127.0.0.1 | 后端API (内部访问，无需开放) |

### 出站规则

| 协议 | 端口 | 目标 | 说明 |
|------|------|------|------|
| TCP | 80 | 0.0.0.0/0 | HTTP出站 |
| TCP | 443 | 0.0.0.0/0 | HTTPS出站 |
| UDP | 53 | 0.0.0.0/0 | DNS解析 |
| TCP | 53 | 0.0.0.0/0 | DNS解析 |

### 安全组配置步骤

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云服务器 CVM** → 找到服务器 `119.29.37.208`
3. 点击 **安全组** 选项卡
4. 点击安全组名称进入配置
5. 分别配置 **入站规则** 和 **出站规则**
6. 点击 **保存**

### 推荐的最小权限配置

```
入站规则:
┌──────────┬───────┬─────────────────┬────────┐
│ 协议     │ 端口  │ 来源            │ 策略   │
├──────────┼───────┼─────────────────┼────────┤
│ TCP      │ 22    │ 你的固定IP      │ 允许   │
│ TCP      │ 80    │ 0.0.0.0/0       │ 允许   │
│ TCP      │ 443   │ 0.0.0.0/0       │ 允许   │
│ TCP      │ 8888  │ 你的固定IP      │ 允许   │
└──────────┴───────┴─────────────────┴────────┘

出站规则:
┌──────────┬───────┬─────────────────┬────────┐
│ 协议     │ 端口  │ 目标            │ 策略   │
├──────────┼───────┼─────────────────┼────────┤
│ TCP      │ 80    │ 0.0.0.0/0       │ 允许   │
│ TCP      │ 443   │ 0.0.0.0/0       │ 允许   │
│ UDP      │ 53    │ 0.0.0.0/0       │ 允许   │
│ TCP      │ 53    │ 0.0.0.0/0       │ 允许   │
└──────────┴───────┴─────────────────┴────────┘
```

### 获取你的IP地址

访问 https://www.ip.cn/ 或 https://whatismyipaddress.com/ 查看你的公网IP。

---

## 安全防护 (fail2ban)

服务器已配置 fail2ban 防止暴力破解攻击。

### 配置概述

| 项目 | 值 |
|------|-----|
| 安装方式 | 从源码编译 (GitHub) |
| 配置文件 | /etc/fail2ban/jail.local |
| 日志文件 | /var/log/fail2ban.log |
| 后端类型 | polling (文件监控) |

### 启用的防护规则

| Jail名称 | 说明 | 最大尝试 | 封禁时间 |
|----------|------|---------|---------|
| sshd | SSH暴力破解防护 | 3次 | 24小时 |
| recidive | 重复违规IP | 3次 | 7天 |

### 当前配置 (/etc/fail2ban/jail.local)

```ini
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1
banaction = iptables-multiport
backend = polling

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/secure
backend = polling
maxretry = 3
bantime = 86400
findtime = 300

[recidive]
enabled = true
logpath = /var/log/fail2ban.log
banaction = iptables-allports
bantime = 604800
findtime = 86400
maxretry = 3
backend = polling
```

### fail2ban 管理命令

```bash
# 查看整体状态
fail2ban-client status

# 查看SSH jail状态
fail2ban-client status sshd

# 查看被封禁的IP
fail2ban-client status sshd | grep "Banned IP"

# 手动封禁IP
fail2ban-client set sshd banip 1.2.3.4

# 手动解封IP
fail2ban-client set sshd unbanip 1.2.3.4

# 重启服务
systemctl restart fail2ban

# 查看日志
tail -50 /var/log/fail2ban.log
```

### 工作原理

1. fail2ban 监控 `/var/log/secure` 中的SSH登录失败记录
2. 5分钟内 (findtime=300) 失败3次 (maxretry=3) 则封禁
3. 封禁24小时 (bantime=86400)
4. 如果同一IP被多次封禁，recidive 规则会将其封禁7天

---

## 部署步骤

### 1. 环境准备

#### 1.1 安装宝塔面板

```bash
# CentOS
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

#### 1.2 通过宝塔安装软件

在宝塔面板中安装：
- Nginx 1.28
- Docker
- MySQL 8.0 (通过Docker)
- Node.js 18.x
- PM2

#### 1.3 卸载腾讯云安全组件 (如果Docker无法启动)

```bash
# 腾讯云 YunJing 可能会杀死 Docker 进程
/usr/local/qcloud/YunJing/uninst.sh
```

### 2. 数据库配置

#### 2.1 创建数据库

```bash
# 进入 MySQL 容器
docker exec -it mysql_xppk-mysql_XpPK-1 mysql -uroot -p119689Abc.

# 创建数据库
CREATE DATABASE smartapi_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2.2 导入数据

```bash
# 将 SQL 文件复制到容器
docker cp /path/to/smartapi_dev.sql mysql_xppk-mysql_XpPK-1:/tmp/

# 执行导入
docker exec mysql_xppk-mysql_XpPK-1 mysql -uroot -p119689Abc. smartapi_dev -e "source /tmp/smartapi_dev.sql"
```

### 3. 后端部署

#### 3.1 上传代码

```bash
# 创建目录
mkdir -p /www/smartapi

# 上传 backend 目录内容到 /www/smartapi/
# 使用 SFTP 或 scp
```

#### 3.2 配置环境变量

创建 `/www/smartapi/.env`:

```env
PORT=3000
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=13306
DB_USER=root
DB_PASSWORD=119689Abc.
DB_NAME=smartapi_dev
JWT_SECRET=smartapi_jwt_secret_key_2024
ALAPI_TOKEN=你的ALAPI_TOKEN
```

#### 3.3 安装依赖并启动

```bash
cd /www/smartapi
npm install --production
pm2 start dist/index.js --name smartapi
pm2 save
pm2 startup
```

### 4. 前端部署

#### 4.1 构建前端

本地执行：

```bash
# 用户前端
cd frontend
npm run build
# 打包 dist 目录

# 管理后台
cd admin
npm run build
# 打包 dist 目录
```

#### 4.2 上传到服务器

```bash
# 用户前端
mkdir -p /www/smartapi-web
# 上传 frontend/dist/* 到 /www/smartapi-web/

# 管理后台
mkdir -p /www/smartapi-admin
# 上传 admin/dist/* 到 /www/smartapi-admin/
```

### 5. 视频文件

```bash
# 创建视频目录
mkdir -p /www/smartapi-videos

# 上传视频文件到此目录
```

### 6. Nginx配置

见下方 [Nginx配置](#nginx配置) 章节

### 7. 验证部署

```bash
# 检查服务状态
pm2 list

# 检查 API
curl http://127.0.0.1:3000/api/health

# 检查 Nginx
curl http://127.0.0.1/api/health
```

---

## Nginx配置

**文件位置**: `/www/server/panel/vhost/nginx/smartapi.conf`

```nginx
server {
    listen 80 default_server;
    server_name 119.29.37.208 contentcube.cn www.contentcube.cn _;

    # Admin API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Admin 后台
    location /admin/ {
        alias /www/smartapi-admin/;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # /smartapi/api/ 代理
    location /smartapi/api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # /smartapi/ 前端
    location /smartapi/ {
        alias /www/smartapi-web/;
        index index.html;
        try_files $uri $uri/ /smartapi/index.html;
    }

    # 根路径重定向
    location = / {
        return 301 /smartapi/;
    }

    # 视频文件
    location /videos/ {
        alias /www/smartapi-videos/;
        autoindex on;
        add_header Accept-Ranges bytes;
        add_header Cache-Control "public, max-age=31536000";
    }

    # 上传文件
    location /uploads/ {
        alias /www/smartapi/uploads/;
    }

    access_log /www/wwwlogs/smartapi_access.log;
    error_log /www/wwwlogs/smartapi_error.log;
}
```

### 应用配置

```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload
```

---

## 常用命令

### PM2 管理

```bash
# 查看进程列表
pm2 list

# 重启服务
pm2 restart smartapi

# 查看日志
pm2 logs smartapi --lines 50

# 查看错误日志
pm2 logs smartapi --err --lines 50

# 保存进程列表
pm2 save
```

### Nginx 管理

```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 重启服务
systemctl restart nginx

# 查看状态
systemctl status nginx
```

### Docker / MySQL

```bash
# 查看容器
docker ps

# 进入 MySQL
docker exec -it mysql_xppk-mysql_XpPK-1 mysql -uroot -p119689Abc.

# 查看 MySQL 日志
docker logs mysql_xppk-mysql_XpPK-1
```

### 日志查看

```bash
# Nginx 访问日志
tail -100 /www/wwwlogs/smartapi_access.log

# Nginx 错误日志
tail -100 /www/wwwlogs/smartapi_error.log

# PM2 日志
pm2 logs smartapi --lines 100
```

---

## 故障排查

### 1. 网站无法访问

```bash
# 检查 Nginx 是否运行
systemctl status nginx

# 检查端口 80
netstat -tlnp | grep :80

# 检查 Nginx 错误日志
tail -50 /www/wwwlogs/smartapi_error.log
```

### 2. API 返回 502

```bash
# 检查后端是否运行
pm2 list

# 检查后端端口
netstat -tlnp | grep :3000

# 查看后端日志
pm2 logs smartapi --err --lines 50
```

### 3. 数据库连接失败

```bash
# 检查 MySQL 容器
docker ps | grep mysql

# 测试数据库连接
docker exec mysql_xppk-mysql_XpPK-1 mysql -uroot -p119689Abc. -e "SELECT 1"

# 检查 .env 配置
cat /www/smartapi/.env
```

### 4. 前端白屏

```bash
# 检查前端文件
ls -la /www/smartapi-web/
ls -la /www/smartapi-web/assets/

# 检查 JS 文件大小 (不应该是 0)
du -h /www/smartapi-web/assets/*.js
```

### 5. 视频无法播放

```bash
# 检查视频目录
ls -la /www/smartapi-videos/

# 检查 Nginx 配置中的 alias 路径
grep -A5 "location /videos/" /www/server/panel/vhost/nginx/smartapi.conf
```

### 6. 视频文案提取失败

**错误信息**: `Speech recognition failed: spawn python ENOENT`

**原因**: 服务器上 `python` 命令不存在，只有 `python3`

**解决方案**:

```bash
# 1. 检查 python 命令
which python
# 如果返回空或 "no python"，执行下一步

# 2. 创建 symlink
ln -s /usr/bin/python3 /usr/local/bin/python

# 3. 验证
python --version
# 应该显示 Python 3.x.x
```

**错误信息**: `No module named 'dashscope'`

**原因**: 阿里云语音识别 SDK 未安装

**解决方案**:

```bash
# 安装 dashscope
pip3 install dashscope

# 验证
python -c "from dashscope.audio.asr import Transcription; print('OK')"

# 重启后端
pm2 restart smartapi
```

**错误信息**: `DashScope API Key not configured`

**原因**: 数据库中未配置 API Key

**解决方案**:

```sql
-- 进入 MySQL
docker exec -it mysql_xppk-mysql_XpPK-1 mysql -uroot -p119689Abc. smartapi_dev

-- 检查配置
SELECT * FROM api_configs WHERE service_name='dashscope_asr';

-- 如果没有，插入配置
INSERT INTO api_configs (service_name, config_key, config_value, description, is_active)
VALUES
('dashscope_asr', 'api_key', '你的API_KEY', '阿里云DashScope API Key', 1),
('dashscope_asr', 'model', 'paraformer-v2', '语音识别模型', 1),
('dashscope_asr', 'api_endpoint', 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', 'API地址', 1);
```

### 7. 管理后台显示"需要管理员权限"

**原因**: JWT token 中的字段名与后端代码不匹配

**解决方案**: 检查 `backend/src/controllers/userController.ts` 中使用的是 `user.userType` 而不是 `user.user_type`

### 8. SSH连接超时或被拒绝

**原因**: 部分运营商会封锁22端口的出站流量

**诊断方法**:

```bash
# 1. 在服务器上运行tcpdump监听
tcpdump -i eth0 host 你的公网IP

# 2. 本地尝试连接
ssh root@119.29.37.208

# 3. 如果tcpdump没有任何输出，说明数据包根本没到服务器，是运营商封了
```

**解决方案**: 使用443端口（运营商不会封HTTPS端口）

```bash
# 在服务器添加443端口
echo "Port 443" >> /etc/ssh/sshd_config
systemctl restart sshd

# 本地连接
ssh -p 443 root@119.29.37.208
```

**以后删除443端口** (如需要):

```bash
sed -i '/^Port 443$/d' /etc/ssh/sshd_config && systemctl restart sshd
```

---

## 一键部署脚本

### 使用方法

```bash
# 安装依赖 (首次使用)
pip install paramiko

# 方式一：交互式菜单
python scripts/deploy.py

# 方式二：命令行参数
python scripts/deploy.py all        # 部署全部
python scripts/deploy.py frontend   # 只部署前端
python scripts/deploy.py backend    # 只部署后端
python scripts/deploy.py admin      # 只部署管理后台
```

### 交互式菜单选项

```
请选择要部署的内容:
  1. 全部部署 (前端 + 后端 + 管理后台)
  2. 只部署前端
  3. 只部署后端
  4. 只部署管理后台
  5. 只构建不部署
  0. 退出
```

### 部署脚本位置

`scripts/deploy.py` - 统一部署脚本

### 部署流程

1. **构建阶段**: 本地执行 `npm run build` 构建项目
2. **打包阶段**: 创建 tar.gz 压缩包（排除视频等大文件）
3. **上传阶段**: 通过 SFTP 上传到服务器
4. **解压阶段**: 在服务器上解压到目标目录
5. **重启阶段**: PM2 重启后端服务（仅后端部署）
6. **验证阶段**: 检查服务状态和 API 健康检查

---

## SSH 连接脚本 (参考)

```python
#!/usr/bin/env python3
import paramiko

SERVER_IP = "119.29.37.208"
SERVER_USER = "root"
SERVER_PASSWORD = "119689Abc."

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASSWORD)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())

# 示例: 重启后端
run("pm2 restart smartapi")

ssh.close()
```

### 上传文件脚本

```python
#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("119.29.37.208", username="root", password="119689Abc.")

sftp = ssh.open_sftp()
sftp.put("local_file.tar.gz", "/www/remote_file.tar.gz")
sftp.close()

ssh.close()
```

---

## 版本历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-12-31 | 2.4 | 添加支付宝、微信支付配置；添加阿里云短信配置；添加公司备案信息 |
| 2025-12-19 | 2.3 | 添加SSH端口443备用方案，解决运营商封22端口问题 |
| 2025-12-17 | 2.2 | 添加一键部署脚本 (scripts/deploy.py) |
| 2025-12-14 | 2.1 | 添加 Python 环境配置、fail2ban 安全防护、视频文案提取故障排查 |
| 2025-12-14 | 2.0 | 完整重写，基于实际部署 |
| 2025-12-13 | 1.0 | 初始版本 |

---

*文档持续更新中...*
