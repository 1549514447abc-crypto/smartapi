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

        // 登录状态
        smsAvailable: true,  // 默认可用
        wechatAvailable: true,  // 默认可用
        countdown: 0,
        countdownTimer: null,
        agreedToTerms: false,
        wechatAutoTriggered: false,

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
                        max-width: 380px;
                        margin: 0 auto;
                        padding: 40px 30px;
                        background: #fff;
                        border-radius: 12px;
                        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
                    }
                    .login-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .login-header h3 {
                        font-size: 24px;
                        color: #1a1a1a;
                        margin: 0 0 8px 0;
                        font-weight: 600;
                    }
                    .login-header p {
                        color: #666;
                        margin: 0;
                        font-size: 14px;
                    }
                    .form-group {
                        margin-bottom: 20px;
                    }
                    .form-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 500;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .form-input {
                        width: 100%;
                        padding: 12px 14px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 15px;
                        box-sizing: border-box;
                        transition: border-color 0.2s, box-shadow 0.2s;
                        outline: none;
                    }
                    .form-input:focus {
                        border-color: #2563eb;
                        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
                    }
                    .form-input::placeholder {
                        color: #999;
                    }
                    .code-input-group {
                        display: flex;
                        gap: 10px;
                    }
                    .code-input-group .form-input {
                        flex: 1;
                    }
                    .btn-send-code {
                        padding: 12px 16px;
                        background: #f0f7ff;
                        color: #2563eb;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.2s;
                    }
                    .btn-send-code:hover:not(:disabled) {
                        background: #e0efff;
                    }
                    .btn-send-code:disabled {
                        background: #f5f5f5;
                        color: #999;
                        cursor: not-allowed;
                    }
                    .btn-login {
                        width: 100%;
                        padding: 14px;
                        background: #2563eb;
                        color: #fff;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .btn-login:hover:not(:disabled) {
                        background: #1d4ed8;
                    }
                    .btn-login:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .login-tip {
                        text-align: center;
                        font-size: 12px;
                        color: #999;
                        margin-top: 12px;
                    }
                    .divider {
                        display: flex;
                        align-items: center;
                        margin: 28px 0;
                    }
                    .divider::before, .divider::after {
                        content: '';
                        flex: 1;
                        border-top: 1px solid #eee;
                    }
                    .divider span {
                        padding: 0 16px;
                        color: #999;
                        font-size: 13px;
                    }
                    .btn-wechat {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        width: 100%;
                        padding: 12px;
                        background: #fff;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: 500;
                        color: #333;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .btn-wechat:hover:not(:disabled) {
                        background: #f9f9f9;
                        border-color: #ccc;
                    }
                    .btn-wechat:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .agreement-row {
                        display: flex;
                        align-items: flex-start;
                        gap: 8px;
                        margin-top: 24px;
                    }
                    .agreement-row input[type="checkbox"] {
                        width: 16px;
                        height: 16px;
                        margin-top: 2px;
                        cursor: pointer;
                    }
                    .agreement-row label {
                        font-size: 13px;
                        color: #666;
                        line-height: 1.5;
                        cursor: pointer;
                    }
                    .agreement-row a {
                        color: #2563eb;
                        text-decoration: none;
                    }
                    .agreement-row a:hover {
                        text-decoration: underline;
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
                        margin-top: 16px;
                        display: none;
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
                    .qr-container {
                        display: inline-block;
                        padding: 16px;
                        background: #fff;
                        border: 2px solid #f0f0f0;
                        border-radius: 12px;
                        margin: 20px 0;
                    }
                    .qr-image {
                        width: 180px;
                        height: 180px;
                    }
                    .qr-loading {
                        width: 180px;
                        height: 180px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #999;
                    }
                    .polling-status {
                        font-size: 14px;
                        color: #666;
                    }
                    .btn-refresh-qr {
                        margin-top: 12px;
                        background: none;
                        border: none;
                        color: #2563eb;
                        font-size: 14px;
                        cursor: pointer;
                    }
                    .btn-refresh-qr:hover {
                        text-decoration: underline;
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

                <h2 style="color: #333; margin-bottom: 25px;">个人中心</h2>

                <!-- 未登录状态 -->
                <div id="notLoggedInSection">
                    <div class="login-container">
                        <div class="login-header">
                            <h3>欢迎使用</h3>
                            <p>请登录后使用剪映草稿导入功能</p>
                        </div>

                        <!-- 手机验证码登录 -->
                        <div class="form-group">
                            <label class="form-label">手机号</label>
                            <input type="tel" id="loginPhone" class="form-input" placeholder="请输入手机号" maxlength="11">
                            <p id="phoneError" class="field-error"></p>
                        </div>

                        <div class="form-group">
                            <label class="form-label">验证码</label>
                            <div class="code-input-group">
                                <input type="text" id="loginSmsCode" class="form-input" placeholder="请输入6位验证码" maxlength="6">
                                <button type="button" id="btnSendCode" class="btn-send-code">获取验证码</button>
                            </div>
                            <p id="smsError" class="field-error"></p>
                        </div>

                        <button type="button" id="btnSmsLogin" class="btn-login">登录</button>
                        <p class="login-tip">未注册将自动注册</p>

                        <div class="divider"><span>其他登录方式</span></div>

                        <button type="button" id="btnWechatLogin" class="btn-wechat">
                            <svg width="22" height="22" fill="#07C160" viewBox="0 0 24 24">
                                <path d="M8.694 13.908c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.73 0 1.392.567 1.392 1.392 0 .827-.662 1.393-1.392 1.393zm6.658 0c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.732 0 1.393.567 1.393 1.392 0 .827-.66 1.393-1.393 1.393zM12 2C6.477 2 2 6.136 2 11.238c0 2.872 1.417 5.438 3.647 7.116-.16.896-.583 2.502-.667 2.858-.11.458.384.625.668.455.517-.308 3.525-2.228 4.093-2.658.74.205 1.517.316 2.31.316 5.474 0 9.95-4.135 9.95-9.237C22.002 4.965 17.525 2 12 2z"/>
                            </svg>
                            微信登录
                        </button>

                        <div class="agreement-row">
                            <input type="checkbox" id="agreeTerms">
                            <label for="agreeTerms">
                                我已阅读并同意
                                <a href="javascript:void(0)" id="linkTerms">《服务条款》</a>
                                和
                                <a href="javascript:void(0)" id="linkPrivacy">《隐私政策》</a>
                            </label>
                        </div>

                        <p id="loginError" class="login-error"></p>
                    </div>
                </div>

                <!-- 已登录状态 -->
                <div id="loggedInSection" style="display: none;">
                    <div class="profile-section">
                        <h3>登录状态</h3>
                        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div id="userAvatar" style="width: 50px; height: 50px; background: linear-gradient(135deg, #2563eb, #60a5fa); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 500;">U</div>
                            <div style="flex: 1;">
                                <h4 id="userName" style="margin: 0 0 4px 0; color: #333; font-size: 16px;">用户</h4>
                                <p id="userPhone" style="margin: 0; color: #666; font-size: 14px;"></p>
                            </div>
                            <button type="button" id="btnLogout" style="padding: 8px 16px; background: #f5f5f5; color: #666; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">退出</button>
                        </div>
                    </div>

                    <div class="profile-section">
                        <h3>客户端权限</h3>
                        <div id="accessStatus" style="padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span id="accessIcon" style="font-size: 22px;">⏳</span>
                                <div>
                                    <p id="accessMessage" style="margin: 0; color: #333; font-weight: 500;">检查权限中...</p>
                                    <p id="accessExpire" style="margin: 4px 0 0 0; color: #666; font-size: 13px;"></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-section">
                        <h3>剪映路径设置</h3>
                        <div class="form-group">
                            <label for="profileJianyingPath">剪映草稿目录：</label>
                            <div class="input-group">
                                <input type="text" id="profileJianyingPath" class="form-control" placeholder="请选择或输入剪映草稿目录">
                                <button type="button" class="btn btn-secondary" id="browsePathBtn">浏览</button>
                            </div>
                            <div id="profilePathStatus" class="path-status" style="display: none;"></div>
                        </div>
                    </div>

                    <div class="profile-section">
                        <h3>使用说明</h3>
                        <div style="color: #666; line-height: 1.8; font-size: 14px;">
                            <p><strong>权限说明：</strong></p>
                            <p>• 普通用户：免费使用 <strong>1年</strong></p>
                            <p>• 课程学员：免费使用 <strong>3年</strong></p>
                            <p style="margin-top: 12px;"><strong>使用步骤：</strong></p>
                            <p>1. 在Coze中生成剪映草稿JSON</p>
                            <p>2. 复制JSON链接到本客户端</p>
                            <p>3. 点击导入，自动下载素材并生成剪映项目</p>
                        </div>
                    </div>
                </div>

                <!-- 微信二维码弹窗 -->
                <div id="wechatQrModal" class="modal-overlay">
                    <div class="modal-content">
                        <button type="button" id="btnCloseQrModal" class="modal-close">×</button>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                            <svg width="26" height="26" fill="#07C160" viewBox="0 0 24 24">
                                <path d="M8.694 13.908c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.73 0 1.392.567 1.392 1.392 0 .827-.662 1.393-1.392 1.393zm6.658 0c-.732 0-1.393-.566-1.393-1.393 0-.825.66-1.392 1.393-1.392.732 0 1.393.567 1.393 1.392 0 .827-.66 1.393-1.393 1.393zM12 2C6.477 2 2 6.136 2 11.238c0 2.872 1.417 5.438 3.647 7.116-.16.896-.583 2.502-.667 2.858-.11.458.384.625.668.455.517-.308 3.525-2.228 4.093-2.658.74.205 1.517.316 2.31.316 5.474 0 9.95-4.135 9.95-9.237C22.002 4.965 17.525 2 12 2z"/>
                            </svg>
                            <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0;">微信扫码登录</h3>
                        </div>
                        <p style="font-size: 14px; color: #666; margin: 0;">请使用微信扫描二维码完成登录</p>
                        <div class="qr-container">
                            <div id="wechatQrLoading" class="qr-loading">加载中...</div>
                            <img id="wechatQrImage" class="qr-image" src="" alt="微信登录二维码" style="display: none;">
                        </div>
                        <p id="pollingText" class="polling-status">等待扫码中...</p>
                        <button type="button" id="btnRefreshQr" class="btn-refresh-qr">刷新二维码</button>
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
            `;

            this.updatePathDisplay();
            window.JianyingApp.utils.addLog('[ProfileModule] 页面渲染完成', 'info');
        },

        /**
         * 绑定事件
         */
        bindEvents() {
            // 发送验证码
            document.getElementById('btnSendCode')?.addEventListener('click', () => this.handleSendSmsCode());

            // 手机验证码登录
            document.getElementById('btnSmsLogin')?.addEventListener('click', () => this.handleSmsLogin());

            // 微信登录
            document.getElementById('btnWechatLogin')?.addEventListener('click', () => this.handleWechatLogin());

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
            document.getElementById('btnCloseQrModal')?.addEventListener('click', () => this.closeWechatQrModal());
            document.getElementById('btnRefreshQr')?.addEventListener('click', () => this.handleWechatLogin());

            // 点击弹窗外部关闭
            ['wechatQrModal', 'termsModal', 'privacyModal'].forEach(modalId => {
                document.getElementById(modalId)?.addEventListener('click', (e) => {
                    if (e.target.id === modalId) {
                        if (modalId === 'wechatQrModal') {
                            this.closeWechatQrModal();
                        } else {
                            this.hideModal(modalId);
                        }
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

            // 浏览路径
            document.getElementById('browsePathBtn')?.addEventListener('click', () => this.handleBrowsePath());

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
            const btnWechatLogin = document.getElementById('btnWechatLogin');

            if (btnSendCode && !this.smsAvailable) {
                btnSendCode.textContent = '暂不可用';
                btnSendCode.disabled = true;
            }

            if (btnWechatLogin && !this.wechatAvailable) {
                btnWechatLogin.disabled = true;
            }
        },

        /**
         * 处理协议勾选变化
         */
        handleAgreementChange(checked) {
            this.agreedToTerms = checked;
            console.log('[ProfileModule] 协议勾选状态:', checked);
            console.log('[ProfileModule] 微信可用:', this.wechatAvailable);
            console.log('[ProfileModule] 已自动触发:', this.wechatAutoTriggered);

            // 当用户勾选协议且微信可用且还没自动触发过时，自动弹出微信二维码
            if (checked && this.wechatAvailable && !this.wechatAutoTriggered) {
                this.wechatAutoTriggered = true;
                console.log('[ProfileModule] 准备自动弹出微信二维码...');

                // 延迟300ms弹出二维码
                setTimeout(() => {
                    this.handleWechatLogin();
                }, 300);
            }
        },

        /**
         * 检查登录状态
         */
        async checkLoginStatus() {
            if (!this.token) {
                this.showNotLoggedIn();
                return;
            }

            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.userInfo, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const result = await response.json();

                if (!result.success) {
                    this.clearLoginState();
                    this.showNotLoggedIn();
                    return;
                }

                this.userInfo = result.data;
                localStorage.setItem('jianying_user_info', JSON.stringify(this.userInfo));
                this.showLoggedIn();
                this.checkClientAccess();

            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 检查登录状态失败: ${error.message}`, 'error');
                this.showNotLoggedIn();
            }
        },

        /**
         * 检查客户端访问权限
         */
        async checkClientAccess() {
            try {
                const response = await fetch(window.API_ENDPOINTS.jianyingClient.checkAccess, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

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

            } catch (error) {
                window.JianyingApp.utils.addLog(`[ProfileModule] 检查权限失败: ${error.message}`, 'error');
                this.updateAccessStatus('error', '❌', '网络错误，请检查网络连接');
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
                        'Content-Type': 'application/json'
                    }
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
            if (confirm('确定要退出登录吗？')) {
                this.clearLoginState();
                this.showNotLoggedIn();
                this.lockFunctions();
                this.agreedToTerms = false;
                this.wechatAutoTriggered = false;
                const agreeTerms = document.getElementById('agreeTerms');
                if (agreeTerms) agreeTerms.checked = false;
                window.JianyingApp.utils.addLog('[ProfileModule] 已退出登录', 'info');
            }
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
