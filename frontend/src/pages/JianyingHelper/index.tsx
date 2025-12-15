import { useEffect, useState } from 'react';
import { api } from '../../api/request';
import {
  Loader2,
  Download,
  Monitor,
  Apple,
  Sparkles,
  FileVideo,
  Cloud,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { message } from 'antd';

interface AppDownload {
  id: number;
  app_key: string;
  app_name: string;
  description: string | null;
  windows_url: string | null;
  mac_url: string | null;
  windows_version: string | null;
  mac_version: string | null;
  icon_url: string | null;
  features: { title: string; description: string }[] | null;
  download_count: number;
}

const JianyingHelper = () => {
  const [loading, setLoading] = useState(true);
  const [appInfo, setAppInfo] = useState<AppDownload | null>(null);
  const [draftUrl, setDraftUrl] = useState('');

  useEffect(() => {
    fetchAppInfo();
  }, []);

  const fetchAppInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: AppDownload }>('/apps/jianying_helper');
      if (response.success) {
        setAppInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch app info:', error);
      // 使用默认数据
      setAppInfo({
        id: 1,
        app_key: 'jianying_helper',
        app_name: '剪映小助手',
        description: '专业的视频创作辅助工具，让您的视频制作更加高效便捷。支持一键导入剪映草稿、智能模板管理、云端同步备份等功能，让创作更轻松。',
        windows_url: null,
        mac_url: null,
        windows_version: '1.0.0',
        mac_version: '1.0.0',
        icon_url: null,
        features: [
          { title: '一键导入剪映草稿', description: '快速将草稿导入剪映，节省创作时间' },
          { title: '智能模板管理', description: '管理和复用您的创作模板' },
          { title: '云端同步备份', description: '安全备份您的创作内容' }
        ],
        download_count: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (platform: 'windows' | 'mac') => {
    if (!appInfo) return;

    const url = platform === 'mac' ? appInfo.mac_url : appInfo.windows_url;
    if (!url) {
      message.warning(`${platform === 'mac' ? 'Mac' : 'Windows'} 版本暂未发布`);
      return;
    }

    try {
      // 记录下载
      await api.post(`/apps/jianying_helper/download`, { platform });
      // 打开下载链接
      window.open(url, '_blank');
    } catch (error) {
      // 即使记录失败也打开下载链接
      window.open(url, '_blank');
    }
  };

  const copyDraftUrl = () => {
    if (draftUrl) {
      navigator.clipboard.writeText(draftUrl);
      message.success('草稿地址已复制');
    } else {
      message.warning('请先输入草稿地址');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 顶部标题区 */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-pink-200 via-violet-200 to-sky-200 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-200">
            <FileVideo className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {appInfo?.app_name || '剪映小助手'}
            </h1>
            <p className="text-slate-500">
              下载并安装剪映小助手客户端，开启智能视频创作之旅
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Download className="w-4 h-4" />
            <span>{appInfo?.download_count || 0} 次下载</span>
          </div>
        </div>
      </div>

      {/* 下载区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Windows 下载 */}
        <div className="card p-6 group hover:shadow-lg transition-all">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-lg mb-1">Windows 版本</h3>
              <p className="text-sm text-slate-500 mb-3">
                仅支持 Win8.1 以上版本
              </p>
              {appInfo?.windows_version && (
                <p className="text-xs text-slate-400 mb-3">
                  当前版本：v{appInfo.windows_version}
                </p>
              )}
              <button
                onClick={() => handleDownload('windows')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  appInfo?.windows_url
                    ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-200 hover:shadow-xl'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                disabled={!appInfo?.windows_url}
              >
                <Download className="w-4 h-4" />
                {appInfo?.windows_url ? '立即下载' : '暂未发布'}
              </button>
            </div>
          </div>
        </div>

        {/* Mac 下载 */}
        <div className="card p-6 group hover:shadow-lg transition-all">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
              <Apple className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-lg mb-1">Mac 版本</h3>
              <p className="text-sm text-slate-500 mb-3">
                支持 macOS 10.15 及以上
              </p>
              {appInfo?.mac_version && (
                <p className="text-xs text-slate-400 mb-3">
                  当前版本：v{appInfo.mac_version}
                </p>
              )}
              <button
                onClick={() => handleDownload('mac')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  appInfo?.mac_url
                    ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg shadow-slate-200 hover:shadow-xl'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                disabled={!appInfo?.mac_url}
              >
                <Download className="w-4 h-4" />
                {appInfo?.mac_url ? '立即下载' : '暂未发布'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 草稿导入区域 */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">剪映草稿导出</h2>
            <p className="text-sm text-slate-500">复制草稿地址到客户端首页，即可创建剪映草稿</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">草稿地址</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="粘贴您的草稿地址..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
            <button
              onClick={copyDraftUrl}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制
            </button>
          </div>
          {!draftUrl && (
            <p className="mt-2 text-xs text-slate-400">
              未识别到草稿地址，请先生成草稿
            </p>
          )}
        </div>
      </div>

      {/* 产品介绍区域 */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">产品介绍</h2>
            <p className="text-sm text-slate-500">{appInfo?.app_name || '剪映小助手'}</p>
          </div>
        </div>

        <p className="text-slate-600 mb-6 leading-relaxed">
          {appInfo?.description || '专业的视频创作辅助工具，让您的视频制作更加高效便捷。支持一键导入剪映草稿、智能模板管理、云端同步备份等功能，让创作更轻松。'}
        </p>

        {/* 功能特性 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(appInfo?.features || [
            { title: '一键导入剪映草稿', description: '快速将草稿导入剪映，节省创作时间' },
            { title: '智能模板管理', description: '管理和复用您的创作模板' },
            { title: '云端同步备份', description: '安全备份您的创作内容' }
          ]).map((feature, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h4 className="font-medium text-slate-900">{feature.title}</h4>
              </div>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="card p-6 bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 text-white flex items-center justify-center flex-shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">快速上手指南</h3>
            <p className="text-sm text-slate-600">
              1. 下载并安装客户端 → 2. 登录您的账号 → 3. 复制草稿地址到客户端 → 4. 一键生成剪映草稿
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-violet-600 text-sm font-medium border border-violet-200 hover:bg-violet-50 transition-colors flex-shrink-0"
          >
            查看教程
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default JianyingHelper;
