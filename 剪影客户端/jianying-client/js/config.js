/**
 * 环境配置文件 (config.js)
 * 用于区分开发环境和生产环境的API地址
 */

(function() {
    'use strict';

    // API配置 - 客户端始终使用线上API
    const API_BASE = 'https://contentcube.cn';
    const ENV = 'production';

    // 暴露到全局对象
    window.API_CONFIG = {
        ENV: ENV,
        API_BASE: API_BASE,
        IS_PRODUCTION: ENV === 'production',
        IS_DEVELOPMENT: ENV === 'development'
    };

    // 日志输出当前环境
    console.log(`[Config] 当前环境: ${ENV}`);
    console.log(`[Config] API地址: ${API_BASE}`);

    // API端点配置
    window.API_ENDPOINTS = {
        // 认证相关 - 和后端路由保持一致
        auth: {
            smsStatus: `${API_BASE}/api/auth/sms/status`,
            smsSend: `${API_BASE}/api/auth/sms/send`,
            smsLogin: `${API_BASE}/api/auth/sms/login`,
            wechatAvailable: `${API_BASE}/api/auth/wechat/available`,
            wechatQrcode: `${API_BASE}/api/auth/wechat/qrcode`,
            wechatStatus: `${API_BASE}/api/auth/wechat/status`
        },
        // 系统配置
        systemConfig: {
            agreements: `${API_BASE}/api/system-config/agreements`
        },
        // 剪映客户端相关
        jianyingClient: {
            checkAccess: `${API_BASE}/api/jianying-client/check-access`,
            authorize: `${API_BASE}/api/jianying-client/authorize`,
            userInfo: `${API_BASE}/api/jianying-client/user-info`
        }
    };

    // 调试：输出所有端点
    console.log('[Config] API端点:', window.API_ENDPOINTS);

})();


