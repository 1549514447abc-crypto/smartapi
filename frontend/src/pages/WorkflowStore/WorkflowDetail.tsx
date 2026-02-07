import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Tag, message, Image } from 'antd';
import { ArrowLeft, Download, Lock, ExternalLink, Play, FileText, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';
import type { Workflow } from '../../types/workflow';

const categoryLabels: Record<string, string> = {
  self_media: '自媒体',
  celebrity: '网红孵化',
  tools: '效率工具',
  image_process: '图片处理',
  ecommerce: '电商带货',
  video: '视频制作',
  education: '教育培训',
  image_gen: 'AI绘图',
  novel: '小说推文',
};

const WorkflowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, hasMemberAccess } = useAuthStore();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [membershipPrice, setMembershipPrice] = useState(299);

  const isMember = hasMemberAccess();

  // 合并所有图片（封面 + 教学图片），去重，支持新格式 {url, description}
  const allImages = useMemo(() => {
    if (!workflow) return [];
    const imageSet = new Set<string>();
    const images: { url: string; description: string }[] = [];

    // 先加封面图（封面没有描述）
    if (workflow.cover_url) {
      imageSet.add(workflow.cover_url);
      images.push({ url: workflow.cover_url, description: '' });
    }

    // 再加教学图片（去重，支持旧格式 string[] 和新格式 {url, description}[]）
    if (workflow.images && workflow.images.length > 0) {
      workflow.images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img.url;
        const description = typeof img === 'string' ? '' : (img.description || '');
        if (!imageSet.has(url)) {
          imageSet.add(url);
          images.push({ url, description });
        }
      });
    }

    return images;
  }, [workflow]);

  useEffect(() => {
    fetchWorkflowDetail();
    // 获取价格配置
    api.get<{ success: boolean; data: { yearlyMembershipPrice: number } }>('/system-config/prices')
      .then(res => {
        if (res.success && res.data.yearlyMembershipPrice) {
          setMembershipPrice(res.data.yearlyMembershipPrice);
        }
      })
      .catch(() => {});
  }, [id]);

  const fetchWorkflowDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: Workflow }>(`/workflows/${id}`);
      if (response.success) {
        setWorkflow(response.data);
        // 记录浏览次数
        api.post(`/workflows/${id}/view`).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to fetch workflow detail:', error);
      message.error('获取工作流详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      message.info('请先登录');
      navigate('/login', { state: { from: `/workflow-store/${id}` } });
      return;
    }

    if (!isMember) {
      message.info('开通年度会员后可免费下载所有工作流');
      navigate('/membership');
      return;
    }

    if (!workflow?.download_url) {
      message.warning('该工作流暂无下载文件');
      if (workflow?.feishu_link) {
        window.open(workflow.feishu_link, '_blank');
      }
      return;
    }

    try {
      await api.post(`/workflows/${workflow.id}/download`);
      window.open(workflow.download_url, '_blank');
      message.success('开始下载');
    } catch (error) {
      window.open(workflow.download_url, '_blank');
    }
  };

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-600">工作流不存在</p>
        <Button onClick={() => navigate('/workflow-store')}>返回工作流商店</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/workflow-store')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回工作流商店</span>
          </button>

          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              isMember
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white hover:shadow-lg'
                : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg'
            }`}
          >
            {isMember ? (
              <>
                <Download className="w-5 h-5" />
                免费下载
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                开通会员下载
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Cover & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {allImages.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Main Image */}
                <div className="relative">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => openImagePreview(currentImageIndex)}
                  >
                    <img
                      src={allImages[currentImageIndex].url}
                      alt={workflow.name}
                      className="w-full h-auto max-h-[500px] object-contain bg-slate-100"
                    />
                    {/* Overlay hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white bg-black/50 px-4 py-2 rounded-lg transition-opacity">
                        点击查看大图
                      </span>
                    </div>
                  </div>

                  {/* Image Description */}
                  {allImages[currentImageIndex].description && (
                    <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-t border-violet-100">
                      <p className="text-base text-slate-800 font-semibold">
                        {allImages[currentImageIndex].description}
                      </p>
                    </div>
                  )}

                  {/* Navigation arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
                        className="absolute left-4 top-[200px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
                      >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                        className="absolute right-4 top-[200px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
                      >
                        <ChevronRight className="w-6 h-6 text-slate-700" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {allImages.length > 1 && (
                  <div className="p-4 border-t border-slate-100">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                            currentImageIndex === index
                              ? 'border-violet-500 ring-2 ring-violet-200'
                              : 'border-transparent hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.description || `图片 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-2 text-center">
                      {currentImageIndex + 1} / {allImages.length}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Fallback if no images */}
            {allImages.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="w-full h-64 bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                  <span className="text-6xl">⚙️</span>
                </div>
              </div>
            )}

            {/* Title & Description */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-900">{workflow.name}</h1>
                <div className="flex gap-2 flex-shrink-0">
                  {workflow.category && (
                    <Tag color="blue">{categoryLabels[workflow.category] || workflow.category}</Tag>
                  )}
                  {workflow.requires_paid_plugin && (
                    <Tag color="orange">需付费插件</Tag>
                  )}
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                {workflow.description || '暂无描述'}
              </p>

              {workflow.plugin_note && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>插件说明：</strong>{workflow.plugin_note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="space-y-6">
            {/* Member Status */}
            <div className={`rounded-2xl p-5 ${
              isMember
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
                : 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200'
            }`}>
              {isMember ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900">您已是会员</p>
                    <p className="text-sm text-amber-700">可免费下载此工作流</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">开通会员</p>
                      <p className="text-sm text-slate-600">下载所有工作流</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/membership')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold hover:shadow-lg transition-all"
                  >
                    ¥{membershipPrice}/年 立即开通
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">工作流信息</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">下载次数</span>
                  <span className="font-semibold text-slate-900">{workflow.use_count || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">浏览次数</span>
                  <span className="font-semibold text-slate-900">{workflow.view_count || 0}</span>
                </div>
                {workflow.file_size && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">文件大小</span>
                    <span className="font-semibold text-slate-900">{workflow.file_size}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">发布时间</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* External Links */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">相关链接</h3>

              {workflow.video_url && (
                <button
                  onClick={() => window.open(workflow.video_url!, '_blank')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  <span className="font-medium">观看教学视频</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </button>
              )}

              {workflow.feishu_link && (
                <button
                  onClick={() => window.open(workflow.feishu_link!, '_blank')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">查看飞书文档</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </button>
              )}

              {/* 其他相关链接 */}
              {workflow.related_links && workflow.related_links.length > 0 && (
                <div className="space-y-2 pt-2">
                  {workflow.related_links.map((link: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => window.open(link.url, '_blank')}
                      className="w-full flex items-start gap-3 p-3 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                    >
                      <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block">{link.title || '相关链接'}</span>
                        {link.description && (
                          <span className="text-xs text-slate-500 block mt-0.5">{link.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!workflow.video_url && !workflow.feishu_link && (!workflow.related_links || workflow.related_links.length === 0) && (
                <p className="text-slate-500 text-center py-2">暂无相关链接</p>
              )}
            </div>

            {/* Download Button (Mobile) */}
            <button
              onClick={handleDownload}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all lg:hidden ${
                isMember
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white hover:shadow-lg'
                  : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg'
              }`}
            >
              {isMember ? (
                <>
                  <Download className="w-6 h-6" />
                  免费下载工作流
                </>
              ) : (
                <>
                  <Lock className="w-6 h-6" />
                  开通会员下载
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <Image.PreviewGroup
        preview={{
          visible: previewVisible,
          onVisibleChange: (vis) => setPreviewVisible(vis),
          current: previewIndex,
          onChange: (current) => setPreviewIndex(current),
        }}
        items={allImages.map(img => img.url)}
      >
        {/* 隐藏的触发器 */}
      </Image.PreviewGroup>
    </div>
  );
};

export default WorkflowDetail;
