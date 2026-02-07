/**
 * 草稿导入模块 (import-module.js)
 * 负责草稿导入页面的UI渲染和功能处理
 */

(function() {
    'use strict';

    // 草稿导入模块
    const ImportModule = {
        // 模块状态
        isInitialized: false,
        isImporting: false,

        /**
         * 模块初始化
         */
        init() {
            try {
                // 等待DOM加载完成
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        this.render();
                        this.bindEvents();
                    });
                } else {
                    this.render();
                    this.bindEvents();
                }

                this.isInitialized = true;
                window.JianyingApp.utils.addLog('[ImportModule] 草稿导入模块初始化完成', 'success');

                // 发出模块就绪事件
                window.JianyingApp.events.emit('importModuleReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[ImportModule] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 渲染草稿导入页面内容
         */
        render() {
            const importPage = document.getElementById('import-page');
            if (!importPage) {
                window.JianyingApp.utils.addLog('[ImportModule] 未找到import-page容器', 'error');
                return;
            }

            importPage.innerHTML = `
                <h2 style="color: #333; margin-bottom: 25px;">📥 草稿导入</h2>

                <!-- 未登录/无权限提示 -->
                <div id="accessBlocker" style="display: none; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔒</div>
                    <h4 id="blockerTitle" style="color: #856404; margin: 0 0 10px 0;">请先登录</h4>
                    <p id="blockerMessage" style="color: #856404; margin: 0;">登录后即可使用草稿导入功能</p>
                </div>

                <!-- 草稿链接输入区域 -->
                <div class="import-section">
                    <h3>🔗 批量草稿链接输入</h3>
                    <div class="form-group">
                        <label for="draftUrl">草稿链接（支持批量输入）：</label>
                        <textarea 
                            id="draftUrl" 
                            class="form-control" 
                            rows="6" 
                            placeholder="输入草稿地址，多个使用回车换行分隔，例如：
草稿地址1
草稿地址2
草稿地址3

支持的链接格式：
• https://jianying-drafts-storage.oss-cn-guangzhou.aliyuncs.com/xxx.json
• https://video-snot-12220.oss-cn-shanghai.aliyuncs.com/xxx.json
• 其他OSS存储链接"
                            style="font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.4;"
                        ></textarea>
                        <div class="url-hint">
                            <strong>💡 使用说明：</strong> 
                            <br>• 每行输入一个草稿链接，支持同时导入多个草稿
                            <br>• 链接必须是完整的JSON文件下载地址，通常以.json结尾
                            <br>• 系统会按顺序依次处理每个链接
                        </div>
                    </div>
                </div>

                <!-- 导入操作区域 - 简化版 -->
                <div class="import-action-center">
                    <button type="button" class="btn btn-success btn-lg" id="startImportBtn" style="font-size: 18px; padding: 15px 40px; margin: 20px 0;">
                        🎬 开始导入项目
                    </button>
                </div>

                <!-- 进度显示区域 - 扩大版 -->
                <div class="progress-section-large" id="progressSection">
                    <div class="progress-header">
                        <h3>📊 导入进度</h3>
                        <button type="button" class="btn btn-sm btn-secondary" id="clearLogBtn">
                            🗑️ 清除日志
                        </button>
                    </div>
                    <div class="progress-info">
                        <span id="progressText">准备开始...</span>
                        <span id="progressPercent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="status-log-large" id="statusLog">
                        <div class="log-entry log-info">[等待] 请粘贴草稿链接并点击开始导入...</div>
                    </div>
                </div>
            `;

            // 页面渲染完成后检查访问状态
            this.updateAccessBlocker();

            window.JianyingApp.utils.addLog('[ImportModule] 草稿导入页面渲染完成', 'info');
        },

        /**
         * 更新访问限制提示
         */
        updateAccessBlocker() {
            const blocker = document.getElementById('accessBlocker');
            const blockerTitle = document.getElementById('blockerTitle');
            const blockerMessage = document.getElementById('blockerMessage');
            const startBtn = document.getElementById('startImportBtn');
            const profileModule = window.JianyingApp.modules.profileModule;

            if (!blocker) return;

            const isLoggedIn = profileModule && profileModule.isLoggedIn();
            const hasAccess = window.JianyingApp.state.clientAccessAllowed;

            if (!isLoggedIn) {
                blocker.style.display = 'block';
                blockerTitle.textContent = '请先登录';
                blockerMessage.textContent = '请在个人中心登录后使用草稿导入功能';
                if (startBtn) startBtn.disabled = true;
            } else if (!hasAccess) {
                blocker.style.display = 'block';
                blockerTitle.textContent = '无使用权限';
                blockerMessage.textContent = '您的客户端使用权限已过期或尚未授权，请在个人中心查看详情';
                if (startBtn) startBtn.disabled = true;
            } else {
                blocker.style.display = 'none';
                if (startBtn) startBtn.disabled = false;
            }
        },

        /**
         * 绑定事件监听
         */
        bindEvents() {
            // 开始导入按钮事件
            const startBtn = document.getElementById('startImportBtn');
            if (startBtn) {
                startBtn.addEventListener('click', () => this.handleStartImport());
            }

            // 清除日志按钮事件
            const clearLogBtn = document.getElementById('clearLogBtn');
            if (clearLogBtn) {
                clearLogBtn.addEventListener('click', () => this.handleClearLog());
            }

            // 草稿URL输入框事件
            const urlInput = document.getElementById('draftUrl');
            if (urlInput) {
                urlInput.addEventListener('input', () => this.handleUrlInput());
                urlInput.addEventListener('paste', () => {
                    // 延迟处理粘贴内容
                    setTimeout(() => this.handleUrlInput(), 100);
                });
            }

            // 监听全局路径变化事件
            window.JianyingApp.events.on('pathChanged', () => {
                this.syncPathFromGlobal();
            });

            // 监听路径同步事件
            window.JianyingApp.events.on('pathSynced', (path) => {
                const pathInput = document.getElementById('jianyingPath');
                if (pathInput) {
                    pathInput.value = path;
                    this.showPathStatus('✅ 路径已从个人中心同步', 'success');
                }
            });

            // 监听权限变化事件
            window.JianyingApp.events.on('clientAccessChanged', () => {
                this.updateAccessBlocker();
            });
        },

        /**
         * 处理去设置按钮
         */
        handleGoToSettings() {
            // 切换到个人中心页面
            window.JianyingApp.navigation.switchPage('profile');
            window.JianyingApp.utils.addLog('[ImportModule] 跳转到个人中心设置页面', 'info');
        },

        /**
         * 处理清除日志
         */
        handleClearLog() {
            this.clearLog();
            this.addLogEntry('[系统] 日志已清除', 'info');
            window.JianyingApp.utils.addLog('[ImportModule] 用户清除了导入日志', 'info');
        },

        /**
         * 显示路径设置提示弹窗
         */
        showPathSettingAlert() {
            const result = confirm('⚠️ 检测到您还未设置剪映草稿路径！\n\n请先到个人中心设置正确的剪映草稿路径，然后再进行导入操作。\n\n是否现在前往个人中心设置？');
            
            if (result) {
                // 切换到个人中心页面
                if (window.JianyingApp && window.JianyingApp.navigation) {
                    window.JianyingApp.navigation.showPage('profile');
                } else {
                    // 备用方法：直接点击个人中心导航
                    const profileNav = document.querySelector('[data-page="profile"]');
                    if (profileNav) {
                        profileNav.click();
                    }
                }
            }
        },

        /**
         * 处理URL输入
         */
        handleUrlInput() {
            const urlInput = document.getElementById('draftUrl');
            const url = urlInput.value.trim();
            
            if (url) {
                // 简单的URL格式验证
                if (this.isValidDraftUrl(url)) {
                    // URL看起来有效，可以启用导入按钮
                    this.updateImportButtonState();
                } else {
                    // URL格式不正确
                    window.JianyingApp.utils.addLog('[ImportModule] URL格式不正确', 'warning');
                }
            }
            
            this.updateImportButtonState();
        },

        /**
         * 验证草稿URL格式
         */
        isValidDraftUrl(url) {
            try {
                const urlObj = new URL(url);
                // 检查是否是HTTPS协议
                if (urlObj.protocol !== 'https:') return false;
                // 检查是否以.json结尾
                if (!urlObj.pathname.endsWith('.json')) return false;
                // 检查是否包含常见的OSS域名
                const validDomains = [
                    'aliyuncs.com',
                    'oss-cn-',
                    'coze.cn'
                ];
                return validDomains.some(domain => urlObj.hostname.includes(domain));
            } catch (error) {
                return false;
            }
        },

        /**
         * 更新导入按钮状态
         */
        updateImportButtonState() {
            const startBtn = document.getElementById('startImportBtn');
            const urlInput = document.getElementById('draftUrl');
            const currentPath = window.JianyingApp.modules.pathManager?.getCurrentPath();
            
            if (startBtn && urlInput) {
                const hasValidUrl = this.isValidDraftUrl(urlInput.value.trim());
                const hasValidPath = currentPath && currentPath.length > 0;
                
                startBtn.disabled = !hasValidUrl || !hasValidPath || this.isImporting;
                
                if (hasValidUrl && hasValidPath && !this.isImporting) {
                    startBtn.textContent = '🎬 开始导入项目';
                    startBtn.className = 'btn btn-success';
                } else if (this.isImporting) {
                    startBtn.textContent = '⏳ 正在导入...';
                    startBtn.className = 'btn btn-secondary';
                } else if (!hasValidPath) {
                    startBtn.textContent = '⚠️ 请先设置路径';
                    startBtn.className = 'btn btn-warning';
                } else {
                    startBtn.textContent = '🎬 开始导入项目';
                    startBtn.className = 'btn btn-success';
                }
            }
        },

        /**
         * 处理开始导入
         */
        async handleStartImport() {
            if (this.isImporting) {
                window.JianyingApp.utils.addLog('[ImportModule] 导入正在进行中，请等待完成', 'warning');
                return;
            }

            // 检查登录和权限状态
            const profileModule = window.JianyingApp.modules.profileModule;
            if (!profileModule || !profileModule.isLoggedIn()) {
                this.addLogEntry('❌ 请先登录后再使用导入功能', 'error');
                alert('请先在个人中心登录后再使用导入功能');
                return;
            }

            if (!window.JianyingApp.state.clientAccessAllowed) {
                this.addLogEntry('❌ 您没有客户端使用权限或权限已过期', 'error');
                alert('您没有客户端使用权限或权限已过期，请在个人中心查看详情');
                return;
            }

            const urlInput = document.getElementById('draftUrl');
            const inputText = urlInput.value.trim();
            const jianyingPath = window.JianyingApp.modules.pathManager?.getCurrentPath();

            // 验证输入
            if (!inputText) {
                this.addLogEntry('❌ 请输入草稿链接', 'error');
                return;
            }

            if (!jianyingPath) {
                this.addLogEntry('❌ 请先在个人中心设置剪映路径', 'error');
                // 弹窗提示用户去设置路径
                this.showPathSettingAlert();
                return;
            }

            // 解析多个链接（按行分割）
            const draftUrls = inputText.split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);

            if (draftUrls.length === 0) {
                this.addLogEntry('❌ 未找到有效的草稿链接', 'error');
                return;
            }

            // 验证所有链接格式
            const invalidUrls = draftUrls.filter(url => !this.isValidDraftUrl(url));
            if (invalidUrls.length > 0) {
                this.addLogEntry(`❌ 发现 ${invalidUrls.length} 个无效链接，请检查格式`, 'error');
                invalidUrls.forEach(url => {
                    this.addLogEntry(`  • ${url}`, 'error');
                });
                return;
            }

            // 开始批量导入流程
            this.startBatchImportProcess(draftUrls, jianyingPath);
        },

        /**
         * 开始批量导入流程
         */
        async startBatchImportProcess(draftUrls, jianyingPath) {
            const startTime = Date.now();
            
            this.isImporting = true;
            this.updateImportButtonState();
            this.showProgressSection();
            this.clearLog();

            try {
                // 开始批量导入日志
                this.addLogEntry(`🚀 开始批量下载剪映草稿...`, 'info');
                this.addLogEntry(`开始处理草稿下载，共有 ${draftUrls.length} 个草稿地址`, 'info');
                
                let successCount = 0;
                let failedCount = 0;
                const failedUrls = [];

                // 逐个处理每个链接
                for (let i = 0; i < draftUrls.length; i++) {
                    const draftUrl = draftUrls[i];
                    const currentIndex = i + 1;
                    
                    try {
                        this.addLogEntry(`开始处理第 ${currentIndex} 个草稿: ${draftUrl}`, 'info');
                        
                        // 更新总体进度
                        const overallProgress = Math.floor((i / draftUrls.length) * 100);
                        this.updateProgress(`正在处理第 ${currentIndex}/${draftUrls.length} 个草稿...`, overallProgress);

                        // 处理单个草稿
                        await this.processSingleDraft(draftUrl, jianyingPath, currentIndex, draftUrls.length);
                        
                        successCount++;
                        this.addLogEntry(`✅ 第 ${currentIndex} 个草稿处理完成`, 'success');
                        
                    } catch (error) {
                        failedCount++;
                        failedUrls.push({ url: draftUrl, error: error.message });
                        this.addLogEntry(`❌ 第 ${currentIndex} 个草稿处理失败: ${error.message}`, 'error');
                        // 继续处理下一个，不中断整个批量流程
                    }
                }

                // 批量导入完成总结
                this.updateProgress('批量导入完成', 100);
                this.addLogEntry(`📊 批量导入完成统计:`, 'info');
                this.addLogEntry(`  • 成功: ${successCount} 个`, 'success');
                this.addLogEntry(`  • 失败: ${failedCount} 个`, failedCount > 0 ? 'error' : 'info');
                
                if (failedUrls.length > 0) {
                    this.addLogEntry(`失败的链接:`, 'error');
                    failedUrls.forEach((failed, index) => {
                        this.addLogEntry(`  ${index + 1}. ${failed.url} - ${failed.error}`, 'error');
                    });
                }

                this.addLogEntry(`✅ 批量下载完成: 成功处理 ${successCount}/${draftUrls.length} 个草稿`, 'success');

                // 保存批量导入的历史记录
                const historyRecord = {
                    url: `批量导入 (${draftUrls.length}个链接)`,
                    projectName: `批量草稿导入_${new Date().toLocaleDateString()}`,
                    status: failedCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed'),
                    duration: this.formatDuration(Date.now() - startTime),
                    fileCount: successCount,
                    totalSize: this.calculateBatchSize(successCount),
                    batchInfo: {
                        total: draftUrls.length,
                        success: successCount,
                        failed: failedCount,
                        failedUrls: failedUrls.map(f => f.url)
                    }
                };

                // 触发历史记录保存事件
                if (window.JianyingApp && window.JianyingApp.events) {
                    window.JianyingApp.events.emit('importCompleted', historyRecord);
                }

            } catch (error) {
                this.addLogEntry(`❌ 批量导入过程出错: ${error.message}`, 'error');
                this.updateProgress('批量导入失败', 0);
                console.error('[ImportModule] 批量导入过程出错:', error);
            } finally {
                this.isImporting = false;
                this.updateImportButtonState();
            }
        },

        /**
         * 处理单个草稿（从批量导入中提取的通用方法）
         */
        async processSingleDraft(draftUrl, jianyingPath, currentIndex, totalCount) {
            // 使用现有的单个导入逻辑，但适配批量导入的日志格式
            await this.startSingleImportProcess(draftUrl, jianyingPath, currentIndex, totalCount);
        },

        /**
         * 开始单个导入流程（重构后的原始方法）
         */
        async startSingleImportProcess(draftUrl, jianyingPath, currentIndex = 1, totalCount = 1) {
            const startTime = Date.now();
            
            try {
                // 开始导入日志
                if (totalCount === 1) {
                    this.addLogEntry(`🚀 开始下载剪映草稿...`, 'info');
                    this.addLogEntry(`开始处理草稿下载，共有 1 个草稿地址`, 'info');
                    this.addLogEntry(`开始处理第 1 个草稿: ${draftUrl}`, 'info');
                }
                this.updateProgress('正在解析草稿地址...', 5);

                // 1. 下载并解析草稿JSON
                this.addLogEntry(`正在解析剪映草稿地址: ${draftUrl}`, 'info');
                this.addLogEntry(`请求解析剪映草稿: ${draftUrl}`, 'info');
                
                const downloadCore = window.JianyingApp.modules.downloadCore;
                if (!downloadCore) {
                    throw new Error('下载核心模块未加载');
                }

                let draftData;
                try {
                    draftData = await downloadCore.downloadDraftJson(draftUrl);
                    this.addLogEntry(`草稿解析请求成功`, 'success');
                    this.addLogEntry(`草稿解析成功，准备下载资源`, 'success');
                } catch (error) {
                    throw new Error(`草稿JSON下载失败: ${error.message}`);
                }

                // 2. 提取资源列表
                const resources = downloadCore.extractResourceUrls(draftData);
                
                if (resources.length === 0) {
                    this.addLogEntry(`⚠️ 警告: 未检测到任何资源文件，这可能是一个空白草稿`, 'warning');
                    // 即使没有资源，也继续创建项目结构
                }

                // 按类型统计资源
                const resourceStats = {
                    audios: resources.filter(r => r.type === 'audio').length,
                    images: resources.filter(r => r.type === 'image').length,
                    videos: resources.filter(r => r.type === 'video').length
                };

                // 保存资源统计信息到实例变量，供后续使用
                this.currentResourceStats = resourceStats;
                this.currentResourceProgress = {
                    audios: { downloaded: 0, total: resourceStats.audios },
                    images: { downloaded: 0, total: resourceStats.images },
                    videos: { downloaded: 0, total: resourceStats.videos }
                };

                this.addLogEntry(`检测到音频资源: ${resourceStats.audios} 个，图片资源: ${resourceStats.images} 个，视频资源: ${resourceStats.videos} 个`, 'info');

                // 3. 创建项目目录结构
                const projectId = draftData.id || this.generateProjectId();
                const resourceFolderId = this.generateProjectId();
                
                this.updateProgress('正在创建资源目录...', 20);
                
                const { projectPath, resourcePath } = downloadCore.createProjectStructure(
                    jianyingPath, 
                    projectId, 
                    resourceFolderId
                );
                
                this.addLogEntry(`创建资源目录: ${projectPath}`, 'info');

                // 4. 下载资源文件
                if (resources.length > 0) {
                    this.updateProgress('开始下载资源文件...', 25);
                    
                    let downloadedCount = 0;
                    const totalResources = resources.length;
                    
                    for (const resource of resources) {
                        if (resource.downloadUrl) {
                            try {
                                // 获取当前类型的进度信息（在更新之前）
                                const currentProgress = this.currentResourceProgress[resource.type + 's'];
                                const currentCount = currentProgress ? currentProgress.downloaded + 1 : downloadedCount + 1;
                                const totalCount = currentProgress ? currentProgress.total : totalResources;
                                
                                this.addLogEntry(`开始下载${resource.type} ${currentCount}/${totalCount}`, 'info');
                                this.addLogEntry(`开始下载文件: ${resource.downloadUrl}`, 'info');
                                
                                const path = window.require('path');
                                const localFilePath = path.join(resourcePath, resource.fileName);
                                
                                await downloadCore.downloadResource(
                                    resource.downloadUrl,
                                    localFilePath,
                                    (percent) => {
                                        // 更新单个文件下载进度
                                    }
                                );
                                
                                this.addLogEntry(`文件下载完成: ${resource.fileName}`, 'success');
                                
                                // 更新当前类型的进度计数（下载成功后）
                                if (currentProgress) {
                                    currentProgress.downloaded++;
                                }
                                downloadedCount++;
                                
                                // 更新总体进度 (25% - 85%)
                                const overallProgress = 25 + Math.floor((downloadedCount / totalResources) * 60);
                                
                                // 构建详细的进度信息
                                const progressDetails = this.buildProgressDetails();
                                this.updateProgress(`正在下载资源文件... ${progressDetails}`, overallProgress);
                                
                                this.addLogEntry(`下载进度: 当前第1/1 - ${resource.type} ${currentCount}/${totalCount}`, 'info');
                                
                            } catch (error) {
                                this.addLogEntry(`❌ 下载失败: ${resource.fileName} - ${error.message}`, 'error');
                                this.addLogEntry(`⚠️ 跳过该文件，继续下载其他资源...`, 'warning');
                                // 继续下载其他文件，不中断整个流程
                            }
                        } else {
                            this.addLogEntry(`⚠️ 跳过无效资源: ${resource.fileName} (无下载URL)`, 'warning');
                            downloadedCount++;
                        }
                    }
                } else {
                    this.addLogEntry(`跳过资源下载阶段（无资源文件）`, 'info');
                }

                // 5. 生成项目配置文件
                this.updateProgress('正在生成草稿文件...', 90);
                this.addLogEntry(`创建剪映草稿文件: ${projectId}`, 'info');
                
                try {
                    downloadCore.generateProjectFiles(projectPath, draftData, resourceFolderId);
                    this.addLogEntry(`保存草稿内容文件: ${projectId}.json`, 'info');
                    this.addLogEntry(`保存草稿信息文件成功`, 'success');
                } catch (error) {
                    this.addLogEntry(`⚠️ 配置文件生成部分失败: ${error.message}`, 'warning');
                }

                // 6. 完成
                this.addLogEntry(`第 1 个草稿处理完成，保存至: ${projectPath}`, 'success');
                this.addLogEntry(`✅ 下载完成: 剪映草稿已成功下载`, 'success');
                this.updateProgress('导入完成', 100);

                // 保存到历史记录
                const historyRecord = {
                    url: draftUrl,
                    projectName: draftData.name || `草稿项目_${projectId}`,
                    status: 'success',
                    duration: this.formatDuration(Date.now() - startTime),
                    fileCount: resources.length,
                    totalSize: this.calculateTotalSize(resources),
                    projectPath: projectPath,
                    resourceStats: this.currentResourceStats
                };

                // 触发历史记录保存事件
                if (window.JianyingApp && window.JianyingApp.events) {
                    window.JianyingApp.events.emit('importCompleted', historyRecord);
                }

                // 更新统计
                window.JianyingApp.utils.updateState('userStats.todayImports', 
                    window.JianyingApp.state.userStats.todayImports + 1);

            } catch (error) {
                this.addLogEntry(`❌ 导入失败: ${error.message}`, 'error');
                this.updateProgress('导入失败', 0);
                console.error('[ImportModule] 导入过程出错:', error);
            } finally {
                this.isImporting = false;
                this.updateImportButtonState();
            }
        },

        /**
         * 开始导入流程（兼容单个和批量）
         */
        async startImportProcess(draftUrl, jianyingPath) {
            // 调用批量导入，传入单个URL
            await this.startBatchImportProcess([draftUrl], jianyingPath);
        },

        /**
         * 模拟资源下载
         */
        async simulateResourceDownload(resourceType, count, startProgress, endProgress) {
            const progressStep = (endProgress - startProgress) / count;
            
            for (let i = 1; i <= count; i++) {
                this.addLogEntry(`开始下载${resourceType} ${i}/${count}`, 'info');
                
                // 模拟下载URL
                const mockUrl = this.generateMockUrl(resourceType);
                this.addLogEntry(`开始下载文件: ${mockUrl}`, 'info');
                
                // 模拟下载时间
                await this.delay(Math.random() * 500 + 200);
                
                // 生成文件名
                const fileName = this.generateFileName(resourceType);
                this.addLogEntry(`文件下载完成: ${fileName}`, 'success');
                this.addLogEntry(`下载进度: 当前第1/1 - ${resourceType} ${i}/${count}`, 'info');
                
                // 更新进度
                const currentProgress = startProgress + (progressStep * i);
                this.updateProgress(`正在下载${resourceType}文件 ${i}/${count}`, Math.round(currentProgress));
            }
        },

        /**
         * 生成项目ID
         */
        generateProjectId() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * 构建详细的进度信息
         */
        buildProgressDetails() {
            if (!this.currentResourceProgress) {
                return '';
            }
            
            const details = [];
            const progress = this.currentResourceProgress;
            
            if (progress.audios.total > 0) {
                details.push(`音频 ${progress.audios.downloaded}/${progress.audios.total}`);
            }
            if (progress.images.total > 0) {
                details.push(`图片 ${progress.images.downloaded}/${progress.images.total}`);
            }
            if (progress.videos.total > 0) {
                details.push(`视频 ${progress.videos.downloaded}/${progress.videos.total}`);
            }
            
            return details.length > 0 ? `(${details.join(', ')})` : '';
        },

        /**
         * 格式化持续时间
         */
        formatDuration(milliseconds) {
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            if (minutes > 0) {
                return `${minutes}分${remainingSeconds}秒`;
            } else {
                return `${remainingSeconds}秒`;
            }
        },

        /**
         * 计算总文件大小
         */
        calculateTotalSize(resources) {
            // 这里可以根据实际下载的文件大小来计算
            // 暂时返回估算值
            const estimatedSize = resources.length * 2.5; // 每个文件平均2.5MB
            
            if (estimatedSize >= 1024) {
                return `${(estimatedSize / 1024).toFixed(1)}GB`;
            } else {
                return `${estimatedSize.toFixed(1)}MB`;
            }
        },

        /**
         * 计算批量导入的总大小
         */
        calculateBatchSize(successCount) {
            const estimatedSize = successCount * 15; // 每个项目平均15MB
            
            if (estimatedSize >= 1024) {
                return `${(estimatedSize / 1024).toFixed(1)}GB`;
            } else {
                return `${estimatedSize.toFixed(1)}MB`;
            }
        },

        /**
         * 生成模拟URL
         */
        generateMockUrl(resourceType) {
            const domains = {
                '音频': 'lf3-lv-music-tos.faceu.com',
                '图片': 's.coze.cn',
                '视频': 'video-storage.example.com'
            };
            
            const domain = domains[resourceType] || 'example.com';
            const randomId = Math.random().toString(36).substring(2, 15);
            
            return `https://${domain}/obj/tos-cn-ve-2774/${randomId}`;
        },

        /**
         * 生成文件名
         */
        generateFileName(resourceType) {
            const extensions = {
                '音频': 'mp3',
                '图片': 'png',
                '视频': 'mp4'
            };
            
            const ext = extensions[resourceType] || 'file';
            const uuid = this.generateProjectId();
            
            return `${uuid}.${ext}`;
        },

        /**
         * 延迟函数
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * 显示进度区域
         */
        showProgressSection() {
            const progressSection = document.getElementById('progressSection');
            if (progressSection) {
                progressSection.classList.add('active');
            }
        },

        /**
         * 更新进度
         */
        updateProgress(text, percent) {
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            const progressFill = document.getElementById('progressFill');

            if (progressText) progressText.textContent = text;
            if (progressPercent) progressPercent.textContent = `${percent}%`;
            if (progressFill) progressFill.style.width = `${percent}%`;
        },

        /**
         * 添加日志条目
         */
        addLogEntry(message, type = 'info') {
            const statusLog = document.getElementById('statusLog');
            if (statusLog) {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-${type}`;
                
                // 格式化时间戳，与竞品保持一致
                const now = new Date();
                const timeStr = now.toLocaleTimeString('zh-CN', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                logEntry.textContent = `[${timeStr}]${message}`;
                statusLog.appendChild(logEntry);
                statusLog.scrollTop = statusLog.scrollHeight;
            }
            
            // 同时添加到全局日志
            window.JianyingApp.utils.addLog(`[ImportModule] ${message}`, type);
        },

        /**
         * 清空日志
         */
        clearLog() {
            const statusLog = document.getElementById('statusLog');
            if (statusLog) {
                statusLog.innerHTML = '';
            }
        },

        /**
         * 显示路径状态
         */
        showPathStatus(message, type) {
            const statusDiv = document.getElementById('pathStatus');
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.className = `path-status ${type}`;
                statusDiv.style.display = 'block';
            }
        },

        /**
         * 隐藏路径状态
         */
        hidePathStatus() {
            const statusDiv = document.getElementById('pathStatus');
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
        },

        /**
         * 从全局状态同步路径
         */
        syncPathFromGlobal() {
            const pathDisplay = document.getElementById('currentPathDisplay');
            const currentPath = window.JianyingApp.modules.pathManager?.getCurrentPath();
            
            if (pathDisplay) {
                if (currentPath) {
                    pathDisplay.textContent = currentPath;
                    pathDisplay.style.color = '#28a745';
                    this.showPathStatus(`✅ 路径已设置: ${currentPath}`, 'success');
                } else {
                    pathDisplay.textContent = '未设置';
                    pathDisplay.style.color = '#dc3545';
                    this.showPathStatus('⚠️ 请先在个人中心设置剪映路径', 'warning');
                }
            }
            
            // 更新导入按钮状态
            this.updateImportButtonState();
        }
    };

    // 注册模块到全局应用对象
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.importModule = ImportModule;
        
        // 如果应用已经就绪，立即初始化
        if (document.readyState === 'complete') {
            ImportModule.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => {
                ImportModule.init();
            });
        }
    } else {
        console.error('[ImportModule] JianyingApp全局对象未找到，模块注册失败');
    }

})();
