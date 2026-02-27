/**
 * 路径管理模块 (path-manager.js) — macOS 版
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

        // macOS 常见的剪映草稿文件夹名
        draftFolderNames: [
            'JianyingPro Drafts',
            'CapCut Drafts',
            '剪映专业版',
            '剪映草稿',
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

                // 直接执行路径检测
                this.checkInitialPath();

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
         * 检查初始路径设置 — 如果没有保存的路径或保存的路径已失效，自动检测
         */
        checkInitialPath() {
            // 1. 先检查已保存的路径是否仍有效
            if (this.currentPath) {
                const validation = this.validatePath(this.currentPath);
                if (validation.valid) {
                    this.validateAndSetPath(this.currentPath);
                    window.JianyingApp.utils.addLog(`[PathManager] 使用已保存的路径: ${this.currentPath}`, 'success');
                    return;
                }
                // 保存的路径已失效，清除并重新检测
                window.JianyingApp.utils.addLog(`[PathManager] 保存的路径已失效(${this.currentPath})，尝试自动检测...`, 'warning');
                this.currentPath = '';
                localStorage.removeItem('jianyingPath');
            }

            // 2. 自动检测剪映草稿路径
            const detected = this.autoDetectPath();
            if (detected) {
                this.validateAndSetPath(detected);
                window.JianyingApp.utils.addLog(`[PathManager] 自动检测到剪映路径: ${detected}`, 'success');
            } else {
                window.JianyingApp.utils.addLog('[PathManager] 未能自动检测到剪映路径，请在个人中心手动设置', 'warning');
            }
        },

        /**
         * 自动检测剪映草稿路径
         * 策略优先级：1.读剪映配置文件 → 2.找root_meta_info.json → 3.扫描常见路径 → 4.扫描关键词
         * @returns {string|null} 检测到的路径，或 null
         */
        autoDetectPath() {
            if (!isElectronEnv || !fs || !path) {
                return null;
            }

            window.JianyingApp.utils.addLog('[PathManager] 正在自动检测剪映路径...', 'info');

            // 策略1：从剪映配置文件读取草稿路径（最可靠）
            const configPath = this._readDraftPathFromConfig();
            if (configPath) {
                window.JianyingApp.utils.addLog(`[PathManager] 从剪映配置文件读取到路径: ${configPath}`, 'success');
                return configPath;
            }

            // 策略2：在常见目录下搜索 root_meta_info.json
            const metaPath = this._findByRootMetaInfo();
            if (metaPath) {
                window.JianyingApp.utils.addLog(`[PathManager] 通过root_meta_info.json找到路径: ${metaPath}`, 'success');
                return metaPath;
            }

            // 策略3：扫描常见文件夹名
            const folderPath = this._findByFolderName();
            if (folderPath) {
                window.JianyingApp.utils.addLog(`[PathManager] 通过文件夹名匹配找到路径: ${folderPath}`, 'success');
                return folderPath;
            }

            // 策略4：扫描 ~/Movies 和 /Volumes 下的关键词文件夹
            const scanPath = this._findByScanDirs();
            if (scanPath) {
                window.JianyingApp.utils.addLog(`[PathManager] 通过目录扫描找到路径: ${scanPath}`, 'success');
                return scanPath;
            }

            return null;
        },

        /**
         * 策略1：从剪映的配置文件中读取草稿存储路径
         */
        _readDraftPathFromConfig() {
            if (!os) return null;

            const home = os.homedir();

            // 最优先：读取剪映 globalSetting 中用户实际配置的草稿路径
            const globalSettingPaths = [
                path.join(home, 'Movies', 'JianyingPro', 'User Data', 'Config', 'globalSetting'),
                path.join(home, 'Library', 'Containers', 'com.lemon.lvpro', 'Data', 'Movies', 'JianyingPro', 'User Data', 'Config', 'globalSetting'),
                path.join(home, 'Movies', 'CapCut', 'User Data', 'Config', 'globalSetting'),
                path.join(home, 'Library', 'Containers', 'com.capcut.CapCut', 'Data', 'Movies', 'CapCut', 'User Data', 'Config', 'globalSetting'),
            ];

            for (const settingFile of globalSettingPaths) {
                try {
                    if (!fs.existsSync(settingFile)) continue;
                    const content = fs.readFileSync(settingFile, 'utf8');

                    // 尝试 key=value 格式
                    const match = content.match(/currentCustomDraftPath\s*=\s*(.+)/);
                    if (match) {
                        const customPath = match[1].trim().replace(/\\\\/g, '/');
                        if (customPath && fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()) {
                            const metaFile = path.join(customPath, 'root_meta_info.json');
                            if (fs.existsSync(metaFile)) {
                                window.JianyingApp.utils.addLog(`[PathManager] 从剪映设置读取到自定义草稿路径: ${customPath}`, 'success');
                                return customPath;
                            }
                        }
                    }

                    // 尝试 JSON 格式
                    try {
                        const json = JSON.parse(content);
                        const draftPath = this._extractDraftPath(json);
                        if (draftPath && fs.existsSync(draftPath)) {
                            return draftPath;
                        }
                    } catch (e) {
                        // 不是 JSON 格式，继续
                    }
                } catch (e) {
                    console.log('[PathManager] 读取globalSetting失败:', e.message);
                }
            }

            // 其次：检查默认草稿目录
            const appDataDraftPaths = [
                path.join(home, 'Movies', 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'),
                path.join(home, 'Library', 'Containers', 'com.lemon.lvpro', 'Data', 'Movies', 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'),
                path.join(home, 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
                path.join(home, 'Library', 'Containers', 'com.capcut.CapCut', 'Data', 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
            ];

            for (const draftDir of appDataDraftPaths) {
                try {
                    if (fs.existsSync(draftDir) && fs.statSync(draftDir).isDirectory()) {
                        const metaFile = path.join(draftDir, 'root_meta_info.json');
                        if (fs.existsSync(metaFile)) {
                            window.JianyingApp.utils.addLog(`[PathManager] 在默认目录中找到剪映草稿目录: ${draftDir}`, 'success');
                            return draftDir;
                        }
                    }
                } catch (e) {}
            }

            // 检查其他配置文件
            const configLocations = [
                path.join(home, 'Movies', 'JianyingPro', 'User Data', 'config.json'),
                path.join(home, 'Movies', 'JianyingPro', 'User Data', 'Config', 'app_settings.json'),
                path.join(home, 'Library', 'Application Support', 'com.lemon.lvpro', 'config.json'),
                path.join(home, 'Movies', 'CapCut', 'User Data', 'config.json'),
                path.join(home, 'Library', 'Application Support', 'com.capcut.CapCut', 'config.json'),
            ];

            for (const configFile of configLocations) {
                try {
                    if (!fs.existsSync(configFile)) continue;

                    window.JianyingApp.utils.addLog(`[PathManager] 发现剪映配置文件: ${configFile}`, 'info');
                    const content = fs.readFileSync(configFile, 'utf8');
                    const config = JSON.parse(content);

                    const draftPath = this._extractDraftPath(config);
                    if (draftPath && fs.existsSync(draftPath)) {
                        return draftPath;
                    }
                } catch (e) {}
            }

            // 扫描 JianyingPro 目录下的 JSON 配置文件
            const jianyingAppDirs = [
                path.join(home, 'Movies', 'JianyingPro'),
                path.join(home, 'Library', 'Application Support', 'com.lemon.lvpro'),
            ];

            for (const appDir of jianyingAppDirs) {
                try {
                    if (!fs.existsSync(appDir)) continue;
                    window.JianyingApp.utils.addLog(`[PathManager] 扫描剪映数据目录: ${appDir}`, 'info');
                    const result = this._searchConfigInDir(appDir, 0);
                    if (result) return result;
                } catch (e) {}
            }

            return null;
        },

        /**
         * 递归搜索目录中的json配置文件，提取草稿路径
         */
        _searchConfigInDir(dir, depth) {
            if (depth > 3) return null;

            try {
                const entries = fs.readdirSync(dir);

                for (const entry of entries) {
                    if (!entry.endsWith('.json')) continue;
                    try {
                        const filePath = path.join(dir, entry);
                        const stat = fs.statSync(filePath);
                        if (stat.size > 10 * 1024 * 1024) continue;

                        const content = fs.readFileSync(filePath, 'utf8');
                        const config = JSON.parse(content);
                        const draftPath = this._extractDraftPath(config);
                        if (draftPath && fs.existsSync(draftPath)) {
                            window.JianyingApp.utils.addLog(`[PathManager] 在 ${filePath} 中找到草稿路径`, 'info');
                            return draftPath;
                        }
                    } catch (e) {}
                }

                for (const entry of entries) {
                    try {
                        const entryPath = path.join(dir, entry);
                        if (fs.statSync(entryPath).isDirectory()) {
                            const result = this._searchConfigInDir(entryPath, depth + 1);
                            if (result) return result;
                        }
                    } catch (e) {}
                }
            } catch (e) {}

            return null;
        },

        /**
         * 从配置对象中提取草稿路径
         */
        _extractDraftPath(config) {
            if (!config || typeof config !== 'object') return null;

            const pathKeys = [
                'draft_root_path', 'draftRootPath', 'draft_path', 'draftPath',
                'project_dir', 'projectDir', 'workspace', 'save_path', 'savePath',
                'root_path', 'rootPath', 'export_dir', 'cache_dir',
                'last_project_dir', 'lastProjectDir', 'draft_folder', 'draftFolder',
                'draft_save_folder_path', 'currentCustomDraftPath'
            ];

            for (const key of pathKeys) {
                if (config[key] && typeof config[key] === 'string') {
                    const val = config[key];
                    if (/^\//.test(val)) {
                        try {
                            if (fs.existsSync(val) && fs.statSync(val).isDirectory()) {
                                return val;
                            }
                        } catch (e) {}
                    }
                }
            }

            for (const key of Object.keys(config)) {
                const val = config[key];
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    const result = this._extractDraftPath(val);
                    if (result) return result;
                }
            }

            return null;
        },

        /**
         * 获取所有候选搜索路径
         */
        _getCandidatePaths() {
            const candidates = [];
            if (!os) return candidates;

            const home = os.homedir();

            // 用户目录下的常见位置
            const baseDirs = [
                home,
                path.join(home, 'Movies'),
                path.join(home, 'Documents'),
                path.join(home, 'Desktop'),
                path.join(home, 'Downloads'),
            ];

            // 沙盒容器路径
            const containerDirs = [
                path.join(home, 'Library', 'Containers', 'com.lemon.lvpro', 'Data', 'Movies'),
                path.join(home, 'Library', 'Containers', 'com.capcut.CapCut', 'Data', 'Movies'),
            ];

            const allBaseDirs = [...baseDirs, ...containerDirs];

            for (const baseDir of allBaseDirs) {
                for (const folderName of this.draftFolderNames) {
                    candidates.push(path.join(baseDir, folderName));
                }
                // 也检查 JianyingPro/CapCut 子目录下的 Projects
                candidates.push(path.join(baseDir, 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'));
                candidates.push(path.join(baseDir, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'));
            }

            // 外置硬盘
            try {
                if (fs.existsSync('/Volumes')) {
                    const volumes = fs.readdirSync('/Volumes');
                    for (const vol of volumes) {
                        if (vol === 'Macintosh HD') continue; // 跳过系统盘（已经通过 home 覆盖了）
                        const volPath = path.join('/Volumes', vol);
                        try {
                            if (!fs.statSync(volPath).isDirectory()) continue;
                            for (const folderName of this.draftFolderNames) {
                                candidates.push(path.join(volPath, folderName));
                            }
                            candidates.push(path.join(volPath, 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'));
                            candidates.push(path.join(volPath, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'));
                        } catch (e) {}
                    }
                }
            } catch (e) {}

            return candidates;
        },

        /**
         * 策略2：通过搜索 root_meta_info.json 定位草稿根目录
         */
        _findByRootMetaInfo() {
            const candidates = this._getCandidatePaths();

            for (const candidate of candidates) {
                try {
                    const metaFile = path.join(candidate, 'root_meta_info.json');
                    if (fs.existsSync(metaFile)) {
                        window.JianyingApp.utils.addLog(`[PathManager] 发现 root_meta_info.json: ${metaFile}`, 'info');
                        return candidate;
                    }
                } catch (e) {}
            }

            // 扫描 ~/Movies 下一级子文件夹中的 root_meta_info.json
            if (os) {
                const scanDirs = [
                    path.join(os.homedir(), 'Movies'),
                    path.join(os.homedir(), 'Documents'),
                ];

                for (const scanDir of scanDirs) {
                    try {
                        if (!fs.existsSync(scanDir)) continue;
                        const entries = fs.readdirSync(scanDir);
                        for (const entry of entries) {
                            try {
                                const fullPath = path.join(scanDir, entry);
                                if (!fs.statSync(fullPath).isDirectory()) continue;
                                const metaFile = path.join(fullPath, 'root_meta_info.json');
                                if (fs.existsSync(metaFile)) {
                                    window.JianyingApp.utils.addLog(`[PathManager] 在 ${fullPath} 发现 root_meta_info.json`, 'info');
                                    return fullPath;
                                }
                            } catch (e) {}
                        }
                    } catch (e) {}
                }
            }

            return null;
        },

        /**
         * 策略3：通过常见文件夹名匹配
         */
        _findByFolderName() {
            const candidates = this._getCandidatePaths();

            for (const candidate of candidates) {
                try {
                    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                        window.JianyingApp.utils.addLog(`[PathManager] 找到匹配文件夹: ${candidate}`, 'info');
                        return candidate;
                    }
                } catch (e) {}
            }

            return null;
        },

        /**
         * 策略4：扫描 ~/Movies 和 /Volumes 下含关键词的文件夹
         */
        _findByScanDirs() {
            if (!os) return null;

            const scanDirs = [
                path.join(os.homedir(), 'Movies'),
                path.join(os.homedir(), 'Documents'),
                path.join(os.homedir(), 'Desktop'),
            ];

            // 添加外置硬盘
            try {
                if (fs.existsSync('/Volumes')) {
                    const volumes = fs.readdirSync('/Volumes');
                    for (const vol of volumes) {
                        if (vol === 'Macintosh HD') continue;
                        scanDirs.push(path.join('/Volumes', vol));
                    }
                }
            } catch (e) {}

            for (const scanDir of scanDirs) {
                try {
                    if (!fs.existsSync(scanDir)) continue;
                    const entries = fs.readdirSync(scanDir);
                    for (const entry of entries) {
                        const lower = entry.toLowerCase();
                        if (lower.includes('jianying') || lower.includes('jianyingpro') ||
                            lower.includes('capcut') || entry.includes('剪映') || entry.includes('草稿')) {
                            const fullPath = path.join(scanDir, entry);
                            try {
                                if (fs.statSync(fullPath).isDirectory()) {
                                    window.JianyingApp.utils.addLog(`[PathManager] 目录扫描发现: ${fullPath}`, 'info');
                                    return fullPath;
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }
            return null;
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

            const trimmedPath = testPath.trim();

            if (!this.isValidPathFormat(trimmedPath)) {
                return { valid: false, message: '路径格式不正确' };
            }

            if (!isElectronEnv || !fs) {
                return { valid: true, message: '路径格式有效（未验证实际存在）' };
            }

            try {
                if (!fs.existsSync(trimmedPath)) {
                    return { valid: false, message: '路径不存在或无法访问' };
                }

                const stats = fs.statSync(trimmedPath);
                if (!stats.isDirectory()) {
                    return { valid: false, message: '不是有效的目录' };
                }

                try {
                    fs.accessSync(trimmedPath, fs.constants.R_OK);
                } catch (error) {
                    return { valid: false, message: '目录无法读取' };
                }

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
         * 检查路径格式是否有效 (macOS)
         */
        isValidPathFormat(pathStr) {
            // macOS 路径以 / 开头
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
                'capcut',
                'draft',
                'com.lveditor.draft',
                '剪映',
                '草稿'
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
                return `${this.currentPath}/${projectId}`;
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
         * 获取建议的路径列表（macOS 常见路径）
         */
        getSuggestedPaths() {
            const suggestions = [];
            if (!isElectronEnv || !os) return suggestions;

            const home = os.homedir();

            suggestions.push(
                path.join(home, 'Movies', 'JianyingPro Drafts'),
                path.join(home, 'Movies', 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'),
                path.join(home, 'Movies', 'CapCut Drafts'),
                path.join(home, 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
                path.join(home, 'Library', 'Containers', 'com.lemon.lvpro', 'Data', 'Movies', 'JianyingPro Drafts'),
                path.join(home, 'Documents', 'JianyingPro Drafts'),
            );

            // 添加外置硬盘的建议路径
            try {
                if (fs.existsSync('/Volumes')) {
                    const volumes = fs.readdirSync('/Volumes');
                    for (const vol of volumes) {
                        if (vol === 'Macintosh HD') continue;
                        const volDraft = path.join('/Volumes', vol, 'JianyingPro Drafts');
                        try {
                            if (fs.existsSync(volDraft)) {
                                suggestions.push(volDraft);
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}

            return suggestions;
        }
    };

    // 注册模块到全局应用对象
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.pathManager = PathManager;

        if (document.readyState === 'complete') {
            PathManager.init();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                PathManager.init();
            });
        }
    } else {
        console.error('[PathManager] JianyingApp全局对象未找到，模块注册失败');
    }

})();
