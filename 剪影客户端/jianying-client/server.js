// 加载环境变量配置
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 存储登录会话
const loginSessions = new Map();

// 微信公众号配置（从环境变量读取）
const WECHAT_CONFIG = {
    appId: process.env.WECHAT_APP_ID || 'your_wechat_app_id',
    appSecret: process.env.WECHAT_APP_SECRET || 'your_wechat_app_secret',
    redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3001/wechat/callback'
};

// 验证配置
if (WECHAT_CONFIG.appId === 'your_wechat_app_id' || WECHAT_CONFIG.appSecret === 'your_wechat_app_secret') {
    console.warn('⚠️  警告: 微信配置未设置，请创建 .env 文件并填入真实配置');
    console.warn('⚠️  参考 env.example 文件进行配置');
}

/**
 * 生成登录二维码
 */
app.get('/api/wechat/qrcode', async (req, res) => {
    try {
        // 生成唯一的登录会话ID
        const sessionId = crypto.randomUUID();
        
        // 创建登录会话
        loginSessions.set(sessionId, {
            status: 'waiting', // waiting, scanned, confirmed, expired
            qrCode: null,
            userInfo: null,
            createdAt: Date.now()
        });

        // 生成微信登录URL
        const wechatLoginUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_CONFIG.appId}&redirect_uri=${encodeURIComponent(WECHAT_CONFIG.redirectUri)}&response_type=code&scope=snsapi_login&state=${sessionId}#wechat_redirect`;
        
        // 生成二维码
        const qrCodeDataURL = await qrcode.toDataURL(wechatLoginUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // 更新会话信息
        loginSessions.get(sessionId).qrCode = qrCodeDataURL;

        res.json({
            success: true,
            sessionId: sessionId,
            qrCode: qrCodeDataURL,
            message: '二维码生成成功'
        });

    } catch (error) {
        console.error('生成二维码失败:', error);
        res.status(500).json({
            success: false,
            message: '生成二维码失败'
        });
    }
});

/**
 * 检查登录状态
 */
app.get('/api/wechat/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = loginSessions.get(sessionId);

    if (!session) {
        return res.json({
            success: false,
            status: 'expired',
            message: '会话已过期'
        });
    }

    // 检查会话是否过期（5分钟）
    if (Date.now() - session.createdAt > 5 * 60 * 1000) {
        loginSessions.delete(sessionId);
        return res.json({
            success: false,
            status: 'expired',
            message: '二维码已过期，请重新生成'
        });
    }

    res.json({
        success: true,
        status: session.status,
        userInfo: session.userInfo,
        message: getStatusMessage(session.status)
    });
});

/**
 * 微信登录回调
 */
app.get('/wechat/callback', async (req, res) => {
    const { code, state } = req.query;
    const sessionId = state;

    if (!code || !sessionId) {
        return res.send(`
            <html>
                <body>
                    <h2>登录失败</h2>
                    <p>授权失败，请重试</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    }

    try {
        // 获取access_token
        const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
            params: {
                appid: WECHAT_CONFIG.appId,
                secret: WECHAT_CONFIG.appSecret,
                code: code,
                grant_type: 'authorization_code'
            }
        });

        const { access_token, openid } = tokenResponse.data;

        if (!access_token) {
            throw new Error('获取access_token失败');
        }

        // 获取用户信息
        const userInfoResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
            params: {
                access_token: access_token,
                openid: openid
            }
        });

        const userInfo = userInfoResponse.data;

        // 更新会话状态
        const session = loginSessions.get(sessionId);
        if (session) {
            session.status = 'confirmed';
            session.userInfo = {
                openid: userInfo.openid,
                nickname: userInfo.nickname,
                headimgurl: userInfo.headimgurl,
                loginTime: new Date().toISOString()
            };
        }

        // 返回成功页面
        res.send(`
            <html>
                <head>
                    <title>登录成功</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .success-container {
                            background: rgba(255, 255, 255, 0.1);
                            padding: 40px;
                            border-radius: 20px;
                            backdrop-filter: blur(10px);
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        }
                        .success-icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                        }
                        .success-title {
                            font-size: 24px;
                            margin-bottom: 10px;
                        }
                        .success-message {
                            font-size: 16px;
                            margin-bottom: 30px;
                            opacity: 0.9;
                        }
                        .close-button {
                            background: rgba(255, 255, 255, 0.2);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            color: white;
                            padding: 12px 24px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s ease;
                        }
                        .close-button:hover {
                            background: rgba(255, 255, 255, 0.3);
                            transform: translateY(-2px);
                        }
                    </style>
                </head>
                <body>
                    <div class="success-container">
                        <div class="success-icon">✅</div>
                        <div class="success-title">登录成功！</div>
                        <div class="success-message">
                            欢迎使用剪映草稿导入工具<br>
                            请关闭此页面返回客户端
                        </div>
                        <button class="close-button" onclick="window.close()">
                            关闭页面
                        </button>
                    </div>
                    <script>
                        // 自动关闭页面
                        setTimeout(() => {
                            window.close();
                        }, 5000);
                    </script>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('微信登录回调失败:', error);
        res.send(`
            <html>
                <body>
                    <h2>登录失败</h2>
                    <p>获取用户信息失败，请重试</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    }
});

/**
 * 检查用户是否关注了公众号
 */
app.get('/api/wechat/check-follow/:openid', async (req, res) => {
    const { openid } = req.params;
    
    try {
        // 这里需要调用微信API检查用户是否关注了公众号
        // 由于需要公众号的access_token，这里先模拟返回
        // 实际实现需要：
        // 1. 获取公众号的access_token
        // 2. 调用微信API检查用户关注状态
        
        // 模拟检查结果
        const isFollowing = Math.random() > 0.3; // 70%概率已关注
        
        res.json({
            success: true,
            isFollowing: isFollowing,
            message: isFollowing ? '已关注公众号' : '请先关注公众号'
        });
        
    } catch (error) {
        console.error('检查关注状态失败:', error);
        res.status(500).json({
            success: false,
            message: '检查关注状态失败'
        });
    }
});

/**
 * 获取状态消息
 */
function getStatusMessage(status) {
    switch (status) {
        case 'waiting':
            return '请使用微信扫描二维码';
        case 'scanned':
            return '已扫描，请在手机上确认登录';
        case 'confirmed':
            return '登录成功！';
        case 'expired':
            return '二维码已过期';
        default:
            return '未知状态';
    }
}

/**
 * 清理过期会话
 */
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of loginSessions.entries()) {
        if (now - session.createdAt > 5 * 60 * 1000) {
            loginSessions.delete(sessionId);
        }
    }
}, 60000); // 每分钟清理一次

// 启动服务器
app.listen(PORT, () => {
    console.log(`微信登录服务已启动，端口: ${PORT}`);
    console.log(`请在微信公众号后台配置回调地址: http://localhost:${PORT}/wechat/callback`);
});

module.exports = app;


