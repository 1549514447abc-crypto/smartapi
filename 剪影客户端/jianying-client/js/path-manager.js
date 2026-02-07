/**
 * 路径管理模块 (path-manager.js)
 * 负责剪映路径的检测、验证和管理
 */

(function() {
    'use strict';

    // 检查Electron环境并导入必要模块
    let fs, path, os;
    let isElectronEnv = false;

    try {
        if (typeof window !== 'undefined' && window.require) {
            fs = window.require('fs');
            path = window.require('path');
            os = window.require('os');
            isElectronEnv = true;
            console.log('[PathManager] Node.js模块加载成功');
        }
    } catch (error) {
        console.log('[PathManager] Node.js模块不可用，使用Web版本功能');
    }

    // 路径管理模块
    const PathManager = {
        // 当前设置的剪映路径
        currentPath: '',
        
        // 路径历史记录
        pathHistory: [],

        // 常见的剪映路径
        commonPaths: [
            // Windows 常见路径
            'G:\\JianyingPro Drafts',
            'D:\\JianyingPro Drafts',
            'C:\\JianyingPro Drafts',
            'G:\\JianyingPro\\User Data\\Projects\\com.lveditor.draft',
            'D:\\JianyingPro\\User Data\\Projects\\com.lveditor.draft'
        ],

        /**
         * 模块初始化
         */
        init() {
            try {
                // 从本地存储加载保存的路径
                this.loadSavedPath();
                
                // 监听全局事件
                this.bindEvents();
                
                window.JianyingApp.utils.addLog('[PathManager] 路径管理模块初始化完成', 'success');
                
                // 发出模块就绪事件
                window.JianyingApp.events.emit('pathManagerReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[PathManager] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 绑定事件监听
         */
        bindEvents() {
            // 监听应用就绪事件
            window.JianyingApp.events.on('appReady', () => {
                this.checkInitialPath();
            });

            // 监听页面切换事件，同步路径设置
            window.JianyingApp.events.on('pageChanged', (pageName) => {
                this.syncPathToPage(pageName);
            });
        },

        /**
         * 检查初始路径设置
         */
        checkInitialPath() {
            if (this.currentPath) {
                this.validateAndSetPath(this.currentPath);
            } else {
                window.JianyingApp.utils.addLog('[PathManager] 未设置剪映路径，请手动设置', 'warning');
            }
        },

        /**
         * 从本地存储加载保存的路径
         */
        loadSavedPath() {
            try {
                const savedPath = localStorage.getItem('jianyingPath');
                const pathHistory = localStorage.getItem('jianyingPathHistory');
                
                if (savedPath) {
                    this.currentPath = savedPath;
                    window.JianyingApp.utils.updateState('jianyingPath', savedPath);
                    console.log('[PathManager] 加载保存的路径:', savedPath);
                }

                if (pathHistory) {
                    this.pathHistory = JSON.parse(pathHistory);
                }

                window.JianyingApp.utils.addLog('[PathManager] 已加载保存的路径设置', 'info');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[PathManager] 加载路径设置失败: ${error.message}`, 'warning');
            }
        },

        /**
         * 保存路径到本地存储
         */
        savePath(newPath) {
            try {
                localStorage.setItem('jianyingPath', newPath);
                
                // 更新路径历史
                if (!this.pathHistory.includes(newPath)) {
                    this.pathHistory.unshift(newPath);
                    if (this.pathHistory.length > 5) {
                        this.pathHistory = this.pathHistory.slice(0, 5);
                    }
                    localStorage.setItem('jianyingPathHistory', JSON.stringify(this.pathHistory));
                }
                console.log('[PathManager] 路径已保存:', newPath);
            } catch (error) {
                window.JianyingApp.utils.addLog(`[PathManager] 保存路径失败: ${error.message}`, 'warning');
            }
        },

        /**
         * 验证路径是否有效
         */
        validatePath(testPath) {
            if (!testPath || testPath.trim() === '') {
                return { valid: false, message: '路径不能为空' };
            }

            // 基本路径格式检查
            const trimmedPath = testPath.trim();
            
            // 检查路径格式
            if (!this.isValidPathFormat(trimmedPath)) {
                return { valid: false, message: '路径格式不正确' };
            }

            if (!isElectronEnv || !fs) {
                // Web环境下只能做基本验证
                return { valid: true, message: '路径格式有效（未验证实际存在）' };
            }

            try {
                // 检查路径是否存在
                if (!fs.existsSync(trimmedPath)) {
                    return { valid: false, message: '路径不存在或无法访问' };
                }

                // 检查是否为目录
                const stats = fs.statSync(trimmedPath);
                if (!stats.isDirectory()) {
                    return { valid: false, message: '不是有效的目录' };
                }

                // 检查是否可读
                try {
                    fs.accessSync(trimmedPath, fs.constants.R_OK);
                } catch (error) {
                    return { valid: false, message: '目录无法读取' };
                }

                // 检查是否可写
                try {
                    fs.accessSync(trimmedPath, fs.constants.W_OK);
                    return { valid: true, message: '路径有效且可写' };
                } catch (error) {
                    return { valid: true, message: '路径有效但可能无写入权限' };
                }

            } catch (error) {
                return { valid: false, message: `路径验证失败: ${error.message}` };
            }
        },

        /**
         * 检查路径格式是否有效
         */
        isValidPathFormat(pathStr) {
            // Windows路径格式检查
            if (process.platform === 'win32' || !process.platform) {
                // 允许 C:\, D:\, G:\ 等格式，或者 \\network\path 格式
                return /^[A-Za-z]:\\/.test(pathStr) || /^\\\\/.test(pathStr);
            }
            // Unix/Linux路径格式
            return /^\//.test(pathStr);
        },

        /**
         * 验证并设置路径
         */
        validateAndSetPath(newPath) {
            const validation = this.validatePath(newPath);
            
            if (validation.valid) {
                this.currentPath = newPath.trim();
                this.savePath(this.currentPath);
                
                // 更新全局状态
                window.JianyingApp.utils.updateState('jianyingPath', this.currentPath);
                
                // 发出路径变更事件
                window.JianyingApp.events.emit('pathChanged', {
                    path: this.currentPath,
                    validation: validation
                });

                window.JianyingApp.utils.addLog(`[PathManager] 路径设置成功: ${this.currentPath}`, 'success');
                return { success: true, message: validation.message };
            } else {
                window.JianyingApp.utils.addLog(`[PathManager] 路径无效: ${validation.message}`, 'error');
                return { success: false, message: validation.message };
            }
        },

        /**
         * 打开文件夹选择对话框
         */
        async selectPath() {
            if (!isElectronEnv) {
                const message = '文件夹选择功能需要在Electron环境中运行';
                window.JianyingApp.utils.addLog('[PathManager] ' + message, 'warning');
                return { success: false, message: message };
            }

            try {
                // 直接使用IPC方式，这是最可靠的方法
                const { ipcRenderer } = window.require('electron');
                
                window.JianyingApp.utils.addLog('[PathManager] 正在打开文件夹选择对话框...', 'info');
                
                const result = await ipcRenderer.invoke('show-folder-dialog', {
                    title: '选择剪映草稿存储目录',
                    defaultPath: this.currentPath || (os ? os.homedir() : '')
                });
                
                if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                    window.JianyingApp.utils.addLog('[PathManager] 用户取消了文件夹选择', 'info');
                    return { success: false, message: '用户取消了选择' };
                }

                const selectedPath = result.filePaths[0];
                window.JianyingApp.utils.addLog(`[PathManager] 用户选择了路径: ${selectedPath}`, 'info');

                // 验证并设置路径
                const validation = this.validateAndSetPath(selectedPath);
                
                if (validation.success) {
                    return { 
                        success: true, 
                        path: selectedPath,
                        message: validation.message 
                    };
                } else {
                    return { 
                        success: false, 
                        message: validation.message 
                    };
                }

            } catch (error) {
                const message = `打开文件夹选择对话框失败: ${error.message}`;
                window.JianyingApp.utils.addLog(`[PathManager] ${message}`, 'error');
                return { success: false, message: message };
            }
        },

        /**
         * 获取当前设置的路径
         */
        getCurrentPath() {
            return this.currentPath;
        },

        /**
         * 获取路径历史记录
         */
        getPathHistory() {
            return [...this.pathHistory];
        },

        /**
         * 同步路径设置到指定页面
         */
        syncPathToPage(pageName) {
            const pathInputs = {
                'import': 'jianyingPath',
                'profile': 'profileJianyingPath'
            };

            const inputId = pathInputs[pageName];
            if (inputId) {
                const inputElement = document.getElementById(inputId);
                if (inputElement && this.currentPath) {
                    inputElement.value = this.currentPath;
                    console.log(`[PathManager] 路径已同步到 ${pageName} 页面:`, this.currentPath);
                }
            }
        },

        /**
         * 检查路径是否适合作为剪映草稿目录
         */
        isLikelyJianyingPath(testPath) {
            if (!testPath) return false;

            const lowerPath = testPath.toLowerCase();
            const indicators = [
                'jianying',
                'jianyingpro',
                'draft',
                'com.lveditor.draft'
            ];

            return indicators.some(indicator => lowerPath.includes(indicator));
        },

        /**
         * 生成项目子目录路径
         */
        generateProjectPath(projectId) {
            if (!this.currentPath) {
                throw new Error('未设置剪映路径');
            }

            if (!projectId) {
                throw new Error('项目ID不能为空');
            }

            if (path) {
                return path.join(this.currentPath, projectId);
            } else {
                // 简单的字符串拼接作为后备方案
                return `${this.currentPath}\\${projectId}`;
            }
        },

        /**
         * 创建项目目录
         */
        createProjectDirectory(projectId) {
            const projectPath = this.generateProjectPath(projectId);
            
            if (!isElectronEnv || !fs) {
                window.JianyingApp.utils.addLog('[PathManager] 无法在Web环境中创建目录', 'warning');
                return { success: false, message: '无法在Web环境中创建目录' };
            }

            try {
                if (!fs.existsSync(projectPath)) {
                    fs.mkdirSync(projectPath, { recursive: true });
                    window.JianyingApp.utils.addLog(`[PathManager] 创建项目目录: ${projectPath}`, 'success');
                }
                return { success: true, path: projectPath };
            } catch (error) {
                const message = `创建项目目录失败: ${error.message}`;
                window.JianyingApp.utils.addLog(`[PathManager] ${message}`, 'error');
                return { success: false, message: message };
            }
        },

        /**
         * 获取建议的路径列表
         */
        getSuggestedPaths() {
            return [...this.commonPaths];
        }
    };

    // 注册模块到全局应用对象
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.pathManager = PathManager;
        
        // 如果应用已经就绪，立即初始化
        if (document.readyState === 'complete') {
            PathManager.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => {
                PathManager.init();
            });
        }
    } else {
        console.error('[PathManager] JianyingApp全局对象未找到，模块注册失败');
    }

})();