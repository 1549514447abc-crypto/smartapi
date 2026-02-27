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
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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
         * 使用fetch API下载文件（更好地处理复杂签名URL）
         */
        async _downloadWithFetch(url, localPath, onProgress) {
            const fs = window.require('fs');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                redirect: 'follow'
            });

            if (!response.ok) {
                // 尝试读取错误响应体，获取具体原因
                let detail = '';
                try {
                    const errBody = await response.text();
                    const parsed = JSON.parse(errBody);
                    if (parsed.Message) {
                        const msgMap = {
                            'Request has expired': '下载链接已过期，请重新生成草稿',
                            'Access Denied': '无访问权限',
                            'Forbidden': '访问被拒绝',
                        };
                        detail = msgMap[parsed.Message] || parsed.Message;
                    }
                } catch (e) {}
                const reason = detail ? ` (${detail})` : '';
                throw new Error(`下载失败，状态码: ${response.status}${reason}`);
            }

            const totalLength = parseInt(response.headers.get('content-length') || '0', 10);
            const reader = response.body.getReader();
            const chunks = [];
            let downloadedLength = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                downloadedLength += value.length;
                if (totalLength > 0) {
                    onProgress(Math.floor((downloadedLength / totalLength) * 100));
                }
            }

            // 合并所有chunks并写入文件
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(localPath, buffer);

            return buffer.length;
        },

        /**
         * 使用Node.js https模块下载文件
         */
        async _downloadWithNode(url, localPath, onProgress) {
            const fs = window.require('fs');
            const https = window.require('https');
            const http = window.require('http');

            return new Promise((resolve, reject) => {
                const isHttps = url.startsWith('https:');
                const protocol = isHttps ? https : http;

                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }, (response) => {
                    // 处理重定向
                    if ([301, 302, 307, 308].includes(response.statusCode)) {
                        const redirectUrl = response.headers.location;
                        if (redirectUrl) {
                            response.resume(); // 消费掉响应体
                            reject(new Error(`REDIRECT:${redirectUrl}`));
                            return;
                        }
                    }

                    if (response.statusCode !== 200) {
                        // 读取错误响应体获取具体原因
                        let errChunks = [];
                        response.on('data', (chunk) => errChunks.push(chunk));
                        response.on('end', () => {
                            let detail = '';
                            try {
                                const errBody = Buffer.concat(errChunks).toString('utf8');
                                const parsed = JSON.parse(errBody);
                                if (parsed.Message) {
                                    const msgMap = {
                                        'Request has expired': '下载链接已过期，请重新生成草稿',
                                        'Access Denied': '无访问权限',
                                        'Forbidden': '访问被拒绝',
                                    };
                                    detail = msgMap[parsed.Message] || parsed.Message;
                                }
                            } catch (e) {}
                            const reason = detail ? ` (${detail})` : '';
                            reject(new Error(`下载失败，状态码: ${response.statusCode}${reason}`));
                        });
                        return;
                    }

                    const totalLength = parseInt(response.headers['content-length'] || '0', 10);
                    let downloadedLength = 0;
                    const file = fs.createWriteStream(localPath);

                    response.on('data', (chunk) => {
                        file.write(chunk);
                        downloadedLength += chunk.length;
                        if (totalLength > 0) {
                            onProgress(Math.floor((downloadedLength / totalLength) * 100));
                        }
                    });

                    response.on('end', () => {
                        file.end(() => {
                            resolve(downloadedLength);
                        });
                    });

                    response.on('error', (err) => {
                        file.destroy();
                        fs.unlink(localPath, () => {});
                        reject(err);
                    });
                });

                request.on('error', (err) => {
                    reject(err);
                });

                request.setTimeout(120000, () => {
                    request.destroy();
                    reject(new Error('下载超时'));
                });
            });
        },

        /**
         * 下载单个资源文件（带重试和双引擎降级机制）
         */
        async downloadResource(url, localPath, onProgress = () => {}, maxRetries = 3) {
            if (!this.isInitialized) {
                throw new Error('DownloadCore模块未初始化');
            }

            if (typeof window === 'undefined' || !window.require) {
                throw new Error('文件下载功能需要在Electron环境中运行');
            }

            const fs = window.require('fs');
            const path = window.require('path');

            // 确保目录存在
            const dir = path.dirname(localPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            let lastError = null;

            // 先尝试 fetch（Chromium网络栈，更好地处理复杂签名URL）
            // 如果 fetch 失败再用 Node.js https 模块
            const methods = [
                { name: 'fetch', fn: () => this._downloadWithFetch(url, localPath, onProgress) },
                { name: 'node-https', fn: () => this._downloadWithNodeWithRedirect(url, localPath, onProgress) }
            ];

            for (const method of methods) {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        if (attempt > 1) {
                            window.JianyingApp.utils.addLog(`[DownloadCore] [${method.name}] 第${attempt}次重试...`, 'warning');
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }

                        const fileSize = await method.fn();

                        // 验证文件
                        if (fs.existsSync(localPath)) {
                            const stats = fs.statSync(localPath);
                            window.JianyingApp.utils.addLog(`[DownloadCore] 文件下载成功: ${path.basename(localPath)} (${(stats.size / 1024).toFixed(1)} KB)`, 'success');
                        }
                        return; // 成功，直接返回

                    } catch (error) {
                        lastError = error;

                        // 4xx客户端错误不重试（签名失效、资源不存在等）
                        const statusMatch = error.message.match(/状态码:\s*(\d+)/);
                        if (statusMatch) {
                            const statusCode = parseInt(statusMatch[1], 10);
                            if (statusCode >= 400 && statusCode < 500) {
                                window.JianyingApp.utils.addLog(
                                    `[DownloadCore] [${method.name}] HTTP ${statusCode}，` +
                                    (statusCode === 403 ? '资源链接可能已过期或无访问权限' : '客户端错误') +
                                    '，尝试其他下载方式...', 'warning'
                                );
                                break; // 跳出重试循环，尝试下一个方法
                            }
                        }

                        window.JianyingApp.utils.addLog(`[DownloadCore] [${method.name}] 第${attempt}次失败: ${error.message}`, 'warning');

                        if (attempt === maxRetries) {
                            window.JianyingApp.utils.addLog(`[DownloadCore] [${method.name}] 重试${maxRetries}次均失败`, 'warning');
                        }
                    }
                }
            }

            // 所有方法都失败了，清理并抛出错误
            fs.unlink(localPath, () => {});
            const errMsg = lastError ? lastError.message : '未知错误';
            window.JianyingApp.utils.addLog(`[DownloadCore] 所有下载方式均失败: ${errMsg}`, 'error');
            throw lastError || new Error('下载失败');
        },

        /**
         * Node.js下载（自动跟随重定向）
         */
        async _downloadWithNodeWithRedirect(url, localPath, onProgress, maxRedirects = 5) {
            let currentUrl = url;
            for (let i = 0; i < maxRedirects; i++) {
                try {
                    return await this._downloadWithNode(currentUrl, localPath, onProgress);
                } catch (error) {
                    if (error.message.startsWith('REDIRECT:')) {
                        currentUrl = error.message.substring(9);
                        window.JianyingApp.utils.addLog(`[DownloadCore] 跟随重定向 -> ${currentUrl}`, 'info');
                        continue;
                    }
                    throw error;
                }
            }
            throw new Error('重定向次数过多');
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

                // 草稿名称：优先用JSON中的name，没有则用日期
                const draftName = draftData.name || `草稿_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
                const now = Date.now();

                // 生成各种配置文件
                const files = {
                    'draft_content.json': processedData,
                    'draft_info.json': processedData,
                    'draft_meta_info.json': {
                        draft_fold_path: projectPath,
                        draft_name: draftName,
                        draft_id: path.basename(projectPath),
                        create_time: now,
                        update_time: now,
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

                // 更新 root_meta_info.json，让剪映识别新草稿
                this._registerDraftInRootMeta(projectPath, draftName, now);

                return true;
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 生成配置文件失败: ${error.message}`, 'error');
                throw error;
            }
        },

        /**
         * 将新草稿注册到 root_meta_info.json，使剪映不用重启即可识别
         */
        _registerDraftInRootMeta(projectPath, draftName, createTime) {
            const fs = window.require('fs');
            const path = window.require('path');

            try {
                const draftRootPath = path.dirname(projectPath);
                const rootMetaPath = path.join(draftRootPath, 'root_meta_info.json');

                let rootMeta = { all_draft_store: [] };
                if (fs.existsSync(rootMetaPath)) {
                    try {
                        rootMeta = JSON.parse(fs.readFileSync(rootMetaPath, 'utf8'));
                    } catch (e) {
                        window.JianyingApp.utils.addLog(`[DownloadCore] root_meta_info.json解析失败，将重建`, 'warning');
                    }
                }

                if (!Array.isArray(rootMeta.all_draft_store)) {
                    rootMeta.all_draft_store = [];
                }

                const draftId = path.basename(projectPath);
                // 避免重复注册
                const exists = rootMeta.all_draft_store.some(d => d.draft_id === draftId);
                if (exists) {
                    window.JianyingApp.utils.addLog(`[DownloadCore] 草稿已存在于root_meta_info中，跳过注册`, 'info');
                    return;
                }

                const nowMicro = createTime * 1000; // 微秒时间戳

                const newEntry = {
                    cloud_draft_cover: false,
                    cloud_draft_sync: false,
                    draft_cloud_last_action_download: false,
                    draft_cloud_purchase_info: "",
                    draft_cloud_template_id: "",
                    draft_cloud_tutorial_info: "",
                    draft_cloud_videocut_purchase_info: "",
                    draft_cover: path.join(projectPath, 'draft_cover.jpg'),
                    draft_fold_path: projectPath,
                    draft_id: draftId,
                    draft_is_ai_shorts: false,
                    draft_is_cloud_temp_draft: false,
                    draft_is_invisible: false,
                    draft_is_web_article_video: false,
                    draft_json_file: path.join(projectPath, 'draft_content.json'),
                    draft_name: draftName,
                    draft_new_version: "",
                    draft_root_path: draftRootPath,
                    draft_timeline_materials_size: 0,
                    draft_type: "",
                    draft_web_article_video_enter_from: "",
                    streaming_edit_draft_ready: true,
                    tm_draft_cloud_completed: "",
                    tm_draft_cloud_entry_id: -1,
                    tm_draft_cloud_modified: 0,
                    tm_draft_cloud_parent_entry_id: -1,
                    tm_draft_cloud_space_id: -1,
                    tm_draft_cloud_user_id: -1,
                    tm_draft_create: nowMicro,
                    tm_draft_modified: nowMicro,
                    tm_draft_removed: 0,
                    tm_duration: 0
                };

                // 新草稿插入到最前面（剪映按时间倒序显示）
                rootMeta.all_draft_store.unshift(newEntry);

                fs.writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2), 'utf8');
                window.JianyingApp.utils.addLog(`[DownloadCore] ✅ 已将草稿 "${draftName}" 注册到剪映，无需重启剪映即可看到`, 'success');
            } catch (error) {
                window.JianyingApp.utils.addLog(`[DownloadCore] 注册草稿到root_meta_info失败: ${error.message}`, 'warning');
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
