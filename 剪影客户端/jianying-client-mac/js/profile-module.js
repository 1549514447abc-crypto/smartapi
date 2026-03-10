/**
 * 个人中心模块 (profile-module.js)
 * 负责登录、权限检查和用户信息管理
 * 登录方式：手机验证码登录 + 微信扫码登录
 */

(function() {
    'use strict';

    const ProfileModule = {
        isInitialized: false,
        token: null,
        userInfo: null,
        deviceId: null, // 唯一设备ID（防多端登录）

        // 登录状态
        smsAvailable: true,  // 默认可用
        wechatAvailable: true,  // 默认可用
        countdown: 0,
        countdownTimer: null,
        agreedToTerms: false,
        wechatAutoTriggered: false,

        // 权限定时检查
        accessCheckTimer: null,

        // 微信登录相关
        wechatQrCodeUrl: '',
        wechatSceneStr: '',
        wechatPolling: false,
        wechatPollTimer: null,

        // 协议内容
        termsContent: '',
        privacyContent: '',

        /**
         * 模块初始化
         */
        init() {
            try {
                // 从本地存储恢复登录状态
                this.token = localStorage.getItem('jianying_token');
                this.deviceId = this.getOrCreateDeviceId();
                const savedUserInfo = localStorage.getItem('jianying_user_info');
                if (savedUserInfo) {
                    try {
                        this.userInfo = JSON.parse(savedUserInfo);
                    } catch (e) {
                        this.userInfo = null;
                    }
                }

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        this.render();
                        this.bindEvents();
                        this.checkLoginServices();
                        this.checkLoginStatus();
                    });
                } else {
                    this.render();
                    this.bindEvents();
                    this.checkLoginServices();
                    this.checkLoginStatus();
                }

                this.isInitialized = true;
                window.JianyingApp.utils.addLog('[ProfileModule] 模块初始化完成', 'success');
                window.JianyingApp.events.emit('profileModuleReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 获取或创建唯一设备ID（持久化到 localStorage）
         * 使用 crypto.randomUUID 或兜底方案
         */
        getOrCreateDeviceId() {
            const key = 'jianying_device_id';
            let id = localStorage.getItem(key);
            if (id && id.length >= 8) return id;

            // 生成 UUID
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                id = crypto.randomUUID();
            } else {
                // 兜底：手动生成类 UUID
                id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
            }
            localStorage.setItem(key, id);
            console.log('[ProfileModule] 生成新设备ID:', id);
            return id;
        },

        /**
         * 登录后向服务器注册设备ID（绑定当前设备）
         */
        async registerDeviceToServer() {
            if (!this.token || !this.deviceId) return;

            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.registerDevice, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ device_id: this.deviceId })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('[ProfileModule] 设备注册成功:', result.data.message);
                    if (result.data.previousDeviceKicked) {
                        window.JianyingApp.utils.addLog('[ProfileModule] 已在新设备登录，旧设备将被下线', 'info');
                    }
                }
            } catch (error) {
                console.error('[ProfileModule] 设备注册失败:', error.message);
            }
        },

        /**
         * 处理被踢出（账号在其他设备登录）
         */
        handleDeviceKicked() {
            this.stopAccessCheckTimer();
            this.clearLoginState();
            this.showNotLoggedIn();

            // 弹窗提示
            setTimeout(() => {
                alert('⚠️ 您的账号已在其他设备登录\n\n当前设备已下线，如需继续使用请重新登录。\n\n如非本人操作，请及时修改密码。');
            }, 100);

            window.JianyingApp.utils.addLog('[ProfileModule] 账号已在其他设备登录，当前设备已下线', 'warning');
        },

        /**
         * 渲染页面
         */
        render() {
            const profilePage = document.getElementById('profile-page');
            if (!profilePage) {
                window.JianyingApp.utils.addLog('[ProfileModule] 未找到profile-page容器', 'error');
                return;
            }

            profilePage.innerHTML = `
                <style>
                    .login-container {
                        max-width: 720px;
                        margin: 0 auto;
                        background: #fff;
                        border-radius: 16px;
                        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    /* Tab 导航头部 */
                    .login-tab-header {
                        display: flex;
                        align-items: center;
                        border-bottom: 1px solid #f0f0f0;
                        position: relative;
                    }
                    .login-tab-nav {
                        display: flex;
                        flex: 1;
                        position: relative;
                    }
                    .login-tab-btn {
                        padding: 20px 32px;
                        background: none;
                        border: none;
                        font-size: 16px;
                        font-weight: 500;
                        color: #9ca3af;
                        cursor: pointer;
                        transition: color 0.3s;
                        position: relative;
                    }
                    .login-tab-btn.active {
                        color: #1a1a1a;
                        font-weight: 600;
                    }
                    .login-tab-btn.active::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 40px;
                        height: 3px;
                        background: #3b82f6;
                        border-radius: 2px;
                    }
                    .login-close-btn {
                        width: 32px;
                        height: 32px;
                        border: none;
                        background: #f5f5f5;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        color: #999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 16px;
                        transition: background 0.2s;
                    }
                    .login-close-btn:hover {
                        background: #e5e5e5;
                    }
                    /* 左右并排内容区 */
                    .login-body {
                        display: flex;
                        padding: 32px;
                        gap: 32px;
                        min-height: 340px;
                    }
                    .login-left {
                        flex: 0 0 auto;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding-right: 32px;
                        border-right: 1px solid #f0f0f0;
                    }
                    .login-right {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    /* 微信扫码区域 */
                    .qr-code-box {
                        padding: 16px;
                        background: #f9fafb;
                        border-radius: 12px;
                        border: 2px solid #e5e7eb;
                        margin-bottom: 16px;
                    }
                    .qr-image {
                        width: 200px;
                        height: 200px;
                    }
                    .qr-loading {
                        width: 200px;
                        height: 200px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #999;
                    }
                    .wechat-scan-text {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        color: #666;
                        font-size: 14px;
                    }
                    .wechat-scan-text .spin {
                        animation: spin 1.5s linear infinite;
                        width: 16px;
                        height: 16px;
                        border: 2px solid #ddd;
                        border-top-color: #3b82f6;
                        border-radius: 50%;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .btn-refresh-qr {
                        margin-top: 8px;
                        background: none;
                        border: none;
                        color: #3b82f6;
                        font-size: 13px;
                        cursor: pointer;
                    }
                    .btn-refresh-qr:hover {
                        text-decoration: underline;
                    }
                    /* 手机号登录表单 */
                    .phone-input-group {
                        display: flex;
                        align-items: center;
                        border: 1.5px solid rgba(79,124,255,0.18);
                        border-radius: 12px;
                        overflow: hidden;
                        margin-bottom: 16px;
                        background: rgba(255,255,255,0.96);
                        transition: border-color 0.2s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.3s cubic-bezier(0.2,0.8,0.2,1);
                    }
                    .phone-input-group:hover {
                        border-color: rgba(79,124,255,0.32);
                        box-shadow: 0 0 0 3px rgba(79,124,255,0.06);
                    }
                    .phone-input-group:focus-within {
                        border-color: rgba(79,124,255,0.55);
                        box-shadow: 0 0 0 4px rgba(79,124,255,0.12), 0 0 16px rgba(79,124,255,0.06);
                        background: #fff;
                    }
                    .phone-prefix {
                        padding: 14px 16px;
                        background: rgba(79,124,255,0.05);
                        color: var(--text-1);
                        font-size: 15px;
                        font-weight: 650;
                        border-right: 1.5px solid rgba(79,124,255,0.12);
                        white-space: nowrap;
                        user-select: none;
                    }
                    .phone-input-group input {
                        flex: 1;
                        padding: 14px;
                        border: none;
                        outline: none;
                        font-size: 15px;
                        background: transparent;
                        color: var(--text-1);
                    }
                    .phone-input-group input::placeholder {
                        color: var(--text-3);
                    }
                    .phone-input-group .phone-icon {
                        padding: 0 12px;
                        color: rgba(79,124,255,0.35);
                    }
                    .code-input-group {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    .code-input-group input {
                        flex: 1;
                        padding: 14px;
                        border: 1.5px solid rgba(79,124,255,0.18);
                        border-radius: 12px;
                        font-size: 15px;
                        outline: none;
                        background: rgba(255,255,255,0.96);
                        color: var(--text-1);
                        transition: border-color 0.2s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.3s cubic-bezier(0.2,0.8,0.2,1), background 0.2s;
                    }
                    .code-input-group input:hover {
                        border-color: rgba(79,124,255,0.32);
                        box-shadow: 0 0 0 3px rgba(79,124,255,0.06);
                    }
                    .code-input-group input:focus {
                        border-color: rgba(79,124,255,0.55);
                        box-shadow: 0 0 0 4px rgba(79,124,255,0.12), 0 0 16px rgba(79,124,255,0.06);
                        background: #fff;
                    }
                    .code-input-group input::placeholder {
                        color: var(--text-3);
                    }
                    .btn-send-code {
                        padding: 14px 20px;
                        background: rgba(79,124,255,0.08);
                        color: var(--blue);
                        border: 1.5px solid rgba(79,124,255,0.18);
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 650;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.2s cubic-bezier(0.2,0.8,0.2,1);
                    }
                    .btn-send-code:hover:not(:disabled) {
                        background: rgba(79,124,255,0.14);
                        border-color: rgba(79,124,255,0.3);
                        box-shadow: 0 4px 12px rgba(79,124,255,0.12);
                    }
                    .btn-send-code:disabled {
                        background: rgba(16,16,20,0.03);
                        color: var(--text-3);
                        border-color: var(--border);
                        cursor: not-allowed;
                    }
                    .btn-login {
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, rgba(79,124,255,1) 0%, rgba(183,164,255,1) 100%);
                        color: #fff;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.2,0.8,0.2,1);
                        box-shadow: 0 8px 24px rgba(79,124,255,0.2);
                    }
                    .btn-login:hover:not(:disabled) {
                        box-shadow: 0 12px 32px rgba(79,124,255,0.3);
                        transform: translateY(-1px);
                    }
                    .btn-login:active:not(:disabled) {
                        transform: translateY(0);
                    }
                    .btn-login:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .login-tip {
                        text-align: center;
                        font-size: 13px;
                        color: #3b82f6;
                        margin-top: 12px;
                    }
                    .field-error {
                        color: #ef4444;
                        font-size: 12px;
                        margin-top: 6px;
                        display: none;
                    }
                    .login-error {
                        color: #ef4444;
                        font-size: 13px;
                        text-align: center;
                        margin-top: 12px;
                        display: none;
                    }
                    /* 底部协议 */
                    .login-footer {
                        padding: 16px 32px 20px;
                        border-top: 1px solid #f0f0f0;
                        display: flex;
                        justify-content: center;
                    }
                    .agreement-row {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .agreement-row input[type="checkbox"] {
                        width: 18px;
                        height: 18px;
                        cursor: pointer;
                        accent-color: #3b82f6;
                    }
                    .agreement-row label {
                        font-size: 13px;
                        color: #666;
                        cursor: pointer;
                    }
                    .agreement-row a {
                        color: #2563eb;
                        text-decoration: none;
                    }
                    .agreement-row a:hover {
                        text-decoration: underline;
                    }
                    /* 弹窗样式 */
                    .modal-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.5);
                        z-index: 1000;
                        justify-content: center;
                        align-items: center;
                    }
                    .modal-content {
                        background: #fff;
                        border-radius: 16px;
                        padding: 30px;
                        max-width: 400px;
                        width: 90%;
                        text-align: center;
                        position: relative;
                    }
                    .modal-close {
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        width: 28px;
                        height: 28px;
                        border: none;
                        background: #f5f5f5;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 16px;
                        color: #666;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .modal-close:hover {
                        background: #eee;
                    }
                    .polling-status {
                        font-size: 13px;
                        color: #666;
                        margin-top: 4px;
                    }
                    /* 协议弹窗 */
                    .agreement-modal .modal-content {
                        max-width: 560px;
                        max-height: 80vh;
                        display: flex;
                        flex-direction: column;
                        padding: 0;
                    }
                    .agreement-modal-header {
                        padding: 20px 24px;
                        border-bottom: 1px solid #eee;
                    }
                    .agreement-modal-header h3 {
                        margin: 0;
                        font-size: 18px;
                        color: #1a1a1a;
                    }
                    .agreement-modal-body {
                        padding: 20px 24px;
                        overflow-y: auto;
                        flex: 1;
                        font-size: 14px;
                        color: #444;
                        line-height: 1.8;
                        white-space: pre-wrap;
                    }
                    .agreement-modal-footer {
                        padding: 16px 24px;
                        border-top: 1px solid #eee;
                    }
                    .agreement-modal-footer .btn-login {
                        padding: 12px;
                    }
                </style>

                <!-- 未登录状态 -->
                <div id="notLoggedInSection">
                    <div class="login-container">
                        <!-- Tab头部 -->
                        <div class="login-tab-header">
                            <div class="login-tab-nav">
                                <button type="button" class="login-tab-btn active" id="tabBtnWechat">微信扫码登录</button>
                                <button type="button" class="login-tab-btn active" id="tabBtnPhone">手机号快捷登录</button>
                            </div>
                            <button type="button" class="login-close-btn" id="btnLoginClose" style="display:none;">×</button>
                        </div>

                        <!-- 左右并排内容 -->
                        <div class="login-body">
                            <!-- 左侧：微信二维码 -->
                            <div class="login-left">
                                <div class="qr-code-box" id="inlineQrBox">
                                    <div id="inlineQrLoading" class="qr-loading" style="display: flex;">加载中...</div>
                                    <img id="inlineQrImage" class="qr-image" src="" alt="微信登录二维码" style="display: none;">
                                </div>
                                <div class="wechat-scan-text">
                                    <div class="spin"></div>
                                    <span id="inlinePollingText">请使用微信扫描二维码</span>
                                </div>
                                <button type="button" id="btnInlineRefreshQr" class="btn-refresh-qr" style="display:none;">刷新二维码</button>
                            </div>

                            <!-- 右侧：手机号登录 -->
                            <div class="login-right">
                                <div class="phone-input-group">
                                    <span class="phone-prefix">+86</span>
                                    <input type="tel" id="loginPhone" placeholder="请输入手机号" maxlength="11">
                                    <span class="phone-icon">
                                        <svg width="18" height="18" fill="#ccc" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" ry="2" fill="none" stroke="#ccc" stroke-width="1.5"/><circle cx="12" cy="18" r="1" fill="#ccc"/></svg>
                                    </span>
                                </div>
                                <p id="phoneError" class="field-error"></p>

                                <div class="code-input-group">
                                    <input type="text" id="loginSmsCode" placeholder="请输入验证码" maxlength="6">
                                    <button type="button" id="btnSendCode" class="btn-send-code">发送验证码</button>
                                </div>
                                <p id="smsError" class="field-error"></p>

                                <button type="button" id="btnSmsLogin" class="btn-login">登录</button>
                                <p class="login-tip">未注册将自动注册</p>
                                <p id="loginError" class="login-error"></p>
                            </div>
                        </div>

                        <!-- 底部协议 -->
                        <div class="login-footer">
                            <div class="agreement-row">
                                <input type="checkbox" id="agreeTerms">
                                <label for="agreeTerms">
                                    已阅读同意
                                    <a href="javascript:void(0)" id="linkTerms">《服务条款》</a>
                                    和
                                    <a href="javascript:void(0)" id="linkPrivacy">《隐私政策》</a>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 已登录状态 -->
                <div id="loggedInSection" style="display: none;">
                    <div class="bento-grid">
                        <section class="bento-card bento-card--6 bento-card--lilac">
                            <h3>登录状态</h3>
                            <div class="toolbar-row" style="background: rgba(255,255,255,0.72); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 12px;">
                                <div id="userAvatar" style="width: 46px; height: 46px; background: linear-gradient(135deg, #4f7cff, #b7a4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800;">U</div>
                                <div style="flex: 1; min-width: 0;">
                                    <h4 id="userName" style="margin: 0 0 4px 0; color: var(--text-1); font-size: 16px; font-weight: 850;">用户</h4>
                                    <p id="userPhone" style="margin: 0; color: var(--text-2); font-size: 13px;"></p>
                                </div>
                                <button type="button" id="btnLogout" class="btn btn-secondary">退出</button>
                            </div>
                        </section>

                        <section class="bento-card bento-card--6 bento-card--mint">
                            <h3>客户端权限</h3>
                            <div id="accessStatus" style="padding: 12px; background: rgba(255,255,255,0.72); border: 1px solid var(--border); border-radius: var(--r-lg);">
                                <div class="toolbar-row">
                                    <span id="accessIcon" style="font-size: 22px;">⏳</span>
                                    <div>
                                        <p id="accessMessage" style="margin: 0; color: var(--text-1); font-weight: 800;">检查权限中...</p>
                                        <p id="accessExpire" style="margin: 4px 0 0 0; color: var(--text-2); font-size: 13px;"></p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="bento-card bento-card--8 bento-card--blue" id="pathSettingSection">
                            <h3>剪映路径设置</h3>
                        <div id="pathNotSetWarning" class="callout callout-warning" style="display: none;">
                            <div class="callout-icon">⚠️</div>
                            <div>
                                <h4 class="callout-title">请先设置剪映草稿路径</h4>
                                <p class="callout-message">设置完成后才能使用导入功能。</p>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="profileJianyingPath">剪映草稿目录：</label>
                            <div class="input-group">
                                <input type="text" id="profileJianyingPath" class="form-control" placeholder="请选择或输入剪映草稿目录">
                                <button type="button" class="btn btn-secondary" id="browsePathBtn">浏览</button>
                            </div>
                            <div id="profilePathStatus" class="path-status" style="display: none;"></div>
                        </div>
                        <div class="help-card">
                            <h4>📍 获取剪映草稿路径指引</h4>
                            <p>为了正确写入视频到您的剪映草稿，请按以下步骤设置草稿存储位置：</p>
                            <div class="help-steps">
                                <p><strong>步骤1：</strong> 启动剪映</p>
                                <p><strong>步骤2：</strong> 在软件界面右上角找到并点击 ⚙️ 齿轮图标（设置）</p>
                                <p><strong>步骤3：</strong> 在弹出的菜单中，点击 <strong>"全局设置"</strong></p>
                                <p><strong>步骤4：</strong> 在全局设置窗口中，找到 <strong>"草稿位置"</strong> 选项，记住该路径</p>
                                <p><strong>步骤5：</strong> 返回本客户端，点击上方 <strong>"浏览"</strong> 按钮，选择刚才记住的草稿位置文件夹</p>
                            </div>
                        </div>
                        </section>

                        <section class="bento-card bento-card--4 bento-card--peach">
                            <h3>使用说明</h3>
                            <div class="rich-text">
                                <p><strong>权限说明：</strong></p>
                                <p>• 普通用户：免费使用 <strong>1年</strong></p>
                                <p>• 课程学员：免费使用 <strong>3年</strong></p>
                                <p><strong>使用步骤：</strong></p>
                                <p>1. 在Coze中生成剪映草稿JSON</p>
                                <p>2. 复制JSON链接到本客户端</p>
                                <p>3. 点击导入，自动下载素材并生成剪映项目</p>
                            </div>
                        </section>
                    </div>
                </div>

                <!-- 服务条款弹窗 -->
                <div id="termsModal" class="modal-overlay agreement-modal">
                    <div class="modal-content">
                        <button type="button" class="modal-close" data-modal="termsModal">×</button>
                        <div class="agreement-modal-header">
                            <h3>服务条款</h3>
                        </div>
                        <div id="termsContent" class="agreement-modal-body">暂无内容</div>
                        <div class="agreement-modal-footer">
                            <button type="button" id="btnCloseTerms" class="btn-login">我已阅读</button>
                        </div>
                    </div>
                </div>

                <!-- 隐私政策弹窗 -->
                <div id="privacyModal" class="modal-overlay agreement-modal">
                    <div class="modal-content">
                        <button type="button" class="modal-close" data-modal="privacyModal">×</button>
                        <div class="agreement-modal-header">
                            <h3>隐私政策</h3>
                        </div>
                        <div id="privacyContent" class="agreement-modal-body">暂无内容</div>
                        <div class="agreement-modal-footer">
                            <button type="button" id="btnClosePrivacy" class="btn-login">我已阅读</button>
                        </div>
                    </div>
                </div>

                <!-- 退出登录确认弹窗 -->
                <div id="logoutConfirmModal" class="modal-overlay">
                    <div class="modal-content" style="max-width: 360px; padding: 0; text-align: center;">
                        <div style="padding: 28px 28px 0;">
                            <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: linear-gradient(135deg, rgba(255,179,138,0.2), rgba(255,120,80,0.15)); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px;">
                                👋
                            </div>
                            <h3 style="margin: 0 0 8px; font-size: 17px; font-weight: 800; color: var(--text-1);">确定退出登录？</h3>
                            <p style="margin: 0; font-size: 14px; color: var(--text-2); line-height: 1.6;">退出后需要重新登录才能使用客户端功能</p>
                        </div>
                        <div style="padding: 20px 28px 24px; display: flex; gap: 12px;">
                            <button type="button" id="btnLogoutCancel" class="btn btn-secondary" style="flex: 1; justify-content: center; padding: 11px 0; border-radius: 12px;">取消</button>
                            <button type="button" id="btnLogoutConfirm" class="btn" style="flex: 1; justify-content: center; padding: 11px 0; border-radius: 12px; background: linear-gradient(135deg, #ff7850, #ff9b70); color: #fff; border-color: transparent; box-shadow: 0 8px 20px rgba(255,120,80,0.2);">退出登录</button>
                        </div>
                    </div>
                </div>
            `;

            this.updatePathDisplay();

            // 将弹窗移到 body 层级，避免被 .page display:none 隐藏
            ['termsModal', 'privacyModal', 'logoutConfirmModal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal) document.body.appendChild(modal);
            });

            window.JianyingApp.utils.addLog('[ProfileModule] 页面渲染完成', 'info');
        },

        /**
         * 绑定事件
         */
        bindEvents() {
            // 内联二维码刷新
            document.getElementById('btnInlineRefreshQr')?.addEventListener('click', () => this.loadInlineWechatQr());

            // 发送验证码
            document.getElementById('btnSendCode')?.addEventListener('click', () => this.handleSendSmsCode());

            // 手机验证码登录
            document.getElementById('btnSmsLogin')?.addEventListener('click', () => this.handleSmsLogin());

            // 协议勾选
            document.getElementById('agreeTerms')?.addEventListener('change', (e) => this.handleAgreementChange(e.target.checked));

            // 服务条款链接
            document.getElementById('linkTerms')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal('termsModal');
            });

            // 隐私政策链接
            document.getElementById('linkPrivacy')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal('privacyModal');
            });

            // 关闭弹窗按钮
            document.getElementById('btnCloseTerms')?.addEventListener('click', () => this.hideModal('termsModal'));
            document.getElementById('btnClosePrivacy')?.addEventListener('click', () => this.hideModal('privacyModal'));

            // 点击弹窗外部关闭
            ['termsModal', 'privacyModal'].forEach(modalId => {
                document.getElementById(modalId)?.addEventListener('click', (e) => {
                    if (e.target.id === modalId) {
                        this.hideModal(modalId);
                    }
                });
            });

            // 通用关闭按钮
            document.querySelectorAll('.modal-close[data-modal]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modalId = e.target.dataset.modal;
                    this.hideModal(modalId);
                });
            });

            // 退出登录
            document.getElementById('btnLogout')?.addEventListener('click', () => this.handleLogout());

            // 退出确认弹窗
            document.getElementById('btnLogoutConfirm')?.addEventListener('click', () => this.confirmLogout());
            document.getElementById('btnLogoutCancel')?.addEventListener('click', () => this.hideModal('logoutConfirmModal'));
            document.getElementById('logoutConfirmModal')?.addEventListener('click', (e) => {
                if (e.target.id === 'logoutConfirmModal') this.hideModal('logoutConfirmModal');
            });

            // 浏览路径
            document.getElementById('browsePathBtn')?.addEventListener('click', () => this.handleBrowsePath());

            // 监听路径自动检测结果，更新UI
            window.JianyingApp.events.on('pathChanged', (data) => {
                this.updatePathDisplay();
                if (data && data.path) {
                    this.showPathStatus('✅ 已自动检测到剪映路径', 'success');
                    const warning = document.getElementById('pathNotSetWarning');
                    if (warning) warning.style.display = 'none';
                }
            });

            // Enter键登录
            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const notLoggedIn = document.getElementById('notLoggedInSection');
                    if (notLoggedIn && notLoggedIn.style.display !== 'none') {
                        this.handleSmsLogin();
                    }
                }
            });

            // 手机号只允许输入数字
            document.getElementById('loginPhone')?.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
            });

            // 验证码只允许输入数字
            document.getElementById('loginSmsCode')?.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        },

        /**
         * 显示弹窗
         */
        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
            }
        },

        /**
         * 隐藏弹窗
         */
        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        },

        /**
         * 检查登录服务状态
         */
        async checkLoginServices() {
            try {
                window.JianyingApp.utils.addLog('[ProfileModule] 检查登录服务状态...', 'info');
                console.log('[ProfileModule] 检查登录服务...');
                console.log('[ProfileModule] SMS Status URL:', window.API_ENDPOINTS.auth.smsStatus);
                console.log('[ProfileModule] WeChat Available URL:', window.API_ENDPOINTS.auth.wechatAvailable);

                // 并行检查短信、微信服务和协议内容
                const [smsRes, wechatRes, agreementsRes] = await Promise.all([
                    fetch(window.API_ENDPOINTS.auth.smsStatus).then(r => r.json()).catch(err => {
                        console.error('[ProfileModule] SMS状态检查失败:', err);
                        return null;
                    }),
                    fetch(window.API_ENDPOINTS.auth.wechatAvailable).then(r => r.json()).catch(err => {
                        console.error('[ProfileModule] 微信状态检查失败:', err);
                        return null;
                    }),
                    fetch(window.API_ENDPOINTS.systemConfig.agreements).then(r => r.json()).catch(err => {
                        console.error('[ProfileModule] 协议内容获取失败:', err);
                        return null;
                    })
                ]);

                console.log('[ProfileModule] SMS响应:', smsRes);
                console.log('[ProfileModule] 微信响应:', wechatRes);

                if (smsRes?.success) {
                    this.smsAvailable = smsRes.data.available;
                    window.JianyingApp.utils.addLog(`[ProfileModule] 短信服务: ${this.smsAvailable ? '可用' : '不可用'}`, 'info');
                }

                if (wechatRes?.success) {
                    this.wechatAvailable = wechatRes.data.available;
                    window.JianyingApp.utils.addLog(`[ProfileModule] 微信登录: ${this.wechatAvailable ? '可用' : '不可用'}`, 'info');
                }

                if (agreementsRes?.success) {
                    this.termsContent = agreementsRes.data.termsOfService || '暂无内容';
                    this.privacyContent = agreementsRes.data.privacyPolicy || '暂无内容';
                    const termsContentEl = document.getElementById('termsContent');
                    const privacyContentEl = document.getElementById('privacyContent');
                    if (termsContentEl) termsContentEl.textContent = this.termsContent;
                    if (privacyContentEl) privacyContentEl.textContent = this.privacyContent;
                }

                // 更新按钮状态
                this.updateLoginButtonsState();

            } catch (error) {
                console.error('[ProfileModule] 检查服务状态失败:', error);
                window.JianyingApp.utils.addLog(`[ProfileModule] 检查服务状态失败: ${error.message}`, 'warning');
            }
        },

        /**
         * 更新登录按钮状态
         */
        updateLoginButtonsState() {
            const btnSendCode = document.getElementById('btnSendCode');
            if (btnSendCode && !this.smsAvailable) {
                btnSendCode.textContent = '暂不可用';
                btnSendCode.disabled = true;
            }
        },

        /**
         * (保留兼容) 不再需要切换Tab，两边同时显示
         */
        switchLoginTab(tab) {
            // 两边始终可见，只需确保二维码加载
            if (!this.wechatQrCodeUrl) {
                this.loadInlineWechatQr();
            }
        },

        /**
         * 加载内联微信二维码
         */
        async loadInlineWechatQr() {
            const qrLoading = document.getElementById('inlineQrLoading');
            const qrImage = document.getElementById('inlineQrImage');
            const pollingText = document.getElementById('inlinePollingText');
            const refreshBtn = document.getElementById('btnInlineRefreshQr');

            if (qrLoading) qrLoading.style.display = 'flex';
            if (qrImage) qrImage.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';

            try {
                const response = await fetch(window.API_ENDPOINTS.auth.wechatQrcode);
                const result = await response.json();

                if (result.success && result.data.qrCodeUrl) {
                    this.wechatQrCodeUrl = result.data.qrCodeUrl;
                    this.wechatSceneStr = result.data.sceneStr;

                    if (qrImage) {
                        qrImage.src = this.wechatQrCodeUrl;
                        qrImage.style.display = 'block';
                    }
                    if (qrLoading) qrLoading.style.display = 'none';
                    if (pollingText) pollingText.textContent = '请使用微信扫描二维码';

                    this.startInlineWechatPolling();
                } else {
                    if (qrLoading) qrLoading.textContent = '获取二维码失败';
                    if (refreshBtn) refreshBtn.style.display = 'inline';
                }
            } catch (error) {
                console.error('[ProfileModule] 获取微信二维码失败:', error);
                if (qrLoading) qrLoading.textContent = '网络错误，请刷新重试';
                if (refreshBtn) refreshBtn.style.display = 'inline';
            }
        },

        /**
         * 内联微信二维码轮询
         */
        startInlineWechatPolling() {
            this.stopWechatPolling();
            this.wechatPolling = true;

            this.wechatPollTimer = setInterval(async () => {
                if (!this.wechatPolling || !this.wechatSceneStr) {
                    clearInterval(this.wechatPollTimer);
                    return;
                }

                try {
                    const response = await fetch(`${window.API_ENDPOINTS.auth.wechatStatus}?sceneStr=${this.wechatSceneStr}`);
                    const result = await response.json();

                    if (result.success) {
                        if (result.data.status === 'confirmed' && result.data.token && result.data.user) {
                            this.stopWechatPolling();
                            this.token = result.data.token;
                            localStorage.setItem('jianying_token', this.token);
                            window.JianyingApp.utils.addLog(`[ProfileModule] 微信${result.data.isNewUser ? '注册' : '登录'}成功`, 'success');
                            // 先注册设备再检查状态，防止被旧设备ID踢掉
                            await this.registerDeviceToServer();
                            this.checkLoginStatus();
                        } else if (result.data.status === 'expired') {
                            this.stopWechatPolling();
                            const pollingText = document.getElementById('inlinePollingText');
                            if (pollingText) pollingText.textContent = '二维码已过期，请刷新';
                            const refreshBtn = document.getElementById('btnInlineRefreshQr');
                            if (refreshBtn) refreshBtn.style.display = 'inline';
                        }
                    }
                } catch (error) {
                    // 静默处理轮询错误
                }
            }, 2000);
        },

        /**
         * 处理协议勾选变化
         */
        handleAgreementChange(checked) {
            this.agreedToTerms = checked;
        },

        /**
         * 检查登录状态
         */
        async checkLoginStatus() {
            if (!this.token) {
                this.showNotLoggedIn();
                // 未登录时自动弹出微信扫码登录
                this.autoShowWechatLogin();
                return;
            }

            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.userInfo, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'X-Device-Id': this.deviceId || ''
                    }
                });

                // 中间件层设备检测
                if (response.status === 401) {
                    const errData = await response.json().catch(() => ({}));
                    if (errData.code === 'DEVICE_KICKED') {
                        this.handleDeviceKicked();
                        return;
                    }
                    this.clearLoginState();
                    this.showNotLoggedIn();
                    this.autoShowWechatLogin();
                    return;
                }

                const result = await response.json();

                if (!result.success) {
                    this.clearLoginState();
                    this.showNotLoggedIn();
                    this.autoShowWechatLogin();
                    return;
                }

                this.userInfo = result.data;
                localStorage.setItem('jianying_user_info', JSON.stringify(this.userInfo));
                this.showLoggedIn();

                this.checkClientAccess();

                // 登录成功后检查路径是否设置
                this.checkPathAfterLogin();

            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 检查登录状态失败: ${error.message}`, 'error');
                this.showNotLoggedIn();
            }
        },

        /**
         * 自动显示微信扫码登录（打开客户端首次）
         */
        autoShowWechatLogin() {
            // 自动勾选协议
            this.agreedToTerms = true;
            const agreeTerms = document.getElementById('agreeTerms');
            if (agreeTerms) agreeTerms.checked = true;

            // 切换到个人中心页面显示登录
            window.JianyingApp.navigation.switchPage('profile');

            // 自动加载微信二维码
            setTimeout(() => {
                this.loadInlineWechatQr();
            }, 500);
        },

        /**
         * 登录成功后检查是否设置了剪映路径
         */
        checkPathAfterLogin() {
            const currentPath = window.JianyingApp.modules.pathManager?.getCurrentPath();
            if (currentPath) {
                // 路径已自动检测到，更新显示
                this.updatePathDisplay();
                this.showPathStatus('✅ 已自动检测到剪映路径', 'success');
                const warning = document.getElementById('pathNotSetWarning');
                if (warning) warning.style.display = 'none';
                window.JianyingApp.utils.addLog(`[ProfileModule] 剪映路径已设置: ${currentPath}`, 'success');
            } else {
                // 未设置路径，跳转到个人中心并高亮路径设置
                window.JianyingApp.navigation.switchPage('profile');
                // 显示路径未设置警告
                const warning = document.getElementById('pathNotSetWarning');
                if (warning) warning.style.display = 'block';
                // 滚动到路径设置区域
                const pathSection = document.getElementById('pathSettingSection');
                if (pathSection) pathSection.scrollIntoView({ behavior: 'smooth' });
                window.JianyingApp.utils.addLog('[ProfileModule] 请先设置剪映草稿路径', 'warning');
            }
        },

        /**
         * 检查客户端访问权限
         */
        async checkClientAccess() {
            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.checkAccess, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'X-Device-Id': this.deviceId || ''
                    }
                });

                // 中间件层设备检测：401 + DEVICE_KICKED
                if (response.status === 401) {
                    const errData = await response.json().catch(() => ({}));
                    if (errData.code === 'DEVICE_KICKED') {
                        this.handleDeviceKicked();
                        return;
                    }
                    // 其他401（token过期等）
                    this.clearLoginState();
                    this.showNotLoggedIn();
                    return;
                }

                const result = await response.json();

                if (!result.success) {
                    this.updateAccessStatus('error', '❌', '权限检查失败');
                    return;
                }

                const data = result.data;

                if (data.needAuthorize) {
                    await this.authorizeClient();
                } else if (data.expired) {
                    this.updateAccessStatus('expired', '⚠️', '使用权限已过期', `已于 ${new Date(data.expireDate).toLocaleDateString()} 过期`);
                    this.lockFunctions();
                } else if (data.hasAccess) {
                    this.updateAccessStatus('active', '✅', '权限正常', `剩余 ${data.daysLeft} 天`);
                    this.unlockFunctions();
                }

                // 启动定时刷新权限
                this.startAccessCheckTimer();

            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 检查权限失败: ${error.message}`, 'error');
                this.updateAccessStatus('error', '❌', '网络错误，请检查网络连接');
            }
        },

        /**
         * 定时检查权限（每10分钟）
         */
        startAccessCheckTimer() {
            this.stopAccessCheckTimer();
            this.accessCheckTimer = setInterval(() => {
                if (this.token) {
                    window.JianyingApp.utils.addLog('[ProfileModule] 定时刷新权限状态...', 'info');
                    this.checkClientAccess();
                }
            }, 60 * 1000); // 60秒检查一次（会员状态刷新，设备检测已由中间件处理）
        },

        stopAccessCheckTimer() {
            if (this.accessCheckTimer) {
                clearInterval(this.accessCheckTimer);
                this.accessCheckTimer = null;
            }
        },

        /**
         * 授权客户端
         */
        async authorizeClient() {
            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.authorize, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                        'X-Device-Id': this.deviceId || ''
                    },
                    body: JSON.stringify({ device_id: this.deviceId || '' })
                });

                const result = await response.json();

                if (result.success && result.data.authorized) {
                    const data = result.data;
                    // 计算剩余天数
                    const expireDate = new Date(data.expireDate);
                    const now = new Date();
                    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    this.updateAccessStatus('active', '✅', `授权成功！有效期${data.duration}`, `剩余 ${daysLeft} 天`);
                    this.unlockFunctions();
                    window.JianyingApp.utils.addLog(`[ProfileModule] 客户端授权成功，有效期${data.duration}`, 'success');
                } else if (result.data?.alreadyAuthorized) {
                    this.checkClientAccess();
                }

            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 授权失败: ${error.message}`, 'error');
                this.updateAccessStatus('error', '❌', '授权失败，请重试');
            }
        },

        /**
         * 更新权限状态显示
         */
        updateAccessStatus(type, icon, message, subMessage = '') {
            const accessIcon = document.getElementById('accessIcon');
            const accessMessage = document.getElementById('accessMessage');
            const accessExpire = document.getElementById('accessExpire');
            const accessStatus = document.getElementById('accessStatus');

            if (accessIcon) accessIcon.textContent = icon;
            if (accessMessage) accessMessage.textContent = message;
            if (accessExpire) accessExpire.textContent = subMessage;

            if (accessStatus) {
                if (type === 'active') {
                    accessStatus.style.background = '#dcfce7';
                } else if (type === 'expired' || type === 'error') {
                    accessStatus.style.background = '#fee2e2';
                } else {
                    accessStatus.style.background = '#f8f9fa';
                }
            }
        },

        lockFunctions() {
            window.JianyingApp.state.clientAccessAllowed = false;
            window.JianyingApp.events.emit('clientAccessChanged', { allowed: false });
        },

        unlockFunctions() {
            window.JianyingApp.state.clientAccessAllowed = true;
            window.JianyingApp.events.emit('clientAccessChanged', { allowed: true });
        },

        /**
         * 发送短信验证码
         */
        async handleSendSmsCode() {
            const phone = document.getElementById('loginPhone')?.value?.trim();

            if (!phone) {
                this.showFieldError('phoneError', '请输入手机号');
                return;
            }
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                this.showFieldError('phoneError', '手机号格式不正确');
                return;
            }
            this.hideFieldError('phoneError');

            if (!this.smsAvailable) {
                this.showLoginError('短信服务暂不可用');
                return;
            }

            const btn = document.getElementById('btnSendCode');
            btn.disabled = true;

            try {
                const response = await fetch(window.API_ENDPOINTS.auth.smsSend, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });

                const result = await response.json();

                if (result.success) {
                    this.startCodeCountdown(btn);
                    window.JianyingApp.utils.addLog('[ProfileModule] 验证码已发送', 'success');
                } else {
                    this.showLoginError(result.error || result.message || '发送失败');
                    btn.disabled = false;
                }

            } catch (error) {
                this.showLoginError('网络错误');
                btn.disabled = false;
            }
        },

        startCodeCountdown(btn) {
            this.countdown = 60;
            if (this.countdownTimer) clearInterval(this.countdownTimer);

            this.countdownTimer = setInterval(() => {
                this.countdown--;
                btn.textContent = `${this.countdown}s`;

                if (this.countdown <= 0) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                    btn.textContent = '获取验证码';
                    btn.disabled = false;
                }
            }, 1000);
        },

        /**
         * 手机验证码登录
         */
        async handleSmsLogin() {
            if (!this.agreedToTerms) {
                this.showLoginError('请先阅读并同意服务条款和隐私政策');
                return;
            }

            const phone = document.getElementById('loginPhone')?.value?.trim();
            const code = document.getElementById('loginSmsCode')?.value?.trim();

            let hasError = false;

            if (!phone) {
                this.showFieldError('phoneError', '请输入手机号');
                hasError = true;
            } else if (!/^1[3-9]\d{9}$/.test(phone)) {
                this.showFieldError('phoneError', '手机号格式不正确');
                hasError = true;
            } else {
                this.hideFieldError('phoneError');
            }

            if (!code) {
                this.showFieldError('smsError', '请输入验证码');
                hasError = true;
            } else if (!/^\d{6}$/.test(code)) {
                this.showFieldError('smsError', '验证码为6位数字');
                hasError = true;
            } else {
                this.hideFieldError('smsError');
            }

            if (hasError) return;

            const btn = document.getElementById('btnSmsLogin');
            btn.disabled = true;
            btn.textContent = '登录中...';

            try {
                const response = await fetch(window.API_ENDPOINTS.auth.smsLogin, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, code })
                });

                const result = await response.json();

                if (result.success && result.data?.token) {
                    this.token = result.data.token;
                    localStorage.setItem('jianying_token', this.token);
                    window.JianyingApp.utils.addLog(`[ProfileModule] ${result.data.isNewUser ? '注册' : '登录'}成功`, 'success');
                    // 先注册设备再检查状态，防止被旧设备ID踢掉
                    await this.registerDeviceToServer();
                    this.checkLoginStatus();
                } else {
                    this.showLoginError(result.error || result.message || '登录失败');
                }

            } catch (error) {
                this.showLoginError('网络错误');
            } finally {
                btn.disabled = false;
                btn.textContent = '登录';
            }
        },

        /**
         * 微信登录 - 获取二维码
         */
        async handleWechatLogin() {
            if (!this.wechatAvailable) {
                this.showLoginError('微信登录服务暂不可用');
                return;
            }

            if (!this.agreedToTerms) {
                this.showLoginError('请先阅读并同意服务条款和隐私政策');
                return;
            }

            // 显示弹窗
            this.showModal('wechatQrModal');
            const qrLoading = document.getElementById('wechatQrLoading');
            const qrImage = document.getElementById('wechatQrImage');
            if (qrLoading) qrLoading.style.display = 'flex';
            if (qrImage) qrImage.style.display = 'none';

            try {
                console.log('[ProfileModule] 获取微信二维码...');
                const response = await fetch(window.API_ENDPOINTS.auth.wechatQrcode);
                const result = await response.json();
                console.log('[ProfileModule] 微信二维码响应:', result);

                if (result.success && result.data.qrCodeUrl) {
                    this.wechatQrCodeUrl = result.data.qrCodeUrl;
                    this.wechatSceneStr = result.data.sceneStr;

                    if (qrImage) {
                        qrImage.src = this.wechatQrCodeUrl;
                        qrImage.style.display = 'block';
                    }
                    if (qrLoading) qrLoading.style.display = 'none';

                    this.startWechatPolling();
                } else {
                    this.showLoginError('获取微信登录二维码失败');
                    this.closeWechatQrModal();
                }

            } catch (error) {
                console.error('[ProfileModule] 获取微信二维码失败:', error);
                this.showLoginError('微信登录失败');
                this.closeWechatQrModal();
            }
        },

        startWechatPolling() {
            this.wechatPolling = true;
            const pollingText = document.getElementById('pollingText');
            if (pollingText) pollingText.textContent = '等待扫码中...';

            if (this.wechatPollTimer) clearInterval(this.wechatPollTimer);

            this.wechatPollTimer = setInterval(async () => {
                if (!this.wechatPolling || !this.wechatSceneStr) {
                    clearInterval(this.wechatPollTimer);
                    return;
                }

                try {
                    const response = await fetch(`${window.API_ENDPOINTS.auth.wechatStatus}?sceneStr=${this.wechatSceneStr}`);
                    const result = await response.json();

                    if (result.success) {
                        if (result.data.status === 'confirmed' && result.data.token && result.data.user) {
                            this.stopWechatPolling();
                            this.closeWechatQrModal();

                            this.token = result.data.token;
                            localStorage.setItem('jianying_token', this.token);
                            window.JianyingApp.utils.addLog(`[ProfileModule] 微信${result.data.isNewUser ? '注册' : '登录'}成功`, 'success');
                            this.checkLoginStatus();
                        } else if (result.data.status === 'expired') {
                            this.stopWechatPolling();
                            if (pollingText) pollingText.textContent = '二维码已过期，请刷新';
                            window.JianyingApp.utils.addLog('[ProfileModule] 微信二维码已过期', 'warning');
                        }
                    }
                } catch (error) {
                    console.error('轮询微信登录状态失败:', error);
                }
            }, 2000);
        },

        stopWechatPolling() {
            this.wechatPolling = false;
            if (this.wechatPollTimer) {
                clearInterval(this.wechatPollTimer);
                this.wechatPollTimer = null;
            }
        },

        closeWechatQrModal() {
            this.hideModal('wechatQrModal');
            this.stopWechatPolling();
            this.wechatQrCodeUrl = '';
            this.wechatSceneStr = '';
        },

        handleLogout() {
            this.showModal('logoutConfirmModal');
        },

        confirmLogout() {
            this.hideModal('logoutConfirmModal');
            this.clearLoginState();
            this.showNotLoggedIn();
            this.lockFunctions();
            this.stopAccessCheckTimer();
            this.agreedToTerms = false;
            this.wechatAutoTriggered = false;
            const agreeTerms = document.getElementById('agreeTerms');
            if (agreeTerms) agreeTerms.checked = false;
            window.JianyingApp.utils.addLog('[ProfileModule] 已退出登录', 'info');
            // 重新加载微信二维码
            this.loadInlineWechatQr();
        },

        clearLoginState() {
            this.token = null;
            this.userInfo = null;
            localStorage.removeItem('jianying_token');
            localStorage.removeItem('jianying_user_info');
        },

        showNotLoggedIn() {
            const notLoggedIn = document.getElementById('notLoggedInSection');
            const loggedIn = document.getElementById('loggedInSection');
            if (notLoggedIn) notLoggedIn.style.display = 'block';
            if (loggedIn) loggedIn.style.display = 'none';
            this.lockFunctions();
        },

        showLoggedIn() {
            const notLoggedIn = document.getElementById('notLoggedInSection');
            const loggedIn = document.getElementById('loggedInSection');
            if (notLoggedIn) notLoggedIn.style.display = 'none';
            if (loggedIn) loggedIn.style.display = 'block';

            if (this.userInfo) {
                const userName = document.getElementById('userName');
                const userPhone = document.getElementById('userPhone');
                const userAvatar = document.getElementById('userAvatar');

                if (userName) userName.textContent = this.userInfo.nickname || this.userInfo.username || '用户';
                if (userPhone) userPhone.textContent = this.userInfo.phone ? `手机号: ${this.userInfo.phone}` : '';
                if (userAvatar) userAvatar.textContent = (this.userInfo.nickname || this.userInfo.username || 'U').charAt(0).toUpperCase();
            }
        },

        showFieldError(fieldId, message) {
            const errorEl = document.getElementById(fieldId);
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            }
        },

        hideFieldError(fieldId) {
            const errorEl = document.getElementById(fieldId);
            if (errorEl) errorEl.style.display = 'none';
        },

        showLoginError(message) {
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
        },

        hideLoginError() {
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) errorDiv.style.display = 'none';
        },

        getToken() {
            return this.token;
        },

        isLoggedIn() {
            return !!this.token;
        },

        async handleBrowsePath() {
            try {
                if (!window.JianyingApp.modules.pathManager) {
                    alert('路径管理模块未加载');
                    return;
                }

                const result = await window.JianyingApp.modules.pathManager.selectPath();

                if (result.success) {
                    document.getElementById('profileJianyingPath').value = result.path;
                    this.showPathStatus('路径设置成功', 'success');
                    // 隐藏路径未设置警告
                    const warning = document.getElementById('pathNotSetWarning');
                    if (warning) warning.style.display = 'none';
                }
            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 浏览路径出错: ${error.message}`, 'error');
            }
        },

        showPathStatus(message, type) {
            const statusDiv = document.getElementById('profilePathStatus');
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.className = `path-status ${type}`;
                statusDiv.style.display = 'block';
            }
        },

        /**
         * 登录时检查是否切换了用户，只有切换用户才清除历史记录
         */
        clearHistoryOnNewLogin() {
            // 检查是否切换了用户
            const lastUserId = localStorage.getItem('jianying_last_user_id');
            const currentUserId = this.userInfo?.id || null;

            // 如果有上次的用户ID，且和当前不同，才清除历史
            if (lastUserId && currentUserId && String(lastUserId) !== String(currentUserId)) {
                localStorage.removeItem('importHistory');
                const historyModule = window.JianyingApp.modules.historyModule;
                if (historyModule) {
                    historyModule.historyData = [];
                    historyModule.saveHistoryData();
                }
                window.JianyingApp.utils.addLog(`[ProfileModule] 用户切换(${lastUserId}->${currentUserId})，已清除旧历史记录`, 'info');
            }

            // 记录当前用户ID
            if (currentUserId) {
                localStorage.setItem('jianying_last_user_id', String(currentUserId));
            }
        },

        updatePathDisplay() {
            const pathInput = document.getElementById('profileJianyingPath');
            const currentPath = window.JianyingApp.modules.pathManager?.getCurrentPath();
            if (pathInput && currentPath) {
                pathInput.value = currentPath;
            }
        }
    };

    // 注册模块
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.profileModule = ProfileModule;

        if (document.readyState === 'complete') {
            ProfileModule.init();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                ProfileModule.init();
            });
        }
    } else {
        console.error('[ProfileModule] JianyingApp全局对象未找到');
    }

})();
