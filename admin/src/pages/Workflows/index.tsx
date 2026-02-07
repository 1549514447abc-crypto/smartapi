import { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Modal, Form, Select, Switch, message, Spin, Row, Col, Popconfirm, Pagination, Upload, Image } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  DownloadOutlined,
  LinkOutlined,
  UploadOutlined,
  FileZipOutlined,
  PictureOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface RelatedLink {
  title: string;
  url: string;
  description?: string;
}

interface CategoryOption {
  category_key: string;
  category_name: string;
  icon: string;
}

interface PlatformOption {
  platform_key: string;
  platform_name: string;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  category: string;
  platform: string;
  cover_url: string;
  download_url: string;
  file_size: string;
  video_url: string;
  feishu_link: string;
  related_links: RelatedLink[];
  requires_paid_plugin: boolean;
  plugin_note: string;
  images: { url: string; description: string }[];
  is_public: boolean;
  status: 'published' | 'draft' | 'offline';
  view_count: number;
  use_count: number;
  rating: number;
  creator_id: number;
  creator?: {
    id: number;
    username: string;
    nickname: string;
  };
  created_at: string;
}

interface WorkflowStats {
  total_workflows: number;
  published_workflows: number;
  draft_workflows: number;
}

const Workflows = () => {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    total_workflows: 0,
    published_workflows: 0,
    draft_workflows: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [form] = Form.useForm();

  // 上传状态
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [workflowFileUrl, setWorkflowFileUrl] = useState<string>('');
  const [workflowFileList, setWorkflowFileList] = useState<UploadFile[]>([]);
  const [workflowFileSize, setWorkflowFileSize] = useState<string>('');
  const [teachingImages, setTeachingImages] = useState<{ url: string; description: string }[]>([]);
  const [teachingFileList, setTeachingFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 分类和平台选项（从API获取）
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [platformOptions, setPlatformOptions] = useState<{ value: string; label: string }[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('');

  // 响应式检测
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1800);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchPlatforms();
  }, []);

  useEffect(() => {
    fetchWorkflows();
    fetchStats();
  }, [page, statusFilter, categoryFilter, platformFilter]);

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const res = await api.get('/workflow-config/categories');
      if ((res as any).success) {
        const options = (res as any).data
          .filter((cat: CategoryOption) => cat.category_key !== 'all')
          .map((cat: CategoryOption) => ({
            value: cat.category_key,
            label: `${cat.icon} ${cat.category_name}`,
          }));
        setCategoryOptions(options);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  // 获取平台列表
  const fetchPlatforms = async () => {
    try {
      const res = await api.get('/workflow-config/platforms');
      if ((res as any).success) {
        const options = (res as any).data.map((p: PlatformOption) => ({
          value: p.platform_key,
          label: p.platform_name,
        }));
        setPlatformOptions(options);
      }
    } catch (error) {
      console.error('获取平台失败:', error);
    }
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (keyword) params.search = keyword;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (platformFilter) params.platform = platformFilter;

      const res = await api.get('/workflows', { params });
      if ((res as any).success) {
        setWorkflows((res as any).data.workflows || []);
        setTotal((res as any).data.pagination?.total || 0);
      }
    } catch (error) {
      message.error('获取工作流列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/workflows/admin/statistics');
      if ((res as any).success) {
        setStats((res as any).data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  const resetUploadStates = () => {
    setCoverUrl('');
    setCoverFileList([]);
    setWorkflowFileUrl('');
    setWorkflowFileList([]);
    setWorkflowFileSize('');
    setTeachingImages([]);
    setTeachingFileList([]);
  };

  const handleCreate = () => {
    setEditingWorkflow(null);
    form.resetFields();
    resetUploadStates();
    form.setFieldsValue({
      is_public: true,
      status: 'published',
      requires_paid_plugin: true, // 默认开启
      related_links: [],
      platform: 'coze', // 默认平台
    });
    setModalVisible(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    resetUploadStates();

    // 设置封面图
    if (workflow.cover_url) {
      setCoverUrl(workflow.cover_url);
      setCoverFileList([{
        uid: '-1',
        name: '封面图',
        status: 'done',
        url: workflow.cover_url,
      }]);
    }

    // 设置工作流文件
    if (workflow.download_url) {
      setWorkflowFileUrl(workflow.download_url);
      setWorkflowFileSize(workflow.file_size || '');
      setWorkflowFileList([{
        uid: '-1',
        name: workflow.download_url.split('/').pop() || '工作流文件',
        status: 'done',
        url: workflow.download_url,
      }]);
    }

    // 设置教学图片（兼容旧格式 string[] 和新格式 {url, description}[]）
    if (workflow.images && workflow.images.length > 0) {
      const formattedImages = workflow.images.map((img: any) => {
        if (typeof img === 'string') {
          return { url: img, description: '' };
        }
        return { url: img.url, description: img.description || '' };
      });
      setTeachingImages(formattedImages);
      setTeachingFileList(formattedImages.map((img, index) => ({
        uid: `-${index + 1}`,
        name: `图片${index + 1}`,
        status: 'done' as const,
        url: img.url,
      })));
    }

    // 解析 related_links
    let relatedLinks: RelatedLink[] = [];
    if (workflow.related_links) {
      if (typeof workflow.related_links === 'string') {
        try {
          relatedLinks = JSON.parse(workflow.related_links);
        } catch {
          relatedLinks = [];
        }
      } else {
        relatedLinks = workflow.related_links;
      }
    }

    form.setFieldsValue({
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      platform: workflow.platform,
      video_url: workflow.video_url,
      feishu_link: workflow.feishu_link,
      related_links: relatedLinks,
      requires_paid_plugin: workflow.requires_paid_plugin,
      plugin_note: workflow.plugin_note,
      is_public: workflow.is_public,
      status: workflow.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 构建提交数据
      const submitData = {
        ...values,
        cover_url: coverUrl,
        download_url: workflowFileUrl,
        file_size: workflowFileSize,
        images: teachingImages,
        related_links: values.related_links || [],
      };

      if (editingWorkflow) {
        await api.put(`/workflows/${editingWorkflow.id}`, submitData);
        message.success('工作流更新成功');
      } else {
        await api.post('/workflows', submitData);
        message.success('工作流创建成功');
      }

      setModalVisible(false);
      fetchWorkflows();
      fetchStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleStatusChange = async (workflow: Workflow, newStatus: string) => {
    try {
      await api.put(`/workflows/${workflow.id}`, { status: newStatus });
      message.success(`工作流状态已更新为${newStatus === 'published' ? '已发布' : newStatus === 'draft' ? '草稿' : '已下架'}`);
      fetchWorkflows();
      fetchStats();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/workflows/${id}`);
      message.success('工作流删除成功');
      fetchWorkflows();
      fetchStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 封面图上传配置
  const coverUploadProps: UploadProps = {
    name: 'file',
    fileList: coverFileList,
    maxCount: 1,
    accept: 'image/*',
    listType: 'picture-card',
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file as Blob);

      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_BASE_URL}/api/upload/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setCoverUrl(result.data.url);
          onSuccess?.(result.data);
          message.success('封面上传成功');
        } else {
          onError?.(new Error(result.error || '上传失败'));
          message.error(result.error || '上传失败');
        }
      } catch (error: any) {
        onError?.(error);
        message.error('上传失败: ' + error.message);
      } finally {
        setUploading(false);
      }
    },
    onChange: ({ fileList }) => {
      setCoverFileList(fileList);
      if (fileList.length === 0) setCoverUrl('');
    },
    onRemove: () => {
      setCoverUrl('');
      return true;
    },
  };

  // 工作流文件上传配置
  const workflowUploadProps: UploadProps = {
    name: 'file',
    fileList: workflowFileList,
    maxCount: 1,
    accept: '.zip',
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file as Blob);

      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_BASE_URL}/api/upload/workflows`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setWorkflowFileUrl(result.data.url);
          setWorkflowFileSize(formatFileSize((file as File).size));
          onSuccess?.(result.data);
          message.success('工作流文件上传成功');
        } else {
          onError?.(new Error(result.error || '上传失败'));
          message.error(result.error || '上传失败');
        }
      } catch (error: any) {
        onError?.(error);
        message.error('上传失败: ' + error.message);
      } finally {
        setUploading(false);
      }
    },
    onChange: ({ fileList }) => {
      setWorkflowFileList(fileList);
      if (fileList.length === 0) {
        setWorkflowFileUrl('');
        setWorkflowFileSize('');
      }
    },
    onRemove: () => {
      setWorkflowFileUrl('');
      setWorkflowFileSize('');
      return true;
    },
  };

  // 教学图片上传配置
  const teachingUploadProps: UploadProps = {
    name: 'file',
    fileList: teachingFileList,
    multiple: true,
    accept: 'image/*',
    listType: 'picture-card',
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file as Blob);

      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_BASE_URL}/api/upload/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setTeachingImages(prev => [...prev, { url: result.data.url, description: '' }]);
          onSuccess?.(result.data);
          message.success('图片上传成功');
        } else {
          onError?.(new Error(result.error || '上传失败'));
          message.error(result.error || '上传失败');
        }
      } catch (error: any) {
        onError?.(error);
        message.error('上传失败: ' + error.message);
      } finally {
        setUploading(false);
      }
    },
    onChange: ({ fileList }) => {
      setTeachingFileList(fileList);
    },
    onRemove: (file) => {
      const url = file.url || (file.response as any)?.url;
      if (url) {
        setTeachingImages(prev => prev.filter(img => img.url !== url));
      }
      return true;
    },
  };

  const getCategoryLabel = (category: string) => {
    const cat = categoryOptions.find(c => c.value === category);
    return cat?.label || category || '未分类';
  };

  const getPlatformLabel = (platform: string) => {
    const p = platformOptions.find(p => p.value === platform);
    return p?.label || platform || '未知';
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      published: { label: '已发布', className: 'badge-success' },
      draft: { label: '草稿', className: 'badge-warning' },
      offline: { label: '已下架', className: 'badge-info' },
    };
    return statusMap[status] || statusMap['draft'];
  };

  const statCards = [
    {
      title: '工作流总数',
      value: stats.total_workflows,
      icon: <BranchesOutlined />,
      iconBg: '#eff6ff',
      iconColor: '#0ea5e9',
    },
    {
      title: '已发布',
      value: stats.published_workflows,
      icon: <CheckCircleOutlined />,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
    },
    {
      title: '草稿',
      value: stats.draft_workflows,
      icon: <FileTextOutlined />,
      iconBg: '#fff7ed',
      iconColor: '#f97316',
    },
  ];

  const columns = [
    {
      title: '工作流',
      dataIndex: 'name',
      width: 300,
      render: (name: string, record: Workflow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56,
            height: 42,
            borderRadius: 8,
            background: record.cover_url ? `url(${record.cover_url}) center/cover` : 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            flexShrink: 0,
          }}>
            {!record.cover_url && <BranchesOutlined />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.description || '暂无描述'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (category: string) => <span className="badge badge-info">{getCategoryLabel(category)}</span>,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 100,
      render: (platform: string) => <span className="badge badge-primary">{getPlatformLabel(platform)}</span>,
    },
    {
      title: '下载/浏览',
      width: 100,
      render: (_: any, record: Workflow) => (
        <div style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
            <DownloadOutlined /> {record.use_count || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <EyeOutlined /> {record.view_count || 0}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <span className={`badge ${config.className}`}>{config.label}</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 110,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      width: 220,
      render: (_: any, record: Workflow) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => handleStatusChange(record, 'published')}>
              发布上架
            </Button>
          )}
          {record.status === 'published' && (
            <Button size="small" onClick={() => handleStatusChange(record, 'offline')}>
              下架
            </Button>
          )}
          {record.status === 'offline' && (
            <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => handleStatusChange(record, 'published')}>
              重新上架
            </Button>
          )}
          <Popconfirm title="确定删除这个工作流吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // 卡片视图渲染
  const renderCardView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {workflows.map((workflow) => {
        const statusConfig = getStatusConfig(workflow.status);
        return (
          <div key={workflow.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{
                width: 64,
                height: 48,
                borderRadius: 8,
                background: workflow.cover_url ? `url(${workflow.cover_url}) center/cover` : 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                flexShrink: 0,
              }}>
                {!workflow.cover_url && <BranchesOutlined />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {workflow.name}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {workflow.description || '暂无描述'}
                </p>
              </div>
              <span className={`badge ${statusConfig.className}`} style={{ flexShrink: 0 }}>{statusConfig.label}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="badge badge-info">{getCategoryLabel(workflow.category)}</span>
              {workflow.requires_paid_plugin && <span className="badge badge-warning">需付费插件</span>}
              {workflow.download_url && (
                <span className="badge badge-success">
                  <DownloadOutlined style={{ marginRight: 4 }} />
                  {workflow.file_size || '有下载'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: '#22c55e' }}><DownloadOutlined style={{ marginRight: 4 }} />{workflow.use_count || 0} 下载</span>
              <span style={{ color: '#64748b' }}><EyeOutlined style={{ marginRight: 4 }} />{workflow.view_count || 0} 浏览</span>
              {workflow.feishu_link && (
                <a href={workflow.feishu_link} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9' }}>
                  <LinkOutlined style={{ marginRight: 4 }} />飞书文档
                </a>
              )}
              <span style={{ color: '#94a3b8' }}>{dayjs(workflow.created_at).format('YYYY-MM-DD')}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(workflow)}>编辑</Button>
              {workflow.status === 'draft' && (
                <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => handleStatusChange(workflow, 'published')}>发布上架</Button>
              )}
              {workflow.status === 'published' && (
                <Button size="small" onClick={() => handleStatusChange(workflow, 'offline')}>下架</Button>
              )}
              {workflow.status === 'offline' && (
                <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => handleStatusChange(workflow, 'published')}>重新上架</Button>
              )}
              <Popconfirm title="确定删除这个工作流吗？" onConfirm={() => handleDelete(workflow.id)} okText="确定" cancelText="取消">
                <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </div>
          </div>
        );
      })}

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination current={page} pageSize={20} total={total} onChange={setPage} showTotal={(total) => `共 ${total} 条`} size="small" />
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">工作流管理</h1>
          <p className="page-subtitle">管理平台工作流模板（会员/学员免费下载）</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchWorkflows(); fetchStats(); }} style={{ flex: 1 }}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ flex: 1 }}>添加工作流</Button>
        </div>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={8} key={index}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="stat-icon" style={{ background: card.iconBg, color: card.iconColor }}>{card.icon}</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{card.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Card bordered={false}>
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="搜索工作流名称..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => { setPage(1); fetchWorkflows(); }}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select
              placeholder="状态"
              value={statusFilter || undefined}
              onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
              style={{ width: '100%' }}
              allowClear
              options={[
                { value: 'published', label: '已发布' },
                { value: 'draft', label: '草稿' },
                { value: 'offline', label: '已下架' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select
              placeholder="分类"
              value={categoryFilter || undefined}
              onChange={(v) => { setCategoryFilter(v || ''); setPage(1); }}
              style={{ width: '100%' }}
              allowClear
              options={categoryOptions}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select
              placeholder="平台"
              value={platformFilter || undefined}
              onChange={(v) => { setPlatformFilter(v || ''); setPage(1); }}
              style={{ width: '100%' }}
              allowClear
              options={platformOptions}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Button icon={<SearchOutlined />} onClick={() => { setPage(1); fetchWorkflows(); }} style={{ width: '100%' }}>搜索</Button>
          </Col>
        </Row>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
            <Spin size="large" />
          </div>
        ) : isMobile ? (
          renderCardView()
        ) : (
          <Table columns={columns} dataSource={workflows} rowKey="id" pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (total) => `共 ${total} 条` }} scroll={{ x: 1200 }} />
        )}
      </Card>

      {/* 编辑/创建弹窗 */}
      <Modal
        title={editingWorkflow ? '编辑工作流' : '添加工作流'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={800}
        confirmLoading={uploading}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          {/* 基本信息 */}
          <div style={{ marginBottom: 16, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            基本信息
          </div>

          <Form.Item name="name" label="工作流名称" rules={[{ required: true, message: '请输入工作流名称' }]}>
            <Input placeholder="如：抖音对标账号粉丝画像分析" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                <Select placeholder="选择分类" options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="platform" label="平台" rules={[{ required: true, message: '请选择平台' }]}>
                <Select placeholder="选择平台" options={platformOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="工作流描述" tooltip="支持Markdown格式，可插入链接如 [链接文字](URL)">
            <Input.TextArea rows={4} placeholder="输入工作流功能描述&#10;支持Markdown格式，可插入链接：[如何获取API key](https://xxx.feishu.cn/xxx)" />
          </Form.Item>

          {/* 文件上传 */}
          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <PictureOutlined style={{ marginRight: 8 }} />封面图片
          </div>

          <Form.Item label="封面图">
            <Upload {...coverUploadProps}>
              {coverFileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传封面</div>
                </div>
              )}
            </Upload>
            {coverUrl && <Image src={coverUrl} width={100} style={{ marginTop: 8 }} />}
          </Form.Item>

          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <FileZipOutlined style={{ marginRight: 8 }} />工作流文件
          </div>

          <Form.Item label="工作流压缩包（ZIP）">
            <Upload {...workflowUploadProps}>
              <Button icon={<UploadOutlined />}>选择ZIP文件</Button>
            </Upload>
            {workflowFileUrl && (
              <div style={{ marginTop: 8, color: '#22c55e' }}>
                <FileZipOutlined style={{ marginRight: 4 }} />
                已上传: {workflowFileUrl.split('/').pop()} ({workflowFileSize})
              </div>
            )}
          </Form.Item>

          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <PictureOutlined style={{ marginRight: 8 }} />教学图片（带说明）
          </div>

          <Form.Item label="教学图片">
            <Upload {...teachingUploadProps} showUploadList={false}>
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
              每张图片可添加说明文字，如"输入示例"、"输出结果"等
            </div>
          </Form.Item>

          {/* 图片列表带描述 */}
          {teachingImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teachingImages.map((img, index) => (
                <div key={img.url} style={{ display: 'flex', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, alignItems: 'flex-start' }}>
                  <Image src={img.url} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input
                      placeholder="图片说明（如：输入示例、输出结果、操作步骤等）"
                      value={img.description}
                      onChange={(e) => {
                        setTeachingImages(prev => prev.map((item, i) =>
                          i === index ? { ...item, description: e.target.value } : item
                        ));
                      }}
                    />
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>图片 {index + 1}</div>
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setTeachingImages(prev => prev.filter((_, i) => i !== index));
                      setTeachingFileList(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 相关链接 */}
          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <LinkOutlined style={{ marginRight: 8 }} />相关链接
          </div>

          <Form.Item name="feishu_link" label="飞书文档链接（主要使用说明）">
            <Input placeholder="输入飞书文档URL" />
          </Form.Item>

          <Form.Item name="video_url" label="教学视频链接">
            <Input placeholder="输入教学视频URL（可选）" />
          </Form.Item>

          <Form.List name="related_links">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, color: '#64748b', fontSize: 13 }}>其他相关链接（可添加多个）</div>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 12, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Form.Item {...restField} name={[name, 'title']} style={{ marginBottom: 8 }}>
                        <Input placeholder="链接标题（如：如何获取阿里云API key）" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'url']} style={{ marginBottom: 8 }}>
                        <Input placeholder="链接URL" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'description']} style={{ marginBottom: 0 }}>
                        <Input placeholder="链接说明（可选）" />
                      </Form.Item>
                    </div>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444', fontSize: 18, cursor: 'pointer', marginTop: 8 }} />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加链接
                </Button>
              </>
            )}
          </Form.List>

          {/* 插件说明 */}
          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            插件说明
          </div>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="requires_paid_plugin" label="需要付费插件" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="plugin_note" label="插件说明">
                <Input placeholder="如：本工作流需要用到付费插件，请按需使用" />
              </Form.Item>
            </Col>
          </Row>

          {/* 状态设置 */}
          <div style={{ marginBottom: 16, marginTop: 24, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            状态设置
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_public" label="公开可见" valuePropName="checked">
                <Switch checkedChildren="公开" unCheckedChildren="私有" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="发布状态">
                <Select options={[
                  { value: 'published', label: '已发布' },
                  { value: 'draft', label: '草稿' },
                  { value: 'offline', label: '已下架' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Workflows;
