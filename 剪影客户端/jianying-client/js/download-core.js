/**
 * 核心下载模块 (download-core.js)
 * 负责文件下载、JSON处理等核心功能
 */

(function() {
    'use strict';

    // 核心下载模块
    const DownloadCore = {
        // 模块状态
        isInitialized: false,

        /**
         * 模块初始化
         */
        init() {
            try {
                window.JianyingApp.utils.addLog('[DownloadCore] 核心下载模块初始化完成', 'success');
                this.isInitialized = true;
                
                // 发出模块就绪事件
                window.JianyingApp.events.emit('downloadCoreReady');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 初始化失败: ${error.message}`, 'error');
            }
        },

        /**
         * 下载草稿JSON文件
         */
        async downloadDraftJson(url) {
            if (!this.isInitialized) {
                throw new Error('DownloadCore模块未初始化');
            }
            
            try {
                window.JianyingApp.utils.addLog(`[DownloadCore] 开始下载草稿JSON: ${url}`, 'info');
                
                // 使用Electron内置的net模块或fetch API
                let response;
                
                if (typeof window !== 'undefined' && window.require) {
                    // Electron环境，使用https/http模块
                    const https = window.require('https');
                    const http = window.require('http');
                    const urlModule = window.require('url');
                    
                    const parsedUrl = urlModule.parse(url);
                    const protocol = parsedUrl.protocol === 'https:' ? https : http;
                    
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port,
                        path: parsedUrl.path,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    };
                    
                    response = await new Promise((resolve, reject) => {
                        let data = '';
                        
                        const request = protocol.request(options, (response) => {
                            if (response.statusCode !== 200) {
                                reject(new Error(`HTTP ${response.statusCode}`));
                                return;
                            }
                            
                            response.on('data', (chunk) => {
                                data += chunk.toString();
                            });
                            
                            response.on('end', () => {
                                try {
                                    const jsonData = JSON.parse(data);
                                    resolve(jsonData);
                                } catch (parseError) {
                                    reject(new Error(`JSON解析失败: ${parseError.message}`));
                                }
                            });
                        });
                        
                        request.on('error', (error) => {
                            reject(error);
                        });
                        
                        request.setTimeout(30000, () => {
                            request.destroy();
                            reject(new Error('请求超时'));
                        });
                        
                        request.end();
                    });
                } else {
                    // Web环境，使用fetch API
                    const fetchResponse = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (!fetchResponse.ok) {
                        throw new Error(`HTTP ${fetchResponse.status}`);
                    }
                    
                    response = await fetchResponse.json();
                }
                
                window.JianyingApp.utils.addLog('[DownloadCore] 草稿JSON下载成功', 'success');
                return response;
                
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 下载草稿JSON失败: ${error.message}`, 'error');
                throw error;
            }
        },

        /**
         * 提取JSON中的所有资源URL
         */
        extractResourceUrls(draftData) {
            const resources = [];
            
            if (!draftData || !draftData.materials) {
                window.JianyingApp.utils.addLog('[DownloadCore] JSON数据无效或无materials字段', 'warning');
                return resources;
            }
            
            // 处理音频资源
            if (draftData.materials.audios && Array.isArray(draftData.materials.audios)) {
                draftData.materials.audios.forEach(material => {
                    if (material.path && material.path.startsWith('http')) {
                        const fileName = `${material.id}.mp3`;
                        resources.push({
                            id: material.id,
                            name: material.name || material.id,
                            fileName: fileName,
                            extension: 'mp3',
                            type: 'audio',
                            originalPath: material.path,
                            downloadUrl: material.path
                        });
                        window.JianyingApp.utils.addLog(`[DownloadCore] 找到音频资源: ${material.id} -> ${fileName}`, 'info');
                    }
                });
            }
            
            // 处理视频资源（包括图片，因为图片存储在videos数组中）
            if (draftData.materials.videos && Array.isArray(draftData.materials.videos)) {
                draftData.materials.videos.forEach(material => {
                    // 检查是否有下载链接
                    let downloadUrl = null;
                    let fileType = 'video';
                    let extension = 'mp4';
                    
                    // 优先检查material_url字段
                    if (material.material_url && material.material_url.startsWith('http')) {
                        downloadUrl = material.material_url;
                    } else if (material.path && material.path.startsWith('http')) {
                        downloadUrl = material.path;
                    }
                    
                    // 根据material的type或其他字段判断是图片还是视频
                    if (material.type === 'photo' || material.type === 'video' && material.height && material.width && !material.has_audio) {
                        fileType = 'image';
                        extension = 'png';
                    }
                    
                    // 如果没有直接的HTTP链接，尝试从material_name推断
                    if (!downloadUrl && material.material_name && material.material_name.includes('image_')) {
                        // 这种情况下可能需要从其他地方获取下载链接
                        // 暂时跳过，但记录日志
                        window.JianyingApp.utils.addLog(`[DownloadCore] 跳过无下载链接的${fileType}: ${material.id}`, 'warning');
                        return;
                    }
                    
                    if (downloadUrl) {
                        const fileName = `${material.id}.${extension}`;
                        resources.push({
                            id: material.id,
                            name: material.material_name || material.id,
                            fileName: fileName,
                            extension: extension,
                            type: fileType,
                            originalPath: material.path || '',
                            downloadUrl: downloadUrl
                        });
                        window.JianyingApp.utils.addLog(`[DownloadCore] 找到${fileType}资源: ${material.id} -> ${fileName}`, 'info');
                    }
                });
            }
            
            // 处理images数组（如果存在）
            if (draftData.materials.images && Array.isArray(draftData.materials.images)) {
                draftData.materials.images.forEach(material => {
                    if (material.path && material.path.startsWith('http')) {
                        const fileName = `${material.id}.png`;
                        resources.push({
                            id: material.id,
                            name: material.name || material.id,
                            fileName: fileName,
                            extension: 'png',
                            type: 'image',
                            originalPath: material.path,
                            downloadUrl: material.path
                        });
                        window.JianyingApp.utils.addLog(`[DownloadCore] 找到图片资源: ${material.id} -> ${fileName}`, 'info');
                    }
                });
            }
            
            window.JianyingApp.utils.addLog(`[DownloadCore] 提取到 ${resources.length} 个资源`, 'info');
            return resources;
        },

        /**
         * 根据资源类型获取文件扩展名
         */
        getExtensionFromType(type) {
            const typeExtensions = {
                'audios': 'mp3',
                'videos': 'mp4',
                'images': 'png'
            };
            return typeExtensions[type] || 'file';
        },

        /**
         * 构建下载URL（需要根据实际API实现）
         */
        constructDownloadUrl(material, type) {
            // 这里需要根据实际的API或存储服务来构建真实的下载URL
            // 目前返回占位符，实际使用时需要替换为真实的URL构建逻辑
            
            if (material.material_url) {
                return material.material_url;
            }
            
            // 如果没有直接的URL，可能需要通过其他方式获取
            // 例如通过material_id查询API等
            return null;
        },

        /**
         * 下载单个资源文件（带重试机制）
         */
        async downloadResource(url, localPath, onProgress = () => {}, maxRetries = 10) {
            if (!this.isInitialized) {
                throw new Error('DownloadCore模块未初始化');
            }
            
            if (typeof window === 'undefined' || !window.require) {
                throw new Error('文件下载功能需要在Electron环境中运行');
            }

            const fs = window.require('fs');
            const path = window.require('path');
            const https = window.require('https');
            const http = window.require('http');
            
            let lastError = null;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        window.JianyingApp.utils.addLog(`[DownloadCore] 第${attempt}次重试下载: ${url}`, 'warning');
                        // 重试前等待一段时间
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    } else {
                        window.JianyingApp.utils.addLog(`[DownloadCore] 开始下载资源: ${url}`, 'info');
                    }
                    
                    // 确保目录存在
                    const dir = path.dirname(localPath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    await new Promise((resolve, reject) => {
                        const file = fs.createWriteStream(localPath);
                        
                        // 动态确定协议，支持重定向后的协议变化
                        const urlModule = window.require('url');
                        const parsedUrl = urlModule.parse(url);
                        const protocol = parsedUrl.protocol === 'https:' ? https : http;
                        
                        const request = protocol.get(url, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        }, (response) => {
                            // 处理重定向
                            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                                const redirectUrl = response.headers.location;
                                if (redirectUrl) {
                                    window.JianyingApp.utils.addLog(`[DownloadCore] 检测到重定向: ${response.statusCode} -> ${redirectUrl}`, 'info');
                                    file.destroy(); // 关闭当前文件流
                                    // 删除可能的空文件
                                    fs.unlink(localPath, () => {});
                                    // 抛出特殊错误，让外层重试逻辑处理重定向
                                    reject(new Error(`REDIRECT:${redirectUrl}`));
                                    return;
                                }
                            }
                            
                            if (response.statusCode !== 200) {
                                fs.unlink(localPath, () => {}); // 删除不完整的文件
                                reject(new Error(`下载失败，状态码: ${response.statusCode}`));
                                return;
                            }

                            const totalLength = response.headers['content-length'];
                            let downloadedLength = 0;

                            response.on('data', (chunk) => {
                                file.write(chunk);
                                downloadedLength += chunk.length;
                                if (totalLength) {
                                    const percent = Math.floor((downloadedLength / totalLength) * 100);
                                    onProgress(percent);
                                }
                            });

                            response.on('end', () => {
                                file.end();
                                // 验证文件是否真的被写入
                                if (fs.existsSync(localPath)) {
                                    const stats = fs.statSync(localPath);
                                    window.JianyingApp.utils.addLog(`[DownloadCore] 文件验证成功: ${localPath} (${stats.size} bytes)`, 'success');
                                } else {
                                    window.JianyingApp.utils.addLog(`[DownloadCore] 警告: 文件未找到: ${localPath}`, 'error');
                                }
                                resolve();
                            });

                            response.on('error', (err) => {
                                fs.unlink(localPath, () => {}); // 删除不完整的文件
                                reject(err);
                            });
                        });

                        request.on('error', (err) => {
                            reject(err);
                        });
                        
                        request.setTimeout(60000, () => {
                            request.destroy();
                            reject(new Error('下载超时'));
                        });
                    });
                    
                    // 下载成功
                    window.JianyingApp.utils.addLog(`[DownloadCore] 资源下载完成: ${localPath}`, 'success');
                    return;

                } catch (error) {
                    lastError = error;
                    
                    // 检查是否是重定向错误
                    if (error.message.startsWith('REDIRECT:')) {
                        const redirectUrl = error.message.substring(9); // 移除 'REDIRECT:' 前缀
                        window.JianyingApp.utils.addLog(`[DownloadCore] 跟随重定向: ${url} -> ${redirectUrl}`, 'info');
                        // 更新URL并重试，不计入重试次数
                        url = redirectUrl;
                        attempt--; // 重定向不应该计入重试次数
                        continue;
                    }
                    
                    window.JianyingApp.utils.addLog(`[DownloadCore] 第${attempt}次下载失败: ${error.message}`, 'warning');
                    
                    // 如果是最后一次尝试，抛出错误
                    if (attempt === maxRetries) {
                        window.JianyingApp.utils.addLog(`[DownloadCore] 下载资源失败，已重试${maxRetries}次: ${error.message}`, 'error');
                        throw error;
                    }
                }
            }
        },

        /**
         * 创建项目文件夹结构
         */
        createProjectStructure(jianyingPath, projectId, resourceFolderId) {
            if (typeof window === 'undefined' || !window.require) {
                throw new Error('文件夹创建功能需要在Electron环境中运行');
            }

            const fs = window.require('fs');
            const path = window.require('path');
            
            try {
                const projectPath = path.join(jianyingPath, projectId);
                const resourcePath = path.join(projectPath, resourceFolderId);
                
                // 创建项目文件夹
                if (!fs.existsSync(projectPath)) {
                    fs.mkdirSync(projectPath, { recursive: true });
                    window.JianyingApp.utils.addLog(`[DownloadCore] 创建项目文件夹: ${projectPath}`, 'info');
                }
                
                // 创建资源文件夹
                if (!fs.existsSync(resourcePath)) {
                    fs.mkdirSync(resourcePath, { recursive: true });
                    window.JianyingApp.utils.addLog(`[DownloadCore] 创建资源文件夹: ${resourcePath}`, 'info');
                }
                
                return {
                    projectPath,
                    resourcePath
                };
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 创建文件夹失败: ${error.message}`, 'error');
                throw error;
            }
        },

        /**
         * 生成项目配置文件
         */
        generateProjectFiles(projectPath, draftData, resourceFolderId) {
            if (typeof window === 'undefined' || !window.require) {
                throw new Error('文件生成功能需要在Electron环境中运行');
            }

            const fs = window.require('fs');
            const path = window.require('path');
            
            try {
                // 替换路径占位符
                const processedData = this.replacePlaceholders(draftData, resourceFolderId, projectPath);
                
                // 生成各种配置文件
                const files = {
                    'draft_content.json': processedData,
                    'draft_info.json': processedData,
                    'draft_meta_info.json': {
                        create_time: Date.now(),
                        update_time: Date.now(),
                        version: "110.0.0"
                    },
                    'attachment_pc_common.json': {},
                    'draft_agency_config.json': {},
                    'template.tmp': ''
                };
                
                Object.entries(files).forEach(([fileName, content]) => {
                    const filePath = path.join(projectPath, fileName);
                    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                    fs.writeFileSync(filePath, fileContent, 'utf8');
                    window.JianyingApp.utils.addLog(`[DownloadCore] 生成配置文件: ${fileName}`, 'info');
                });
                
                return true;
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 生成配置文件失败: ${error.message}`, 'error');
                throw error;
            }
        },

        /**
         * 替换HTTP路径为本地绝对路径
         */
        replacePlaceholders(draftData, resourceFolderId, projectPath) {
            // 深拷贝数据避免修改原始数据
            const processedData = JSON.parse(JSON.stringify(draftData));
            
            const path = window.require('path');
            const resourcePath = path.join(projectPath, resourceFolderId);
            
            // 处理音频资源
            if (processedData.materials.audios && Array.isArray(processedData.materials.audios)) {
                processedData.materials.audios.forEach(material => {
                    if (material.path && material.path.startsWith('http')) {
                        const fileName = `${material.id}.mp3`;
                        // 直接使用绝对路径，参考pyJianYingDraft项目
                        material.path = path.join(resourcePath, fileName);
                        window.JianyingApp.utils.addLog(`[DownloadCore] 音频路径替换: ${fileName} -> ${material.path}`, 'info');
                    }
                });
            }
            
            // 处理视频资源（包括图片）
            if (processedData.materials.videos && Array.isArray(processedData.materials.videos)) {
                processedData.materials.videos.forEach(material => {
                    // 判断文件类型和扩展名
                    let extension = 'mp4';
                    if (material.type === 'photo' || (material.type === 'video' && material.height && material.width && !material.has_audio)) {
                        extension = 'png';
                    }
                    
                    // 替换path字段
                    if (material.path && material.path.startsWith('http')) {
                        const fileName = `${material.id}.${extension}`;
                        material.path = path.join(resourcePath, fileName);
                        window.JianyingApp.utils.addLog(`[DownloadCore] ${extension === 'png' ? '图片' : '视频'}路径替换: ${fileName} -> ${material.path}`, 'info');
                    } else if (!material.path || material.path === '') {
                        // 如果没有path，但有下载链接，创建path
                        if (material.material_url && material.material_url.startsWith('http')) {
                            const fileName = `${material.id}.${extension}`;
                            material.path = path.join(resourcePath, fileName);
                            window.JianyingApp.utils.addLog(`[DownloadCore] ${extension === 'png' ? '图片' : '视频'}路径创建: ${fileName} -> ${material.path}`, 'info');
                        }
                    }
                    
                    // 清空material_url，因为已经下载到本地
                    if (material.material_url) {
                        material.material_url = '';
                    }
                });
            }
            
            // 处理images数组（如果存在）
            if (processedData.materials.images && Array.isArray(processedData.materials.images)) {
                processedData.materials.images.forEach(material => {
                    if (material.path && material.path.startsWith('http')) {
                        const fileName = `${material.id}.png`;
                        material.path = path.join(resourcePath, fileName);
                        window.JianyingApp.utils.addLog(`[DownloadCore] 图片路径替换: ${fileName} -> ${material.path}`, 'info');
                    }
                });
            }
            
            return processedData;
        }
    };

    // 注册模块到全局应用对象
    if (window.JianyingApp && window.JianyingApp.modules) {
        window.JianyingApp.modules.downloadCore = DownloadCore;
        
        // 如果应用已经就绪，立即初始化
        if (document.readyState === 'complete') {
            DownloadCore.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => {
                DownloadCore.init();
            });
        }
    } else {
        console.error('[DownloadCore] JianyingApp全局对象未找到，模块注册失败');
    }

})();
