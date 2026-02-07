/**
 * 历史记录模块 (history-module.js)
 * 负责历史记录页面的UI渲染和功能处理
 */

(function() {
    'use strict';

    // 历史记录模块
    const HistoryModule = {
        // 模块状态
        isInitialized: false,
        historyData: [],

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
                        this.loadHistoryData();
                    });
                } else {
                    this.render();
                    this.bindEvents();
                    this.loadHistoryData();
                }

                this.isInitialized = true;
                window.JianyingApp.utils.addLog('[HistoryModule] 历史记录模块初始化完成', 'success');

                // 发出模块就绪事件
                window.JianyingApp.events.emit('historyModuleReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[HistoryModule] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 渲染历史记录页面内容
         */
        render() {
            const historyPage = document.getElementById('history-page');
            if (!historyPage) {
                window.JianyingApp.utils.addLog('[HistoryModule] 未找到history-page容器', 'error');
                return;
            }

            historyPage.innerHTML = `
                <h2 style="color: #333; margin-bottom: 25px;">📚 草稿历史记录</h2>


                <!-- 操作区域 -->
                <div class="import-section">
                    <h3>🛠️ 操作</h3>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button type="button" class="btn btn-primary" id="refreshHistoryBtn">
                            🔄 刷新记录
                        </button>
                        <button type="button" class="btn btn-secondary" id="clearHistoryBtn">
                            🗑️ 清空历史
                        </button>
                        <div style="margin-left: auto;">
                            <label for="historyFilter" style="margin-right: 10px;">筛选：</label>
                            <select id="historyFilter" class="form-control" style="width: auto; display: inline-block;">
                                <option value="all">全部记录</option>
                                <option value="success">成功记录</option>
                                <option value="failed">失败记录</option>
                                <option value="today">今日记录</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 历史记录列表 -->
                <div class="import-section">
                    <h3>📋 历史记录</h3>
                    <div id="historyList">
                        <!-- 历史记录项将在这里动态生成 -->
                    </div>
                </div>
            `;

            window.JianyingApp.utils.addLog('[HistoryModule] 历史记录页面渲染完成', 'info');
        },

        /**
         * 绑定事件监听
         */
        bindEvents() {
            // 刷新按钮事件
            const refreshBtn = document.getElementById('refreshHistoryBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshHistory());
            }

            // 清空历史按钮事件
            const clearBtn = document.getElementById('clearHistoryBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearHistory());
            }

            // 筛选下拉框事件
            const filterSelect = document.getElementById('historyFilter');
            if (filterSelect) {
                filterSelect.addEventListener('change', () => this.filterHistory());
            }

            // 监听导入完成事件
            window.JianyingApp.events.on('importCompleted', (data) => {
                this.addHistoryRecord(data);
            });

            // 监听页面切换事件
            window.JianyingApp.events.on('pageChanged', (pageName) => {
                if (pageName === 'history') {
                    this.refreshHistory();
                }
            });
        },

        /**
         * 加载历史数据
         */
        loadHistoryData() {
            try {
                const savedHistory = localStorage.getItem('importHistory');
                if (savedHistory) {
                    this.historyData = JSON.parse(savedHistory);
                } else {
                    // 如果没有历史数据，创建一些示例数据
                    this.historyData = this.createSampleData();
                    this.saveHistoryData();
                }
                
                this.renderHistoryList();
                
                window.JianyingApp.utils.addLog(`[HistoryModule] 已加载 ${this.historyData.length} 条历史记录`, 'success');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[HistoryModule] 加载历史数据失败: ${error.message}`, 'error');
                this.historyData = [];
            }
        },

        /**
         * 保存历史数据
         */
        saveHistoryData() {
            try {
                localStorage.setItem('importHistory', JSON.stringify(this.historyData));
            } catch (error) {
                window.JianyingApp.utils.addLog(`[HistoryModule] 保存历史数据失败: ${error.message}`, 'error');
            }
        },

        /**
         * 创建示例数据
         */
        createSampleData() {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            return [
                {
                    id: 'demo-1',
                    url: 'https://jianying-drafts-storage.oss-cn-guangzhou.aliyuncs.com/demo1.json',
                    projectName: '演示项目 - 产品介绍视频',
                    status: 'success',
                    timestamp: now.toISOString(),
                    duration: '2分30秒',
                    fileCount: 15,
                    totalSize: '45.2MB'
                },
                {
                    id: 'demo-2',
                    url: 'https://jianying-drafts-storage.oss-cn-guangzhou.aliyuncs.com/demo2.json',
                    projectName: '演示项目 - 教程视频',
                    status: 'success',
                    timestamp: yesterday.toISOString(),
                    duration: '5分15秒',
                    fileCount: 28,
                    totalSize: '128.7MB'
                },
                {
                    id: 'demo-3',
                    url: 'https://jianying-drafts-storage.oss-cn-guangzhou.aliyuncs.com/demo3.json',
                    projectName: '演示项目 - 宣传片',
                    status: 'failed',
                    timestamp: lastWeek.toISOString(),
                    duration: '1分45秒',
                    fileCount: 8,
                    totalSize: '32.1MB',
                    errorMessage: '网络连接超时'
                }
            ];
        },

        /**
         * 渲染历史记录列表
         */
        renderHistoryList() {
            const historyList = document.getElementById('historyList');
            if (!historyList) return;

            if (this.historyData.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                        <h3>暂无历史记录</h3>
                        <p>开始导入草稿后，记录将显示在这里</p>
                    </div>
                `;
                return;
            }

            const filteredData = this.getFilteredData();
            
            historyList.innerHTML = filteredData.map(record => `
                <div class="history-item" data-id="${record.id}">
                    <div class="history-header">
                        <div>
                            <div class="history-title">${record.projectName}</div>
                            <div class="history-meta">
                                <span>📅 ${new Date(record.timestamp).toLocaleString()}</span>
                                <span>⏱️ ${record.duration}</span>
                                <span>📁 ${record.fileCount} 个文件</span>
                                <span>💾 ${record.totalSize}</span>
                            </div>
                        </div>
                        <div>
                            <span class="status-badge status-${record.status}">
                                ${record.status === 'success' ? '✅ 成功' : '❌ 失败'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="history-url">${record.url}</div>
                    
                    ${record.status === 'failed' && record.errorMessage ? 
                        `<div style="color: #dc3545; font-size: 13px; margin-top: 10px;">
                            ❌ 错误信息: ${record.errorMessage}
                        </div>` : ''
                    }
                    
                    <div class="history-actions">
                        ${record.status === 'success' ? 
                            `<button class="btn btn-sm btn-primary" onclick="window.JianyingApp.modules.historyModule.reImport('${record.id}')">
                                🔄 重新导入
                            </button>` : 
                            `<button class="btn btn-sm btn-secondary" onclick="window.JianyingApp.modules.historyModule.retryImport('${record.id}')">
                                🔁 重试导入
                            </button>`
                        }
                        <button class="btn btn-sm btn-secondary" onclick="window.JianyingApp.modules.historyModule.copyUrl('${record.id}')">
                            📋 复制链接
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.JianyingApp.modules.historyModule.deleteRecord('${record.id}')">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `).join('');
        },

        /**
         * 获取筛选后的数据
         */
        getFilteredData() {
            const filter = document.getElementById('historyFilter')?.value || 'all';
            const today = new Date().toDateString();

            switch (filter) {
                case 'success':
                    return this.historyData.filter(record => record.status === 'success');
                case 'failed':
                    return this.historyData.filter(record => record.status === 'failed');
                case 'today':
                    return this.historyData.filter(record => 
                        new Date(record.timestamp).toDateString() === today
                    );
                default:
                    return this.historyData;
            }
        },


        /**
         * 刷新历史记录
         */
        refreshHistory() {
            window.JianyingApp.utils.addLog('[HistoryModule] 刷新历史记录', 'info');
            this.loadHistoryData();
        },

        /**
         * 清空历史记录
         */
        clearHistory() {
            if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
                this.historyData = [];
                this.saveHistoryData();
                this.renderHistoryList();
                window.JianyingApp.utils.addLog('[HistoryModule] 历史记录已清空', 'success');
            }
        },

        /**
         * 筛选历史记录
         */
        filterHistory() {
            this.renderHistoryList();
            const filter = document.getElementById('historyFilter')?.value || 'all';
            window.JianyingApp.utils.addLog(`[HistoryModule] 应用筛选: ${filter}`, 'info');
        },

        /**
         * 添加历史记录
         */
        addHistoryRecord(data) {
            const record = {
                id: `import-${Date.now()}`,
                url: data.url,
                projectName: data.projectName || '未命名项目',
                status: data.status,
                timestamp: new Date().toISOString(),
                duration: data.duration || '未知',
                fileCount: data.fileCount || 0,
                totalSize: data.totalSize || '0MB',
                errorMessage: data.errorMessage
            };

            this.historyData.unshift(record);
            this.saveHistoryData();
            
            // 如果当前在历史页面，刷新显示
            if (window.JianyingApp.state.currentPage === 'history') {
                this.renderHistoryList();
            }

            window.JianyingApp.utils.addLog(`[HistoryModule] 添加历史记录: ${record.projectName}`, 'success');
        },

        /**
         * 重新导入
         */
        reImport(recordId) {
            const record = this.historyData.find(r => r.id === recordId);
            if (record) {
                // 切换到导入页面并填充URL
                window.JianyingApp.navigation.switchPage('import');
                
                setTimeout(() => {
                    const urlInput = document.getElementById('draftUrl');
                    if (urlInput) {
                        urlInput.value = record.url;
                        urlInput.dispatchEvent(new Event('input'));
                    }
                }, 100);

                window.JianyingApp.utils.addLog(`[HistoryModule] 准备重新导入: ${record.projectName}`, 'info');
            }
        },

        /**
         * 重试导入
         */
        retryImport(recordId) {
            this.reImport(recordId);
        },

        /**
         * 复制URL
         */
        copyUrl(recordId) {
            const record = this.historyData.find(r => r.id === recordId);
            if (record) {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(record.url).then(() => {
                        window.JianyingApp.utils.addLog('[HistoryModule] 链接已复制到剪贴板', 'success');
                    });
                } else {
                    // 降级方案
                    const textArea = document.createElement('textarea');
                    textArea.value = record.url;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    window.JianyingApp.utils.addLog('[HistoryModule] 链接已复制到剪贴板', 'success');
                }
            }
        },

        /**
         * 删除记录
         */
        deleteRecord(recordId) {
            const record = this.historyData.find(r => r.id === recordId);
            if (record && confirm(`确定要删除记录"${record.projectName}"吗？`)) {
                this.historyData = this.historyData.filter(r => r.id !== recordId);
                this.saveHistoryData();
                this.renderHistoryList();
                window.JianyingApp.utils.addLog(`[HistoryModule] 已删除记录: ${record.projectName}`, 'success');
            }
        }
    };

    // 注册模块到全局应用对象
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.historyModule = HistoryModule;
        
        // 如果应用已经就绪，立即初始化
        if (document.readyState === 'complete') {
            HistoryModule.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => {
                HistoryModule.init();
            });
        }
    } else {
        console.error('[HistoryModule] JianyingApp全局对象未找到，模块注册失败');
    }

})();
