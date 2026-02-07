import { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Modal, Form, Select, Switch, message, Spin, Row, Col, Tag, Popconfirm, Upload, Image } from 'antd';

const { Dragger } = Upload;
import type { UploadFile, UploadProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined,
  LoadingOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/request';

interface Plugin {
  id: number;
  name: string;
  description: string;
  category: string;
  icon_url: string;
  version: string;
  is_free: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'offline' | 'coming_soon';
  install_count: number;
  rating: number;
  review_count: number;
  developer_id: number;
  feishu_link: string | null;
  developer?: {
    id: number;
    username: string;
    nickname: string;
  };
  created_at: string;
}

interface PluginStats {
  total_plugins: number;
  approved_plugins: number;
  coming_soon_plugins: number;
  offline_plugins: number;
  pending_plugins: number;
  rejected_plugins: number;
  total_installations: number;
}

// API基础URL - 使用相对路径，与其他API保持一致
const API_BASE_URL = '';

const Plugins = () => {
  const [loading, setLoading] = useState(true);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [stats, setStats] = useState<PluginStats>({
    total_plugins: 0,
    approved_plugins: 0,
    coming_soon_plugins: 0,
    offline_plugins: 0,
    pending_plugins: 0,
    rejected_plugins: 0,
    total_installations: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [form] = Form.useForm();

  // 图标上传相关状态
  const [iconUrl, setIconUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 分类选项（从API获取）
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);

  // 响应式检测 - 始终使用卡片视图，永远不会有横向滚动
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // 只有超大屏幕(1800px以上)才用表格
    const handleResize = () => setIsMobile(window.innerWidth < 1800);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  // 获取插件分类列表
  const fetchCategories = async () => {
    try {
      const res = await api.get('/plugin-categories');
      if ((res as any).success) {
        const options = (res as any).data
          .filter((cat: any) => cat.category_key !== 'all')
          .map((cat: any) => ({
            value: cat.category_key,
            label: `${cat.icon} ${cat.category_name}`,
          }));
        setCategoryOptions(options);
      }
    } catch (error) {
      console.error('获取插件分类失败:', error);
    }
  };

  useEffect(() => {
    fetchPlugins();
    fetchStats();
  }, [page, statusFilter, categoryFilter]);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (keyword) params.search = keyword;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/plugins', { params });
      if ((res as any).success) {
        setPlugins((res as any).data.plugins || []);
        setTotal((res as any).data.pagination?.total || 0);
      }
    } catch (error) {
      message.error('获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/plugins/admin/statistics');
      if ((res as any).success) {
        setStats((res as any).data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  const handleCreate = () => {
    setEditingPlugin(null);
    form.resetFields();
    form.setFieldsValue({
      is_free: true,
      version: '1.0.0',
      status: 'offline', // 默认创建为下架状态，需要手动上架
    });
    setIconUrl('');
    setFileList([]);
    setModalVisible(true);
  };

  const handleEdit = (plugin: Plugin) => {
    setEditingPlugin(plugin);
    form.setFieldsValue({
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      version: plugin.version,
      is_free: plugin.is_free,
      status: plugin.status,
      feishu_link: plugin.feishu_link,
    });
    // 设置已有图标
    setIconUrl(plugin.icon_url || '');
    if (plugin.icon_url) {
      setFileList([{
        uid: '-1',
        name: 'icon',
        status: 'done',
        url: plugin.icon_url,
      }]);
    } else {
      setFileList([]);
    }
    setModalVisible(true);
  };

  // 图标上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    fileList,
    maxCount: 1,
    accept: 'image/*',
    showUploadList: false,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file as Blob);

      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${API_BASE_URL}/api/upload/icons`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setIconUrl(result.data.url);
          onSuccess?.(result.data);
          message.success('图标上传成功');
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
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      if (newFileList.length === 0) {
        setIconUrl('');
      }
    },
    onRemove: () => {
      setIconUrl('');
      setFileList([]);
    },
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 添加图标URL
      const submitData = {
        ...values,
        icon_url: iconUrl || null,
      };

      if (editingPlugin) {
        await api.put(`/plugins/${editingPlugin.id}`, submitData);
        message.success('插件更新成功');
      } else {
        await api.post('/plugins', submitData);
        message.success('插件创建成功');
      }

      setModalVisible(false);
      fetchPlugins();
      fetchStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleStatusChange = async (plugin: Plugin, newStatus: string) => {
    try {
      await api.put(`/plugins/${plugin.id}`, { status: newStatus });
      const statusText = newStatus === 'approved' ? '已上架' : newStatus === 'coming_soon' ? '即将上线' : '已下架';
      message.success(`插件状态已更新为${statusText}`);
      fetchPlugins();
      fetchStats();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/plugins/${id}`);
      message.success('插件删除成功');
      fetchPlugins();
      fetchStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const statCards = [
    {
      title: '插件总数',
      value: stats.total_plugins,
      icon: <AppstoreOutlined />,
      iconBg: '#eff6ff',
      iconColor: '#0ea5e9',
    },
    {
      title: '已上架',
      value: stats.approved_plugins,
      icon: <CheckCircleOutlined />,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
    },
    {
      title: '即将上线',
      value: stats.coming_soon_plugins,
      icon: <ClockCircleOutlined />,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
    },
    {
      title: '已下架',
      value: stats.offline_plugins,
      icon: <ReloadOutlined />,
      iconBg: '#f1f5f9',
      iconColor: '#64748b',
    },
  ];

  const columns = [
    {
      title: '插件',
      dataIndex: 'name',
      width: 280,
      render: (name: string, record: Plugin) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: record.icon_url ? `url(${record.icon_url}) center/cover` : '#0ea5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 18,
            flexShrink: 0,
          }}>
            {!record.icon_url && name.charAt(0)}
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
      width: 100,
      render: (category: string) => {
        const cat = categoryOptions.find(c => c.value === category);
        return <span className="badge badge-info">{cat?.label || category || '未分类'}</span>;
      },
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 80,
      render: (version: string) => <Tag color="blue">v{version || '1.0.0'}</Tag>,
    },
    {
      title: '价格',
      dataIndex: 'is_free',
      width: 80,
      render: (isFree: boolean) => (
        <span className={`badge ${isFree ? 'badge-success' : 'badge-warning'}`}>
          {isFree ? '免费' : '付费'}
        </span>
      ),
    },
    {
      title: '安装量',
      dataIndex: 'install_count',
      width: 90,
      render: (count: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{count || 0}</span>
      ),
    },
    {
      title: '开发者',
      dataIndex: 'developer',
      width: 120,
      render: (developer: Plugin['developer']) => (
        <span style={{ color: '#64748b' }}>{developer?.nickname || developer?.username || '系统'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          approved: { label: '已上架', className: 'badge-success' },
          coming_soon: { label: '即将上线', className: 'badge-warning' },
          offline: { label: '已下架', className: 'badge-info' },
        };
        const config = statusMap[status] || { label: '未知状态', className: 'badge-default' };
        return <span className={`badge ${config.className}`}>{config.label}</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: Plugin) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 'approved' && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: '#f59e0b' }}
                onClick={() => handleStatusChange(record, 'coming_soon')}
              >
                即将上线
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleStatusChange(record, 'offline')}
              >
                下架
              </Button>
            </>
          )}
          {record.status === 'coming_soon' && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: '#22c55e' }}
                onClick={() => handleStatusChange(record, 'approved')}
              >
                上架
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleStatusChange(record, 'offline')}
              >
                下架
              </Button>
            </>
          )}
          {record.status === 'offline' && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: '#22c55e' }}
                onClick={() => handleStatusChange(record, 'approved')}
              >
                上架
              </Button>
              <Button
                type="link"
                size="small"
                style={{ color: '#f59e0b' }}
                onClick={() => handleStatusChange(record, 'coming_soon')}
              >
                即将上线
              </Button>
            </>
          )}
          {!['approved', 'coming_soon', 'offline'].includes(record.status) && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: '#22c55e' }}
                onClick={() => handleStatusChange(record, 'approved')}
              >
                上架
              </Button>
              <Button
                type="link"
                size="small"
                style={{ color: '#f59e0b' }}
                onClick={() => handleStatusChange(record, 'coming_soon')}
              >
                即将上线
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleStatusChange(record, 'offline')}
              >
                下架
              </Button>
            </>
          )}
          <Popconfirm
            title="确定删除这个插件吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* 1. 页面标题：flexWrap 自动换行 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', margin: 0 }}>插件管理</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>管理和审核平台插件</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchPlugins(); fetchStats(); }}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加插件
          </Button>
        </div>
      </div>

      {/* 2. 统计卡片：Row/Col 自动流式布局 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col xs={12} sm={12} md={6} lg={6} key={index}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  background: card.iconBg,
                  color: card.iconColor,
                  width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{card.title}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{card.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Card bordered={false} styles={{ body: { padding: isMobile ? 12 : 24 } }}>
        {/* 3. 筛选栏：Grid系统，手机上输入框占满一行 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="搜索插件..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => { setPage(1); fetchPlugins(); }}
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
                { value: 'approved', label: '已上架' },
                { value: 'coming_soon', label: '即将上线' },
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
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : isMobile ? (
          /* 4. 卡片视图：minWidth: 0 防止文字撑开容器 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plugins.map((plugin) => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                approved: { label: '已上架', color: '#10b981', bg: '#ecfdf5' },
                coming_soon: { label: '即将上线', color: '#f59e0b', bg: '#fef3c7' },
                offline: { label: '已下架', color: '#64748b', bg: '#f1f5f9' },
              };
              const statusConfig = statusMap[plugin.status] || { label: '未知状态', color: '#64748b', bg: '#f1f5f9' };
              const cat = categoryOptions.find(c => c.value === plugin.category);

              return (
                <div key={plugin.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      background: plugin.icon_url ? `url(${plugin.icon_url}) center/cover` : '#0ea5e9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 600, fontSize: 18,
                    }}>
                      {!plugin.icon_url && plugin.name.charAt(0)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {plugin.name}
                        </h3>
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                          background: statusConfig.bg, color: statusConfig.color, whiteSpace: 'nowrap'
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plugin.description || '暂无描述'}
                      </p>
                    </div>
                  </div>

                  {/* 标签行：自动换行 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <Tag>{cat?.label || '未分类'}</Tag>
                    <Tag color="blue">v{plugin.version || '1.0.0'}</Tag>
                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                      <DownloadOutlined style={{ marginRight: 4 }} /> {plugin.install_count || 0}
                    </span>
                    {plugin.is_free ? <Tag color="green">免费</Tag> : <Tag color="orange">付费</Tag>}
                  </div>

                  {/* 按钮行：自动换行 */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, flexWrap: 'wrap' }}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(plugin)} style={{ flex: 1 }}>编辑</Button>
                    {plugin.status === 'approved' && (
                      <>
                        <Button size="small" style={{ color: '#f59e0b', borderColor: '#f59e0b', flex: 1 }} onClick={() => handleStatusChange(plugin, 'coming_soon')}>即将上线</Button>
                        <Button size="small" style={{ flex: 1 }} onClick={() => handleStatusChange(plugin, 'offline')}>下架</Button>
                      </>
                    )}
                    {plugin.status === 'coming_soon' && (
                      <>
                        <Button size="small" style={{ color: '#22c55e', borderColor: '#22c55e', flex: 1 }} onClick={() => handleStatusChange(plugin, 'approved')}>上架</Button>
                        <Button size="small" style={{ flex: 1 }} onClick={() => handleStatusChange(plugin, 'offline')}>下架</Button>
                      </>
                    )}
                    {plugin.status === 'offline' && (
                      <>
                        <Button size="small" style={{ color: '#22c55e', borderColor: '#22c55e', flex: 1 }} onClick={() => handleStatusChange(plugin, 'approved')}>上架</Button>
                        <Button size="small" style={{ color: '#f59e0b', borderColor: '#f59e0b', flex: 1 }} onClick={() => handleStatusChange(plugin, 'coming_soon')}>即将上线</Button>
                      </>
                    )}
                    {!['approved', 'coming_soon', 'offline'].includes(plugin.status) && (
                      <>
                        <Button size="small" style={{ color: '#22c55e', borderColor: '#22c55e', flex: 1 }} onClick={() => handleStatusChange(plugin, 'approved')}>上架</Button>
                        <Button size="small" style={{ color: '#f59e0b', borderColor: '#f59e0b', flex: 1 }} onClick={() => handleStatusChange(plugin, 'coming_soon')}>即将上线</Button>
                        <Button size="small" style={{ flex: 1 }} onClick={() => handleStatusChange(plugin, 'offline')}>下架</Button>
                      </>
                    )}
                    <Popconfirm title="确定删除?" onConfirm={() => handleDelete(plugin.id)} okText="确定" cancelText="取消">
                      <Button size="small" danger icon={<DeleteOutlined />} style={{ flex: 1 }}>删除</Button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}

            {/* 分页 */}
            {plugins.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <span style={{ padding: '0 12px', lineHeight: '32px', color: '#64748b' }}>{page} / {Math.ceil(total / 20) || 1}</span>
                <Button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            )}

            {plugins.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无数据</div>
            )}
          </div>
        ) : (
          /* 5. 桌面端表格 */
          <Table
            columns={columns}
            dataSource={plugins}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      {/* 编辑/创建弹窗 */}
      <Modal
        title={editingPlugin ? '编辑插件' : '添加插件'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="name"
            label="插件名称"
            rules={[{ required: true, message: '请输入插件名称' }]}
          >
            <Input placeholder="输入插件名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="插件描述"
          >
            <Input.TextArea rows={3} placeholder="输入插件描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
              >
                <Select placeholder="选择分类" options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="version"
                label="版本号"
              >
                <Input placeholder="例如: 1.0.0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="插件图标">
            {fileList.length > 0 && iconUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Image
                  src={iconUrl}
                  alt="插件图标"
                  width={80}
                  height={80}
                  style={{ borderRadius: 8, objectFit: 'cover', border: '1px solid #d9d9d9' }}
                />
                <Button danger onClick={() => { setIconUrl(''); setFileList([]); }}>
                  删除图标
                </Button>
              </div>
            ) : (
              <Dragger {...uploadProps} style={{ padding: '20px 0' }}>
                <p className="ant-upload-drag-icon">
                  {uploading ? <LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} /> : <InboxOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                </p>
                <p className="ant-upload-text">{uploading ? '上传中...' : '点击或拖拽图片到此区域上传'}</p>
                <p className="ant-upload-hint" style={{ color: '#999' }}>
                  支持 JPG、PNG、GIF、WebP 格式，大小不超过 5MB
                </p>
              </Dragger>
            )}
          </Form.Item>

          <Form.Item
            name="feishu_link"
            label="详情链接"
          >
            <Input placeholder="输入插件详情页面链接（如飞书文档链接）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_free"
                label="是否免费"
                valuePropName="checked"
              >
                <Switch checkedChildren="免费" unCheckedChildren="付费" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
              >
                <Select
                  options={[
                    { value: 'approved', label: '已上架' },
                    { value: 'coming_soon', label: '即将上线' },
                    { value: 'offline', label: '已下架' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Plugins;
