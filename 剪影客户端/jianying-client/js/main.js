/**
 * 主应用逻辑文件 (main.js)
 * 负责应用的初始化和模块间的协调
 */

(function() {
    'use strict';

    // 主应用逻辑
    const MainApp = {
        // 初始化状态
        isInitialized: false,

        /**
         * 应用初始化
         */
        init() {
            try {
                window.JianyingApp.utils.addLog('[MainApp] 开始初始化主应用逻辑', 'info');

                // 绑定全局事件
                this.bindGlobalEvents();

                // 初始化应用状态
                this.initializeAppState();

                // 检查模块加载状态
                this.checkModulesStatus();

                this.isInitialized = true;
                window.JianyingApp.utils.addLog('[MainApp] 主应用逻辑初始化完成', 'success');

                // 发出主应用就绪事件
                window.JianyingApp.events.emit('mainAppReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[MainApp] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 绑定全局事件
         */
        bindGlobalEvents() {
            // 监听应用就绪事件
            window.JianyingApp.events.on('appReady', () => {
                this.onAppReady();
            });

            // 监听模块就绪事件
            window.JianyingApp.events.on('pathManagerReady', () => {
                window.JianyingApp.utils.addLog('[MainApp] 路径管理模块已就绪', 'success');
            });

            window.JianyingApp.events.on('importModuleReady', () => {
                window.JianyingApp.utils.addLog('[MainApp] 草稿导入模块已就绪', 'success');
            });

            window.JianyingApp.events.on('profileModuleReady', () => {
                window.JianyingApp.utils.addLog('[MainApp] 个人中心模块已就绪', 'success');
            });

            // 监听页面切换事件
            window.JianyingApp.events.on('pageChanged', (pageName) => {
                this.onPageChanged(pageName);
            });

            // 监听状态变化事件
            window.JianyingApp.events.on('stateChanged', (data) => {
                this.onStateChanged(data);
            });

            // 监听路径变化事件
            window.JianyingApp.events.on('pathChanged', (data) => {
                this.onPathChanged(data);
            });

            // 监听应用日志事件
            document.addEventListener('app:log', (event) => {
                this.handleAppLog(event.detail);
            });
        },

        /**
         * 初始化应用状态
         */
        initializeAppState() {
            // 初始化客户端访问权限状态（默认不允许）
            window.JianyingApp.state.clientAccessAllowed = false;

            // 更新今日导入统计显示
            this.updateTodayImportsDisplay();

            // 检查是否有保存的设置
            this.loadUserSettings();

            window.JianyingApp.utils.addLog('[MainApp] 应用状态初始化完成', 'info');
        },

        /**
         * 检查模块加载状态
         */
        checkModulesStatus() {
            const requiredModules = ['pathManager', 'importModule', 'profileModule'];
            const loadedModules = [];
            const missingModules = [];

            requiredModules.forEach(moduleName => {
                if (window.JianyingApp.modules[moduleName]) {
                    loadedModules.push(moduleName);
                } else {
                    missingModules.push(moduleName);
                }
            });

            window.JianyingApp.utils.addLog(`[MainApp] 已加载模块: ${loadedModules.join(', ')}`, 'success');
            
            if (missingModules.length > 0) {
                window.JianyingApp.utils.addLog(`[MainApp] 缺失模块: ${missingModules.join(', ')}`, 'warning');
            }
        },

        /**
         * 应用就绪事件处理
         */
        onAppReady() {
            window.JianyingApp.utils.addLog('[MainApp] 应用已就绪，开始初始化检查', 'info');

            // 检查剪映路径设置
            this.checkJianyingPathSetup();

            // 显示欢迎信息
            this.showWelcomeMessage();
        },

        /**
         * 页面切换事件处理
         */
        onPageChanged(pageName) {
            window.JianyingApp.utils.addLog(`[MainApp] 页面切换到: ${pageName}`, 'info');

            // 根据页面执行特定逻辑
            switch (pageName) {
                case 'import':
                    this.onImportPageActivated();
                    break;
                case 'history':
                    this.onHistoryPageActivated();
                    break;
                case 'profile':
                    this.onProfilePageActivated();
                    break;
            }
        },

        /**
         * 状态变化事件处理
         */
        onStateChanged(data) {
            const { key, oldValue, newValue } = data;
            
            // 处理特定状态变化
            if (key === 'userStats.todayImports') {
                this.updateTodayImportsDisplay();
            }

            if (key === 'jianyingPath') {
                window.JianyingApp.utils.addLog(`[MainApp] 剪映路径已更新: ${newValue}`, 'info');
            }
        },

        /**
         * 路径变化事件处理
         */
        onPathChanged(data) {
            const { path, validation } = data;
            window.JianyingApp.utils.addLog(`[MainApp] 路径变更: ${path} (${validation.message})`, 'success');
            
            // 同步路径到所有相关页面
            this.syncPathToAllPages(path);
        },

        /**
         * 处理应用日志
         */
        handleAppLog(logData) {
            const { message, type, timestamp } = logData;
            
            // 可以在这里添加日志持久化逻辑
            // 或者发送到远程日志服务
            
            // 更新全局状态日志（如果需要）
            const globalLog = document.getElementById('globalStatusLog');
            if (globalLog) {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-${type}`;
                logEntry.textContent = `[${timestamp.toLocaleTimeString()}] ${message}`;
                globalLog.appendChild(logEntry);
                
                // 限制日志条目数量
                while (globalLog.children.length > 100) {
                    globalLog.removeChild(globalLog.firstChild);
                }
            }
        },

        /**
         * 检查剪映路径设置
         */
        checkJianyingPathSetup() {
            const pathManager = window.JianyingApp.modules.pathManager;
            if (pathManager) {
                const currentPath = pathManager.getCurrentPath();
                if (currentPath) {
                    window.JianyingApp.utils.addLog(`[MainApp] 剪映路径已设置: ${currentPath}`, 'success');
                } else {
                    window.JianyingApp.utils.addLog('[MainApp] 未设置剪映路径，请在个人中心进行设置', 'warning');
                }
            }
        },

        /**
         * 显示欢迎信息
         */
        showWelcomeMessage() {
            const welcomeMessages = [
                '欢迎使用剪映草稿导入工具！',
                '请先在个人中心设置剪映路径',
                '然后在草稿导入页面粘贴链接开始导入'
            ];

            welcomeMessages.forEach((message, index) => {
                setTimeout(() => {
                    window.JianyingApp.utils.addLog(`[MainApp] ${message}`, 'info');
                }, index * 1000);
            });
        },

        /**
         * 导入页面激活处理
         */
        onImportPageActivated() {
            // 确保路径已同步
            const pathManager = window.JianyingApp.modules.pathManager;
            if (pathManager) {
                const currentPath = pathManager.getCurrentPath();
                if (currentPath) {
                    pathManager.syncPathToPage('import');
                }
            }
        },

        /**
         * 历史记录页面激活处理
         */
        onHistoryPageActivated() {
            window.JianyingApp.utils.addLog('[MainApp] 历史记录页面已激活', 'info');
            // 这里可以添加历史记录刷新逻辑
        },

        /**
         * 个人中心页面激活处理
         */
        onProfilePageActivated() {
            // 更新统计信息
            this.updateUserStats();
        },

        /**
         * 更新今日导入统计显示
         */
        updateTodayImportsDisplay() {
            const todayCount = window.JianyingApp.state.userStats.todayImports;
            const todayCountElement = document.getElementById('todayCount');
            
            if (todayCountElement) {
                todayCountElement.textContent = todayCount;
            }
        },

        /**
         * 同步路径到所有页面
         */
        syncPathToAllPages(path) {
            const pathInputs = [
                'jianyingPath',           // 导入页面
                'profileJianyingPath'     // 个人中心页面
            ];

            pathInputs.forEach(inputId => {
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    inputElement.value = path;
                }
            });
        },

        /**
         * 加载用户设置
         */
        loadUserSettings() {
            try {
                // 从localStorage加载设置
                const savedSettings = localStorage.getItem('userSettings');
                if (savedSettings) {
                    const settings = JSON.parse(savedSettings);
                    // 应用设置到全局状态
                    Object.keys(settings).forEach(key => {
                        window.JianyingApp.utils.updateState(key, settings[key]);
                    });
                    window.JianyingApp.utils.addLog('[MainApp] 用户设置已加载', 'success');
                }
            } catch (error) {
                window.JianyingApp.utils.addLog(`[MainApp] 加载用户设置失败: ${error.message}`, 'warning');
            }
        },

        /**
         * 保存用户设置
         */
        saveUserSettings() {
            try {
                const settings = {
                    jianyingPath: window.JianyingApp.state.jianyingPath,
                    userStats: window.JianyingApp.state.userStats
                };
                localStorage.setItem('userSettings', JSON.stringify(settings));
                window.JianyingApp.utils.addLog('[MainApp] 用户设置已保存', 'success');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[MainApp] 保存用户设置失败: ${error.message}`, 'warning');
            }
        },

        /**
         * 更新用户统计
         */
        updateUserStats() {
            // 这里可以添加统计更新逻辑
            // 比如计算成功率、下载总量等
            window.JianyingApp.utils.addLog('[MainApp] 用户统计已更新', 'info');
        },

        /**
         * 应用关闭前的清理工作
         */
        cleanup() {
            // 保存用户设置
            this.saveUserSettings();
            
            // 清理事件监听器
            // 这里可以添加清理逻辑
            
            window.JianyingApp.utils.addLog('[MainApp] 应用清理完成', 'info');
        }
    };

    // 注册主应用逻辑到全局对象
    if (window.JianyingApp) {
        window.JianyingApp.mainApp = MainApp;
        
        // 如果应用已经就绪，立即初始化
        if (document.readyState === 'complete') {
            MainApp.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => {
                MainApp.init();
            });
        }

        // 监听窗口关闭事件
        window.addEventListener('beforeunload', () => {
            MainApp.cleanup();
        });
    } else {
        console.error('[MainApp] JianyingApp全局对象未找到，主应用逻辑注册失败');
    }

})();
