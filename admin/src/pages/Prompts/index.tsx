import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
  Tabs,
  Upload,
  Card,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import api from '../../api/request';

const { TextArea } = Input;

interface Prompt {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[] | null;
  price: number;
  author: string | null;
  usage_count: number;
  purchase_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Category {
  id: number;
  key: string;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const Prompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  useEffect(() => {
    fetchPrompts();
    fetchCategories();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/prompts/admin/list', {
        params: { page: 1, pageSize: 100 },
      });
      if (response.success) {
        setPrompts(response.data.list);
      }
    } catch (error) {
      message.error('获取提示词列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response: any = await api.get('/prompts/admin/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const handleAdd = () => {
    setEditingPrompt(null);
    form.resetFields();
    form.setFieldsValue({
      price: 9.9,
      is_active: true,
      sort_order: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Prompt) => {
    setEditingPrompt(record);
    form.setFieldsValue({
      ...record,
      tags: record.tags?.join(',') || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response: any = await api.delete(`/prompts/admin/${id}`);
      if (response.success) {
        message.success('删除成功');
        fetchPrompts();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        id: editingPrompt?.id,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
      };

      const response: any = await api.post('/prompts/admin/upsert', data);
      if (response.success) {
        message.success(editingPrompt ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchPrompts();
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 分类管理
  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ sort_order: 0, is_active: true });
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (record: Category) => {
    setEditingCategory(record);
    categoryForm.setFieldsValue(record);
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const response: any = await api.delete(`/prompts/admin/categories/${id}`);
      if (response.success) {
        message.success('删除成功');
        fetchCategories();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      const data = { ...values, id: editingCategory?.id };

      const response: any = await api.post('/prompts/admin/categories/upsert', data);
      if (response.success) {
        message.success(editingCategory ? '更新成功' : '创建成功');
        setCategoryModalVisible(false);
        fetchCategories();
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 批量导入
  const handleImport = async () => {
    if (!importContent.trim()) {
      message.warning('请输入导入内容');
      return;
    }

    try {
      setImporting(true);
      const response: any = await api.post('/prompts/admin/batch-import', {
        content: importContent,
      });
      if (response.success) {
        message.success(response.message);
        setImportModalVisible(false);
        setImportContent('');
        fetchPrompts();
        if (response.data.errors?.length > 0) {
          Modal.warning({
            title: '部分导入失败',
            content: (
              <div className="max-h-60 overflow-auto">
                {response.data.errors.map((err: string, i: number) => (
                  <div key={i} className="text-red-500">{err}</div>
                ))}
              </div>
            ),
          });
        }
      }
    } catch (error) {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportContent(text);
    };
    reader.readAsText(file, 'UTF-8');
    return false;
  };

  const getCategoryName = (key: string) => {
    const cat = categories.find(c => c.key === key);
    return cat?.name || key;
  };

  const promptColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color="blue">{getCategoryName(category)}</Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 80,
      render: (price: number) => <span className="text-orange-500 font-medium">¥{price}</span>,
    },
    { title: '使用', dataIndex: 'usage_count', width: 70 },
    { title: '购买', dataIndex: 'purchase_count', width: 70 },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '上架' : '下架'}</Tag>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: Prompt) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标识', dataIndex: 'key', width: 100 },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: Category) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteCategory(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryOptions = categories
    .filter(c => c.is_active)
    .map(c => ({ value: c.key, label: c.name }));

  // 响应式：始终使用卡片视图
  const [isMobile, setIsMobile] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1800);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 过滤提示词
  const filteredPrompts = prompts.filter(p =>
    !keyword || p.title.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', margin: 0 }}>提示词管理</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>管理提示词库内容</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchPrompts}>刷新</Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>批量导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加提示词</Button>
        </div>
      </div>

      <Tabs
        defaultActiveKey="prompts"
        items={[
          {
            key: 'prompts',
            label: '提示词列表',
            children: (
              <Card bordered={false} styles={{ body: { padding: isMobile ? 12 : 24 } }}>
                {/* 搜索栏 */}
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={16} md={12} lg={8}>
                    <Input
                      placeholder="搜索提示词..."
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                ) : isMobile ? (
                  /* 卡片视图 */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredPrompts.map((prompt) => (
                      <div key={prompt.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {prompt.title}
                            </h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {prompt.description}
                            </p>
                          </div>
                          <Tag color={prompt.is_active ? 'green' : 'red'} style={{ flexShrink: 0 }}>
                            {prompt.is_active ? '上架' : '下架'}
                          </Tag>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <Tag color="blue">{getCategoryName(prompt.category)}</Tag>
                          <span style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>¥{prompt.price}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>使用:{prompt.usage_count}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>购买:{prompt.purchase_count}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, flexWrap: 'wrap' }}>
                          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(prompt)} style={{ flex: 1 }}>编辑</Button>
                          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(prompt.id)} okText="确定" cancelText="取消">
                            <Button size="small" danger icon={<DeleteOutlined />} style={{ flex: 1 }}>删除</Button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                    {filteredPrompts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无数据</div>
                    )}
                  </div>
                ) : (
                  <Table
                    columns={promptColumns}
                    dataSource={filteredPrompts}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1000 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'categories',
            label: '分类管理',
            icon: <SettingOutlined />,
            children: (
              <Card bordered={false} styles={{ body: { padding: isMobile ? 12 : 24 } }}>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
                    添加分类
                  </Button>
                </div>

                {isMobile ? (
                  /* 分类卡片视图 */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {categories.map((cat) => (
                      <div key={cat.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>
                              {cat.icon} {cat.name}
                            </h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                              {cat.key} · 排序: {cat.sort_order}
                            </p>
                          </div>
                          <Tag color={cat.is_active ? 'green' : 'red'} style={{ flexShrink: 0 }}>
                            {cat.is_active ? '启用' : '禁用'}
                          </Tag>
                        </div>
                        {cat.description && (
                          <p style={{ margin: '8px 0', color: '#64748b', fontSize: 12 }}>{cat.description}</p>
                        )}
                        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, flexWrap: 'wrap' }}>
                          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(cat)} style={{ flex: 1 }}>编辑</Button>
                          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteCategory(cat.id)} okText="确定" cancelText="取消">
                            <Button size="small" danger icon={<DeleteOutlined />} style={{ flex: 1 }}>删除</Button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table
                    columns={categoryColumns}
                    dataSource={categories}
                    rowKey="id"
                    pagination={false}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* 提示词编辑弹窗 */}
      <Modal
        title={editingPrompt ? '编辑提示词' : '添加提示词'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="提示词标题" />
          </Form.Item>
          <Form.Item name="description" label="简介" rules={[{ required: true, message: '请输入简介' }]}>
            <TextArea rows={2} placeholder="提示词简介" />
          </Form.Item>
          <Form.Item name="content" label="提示词内容" rules={[{ required: true, message: '请输入提示词内容' }]}>
            <TextArea rows={8} placeholder="完整的提示词内容" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
              <Select options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Input placeholder="多个标签用逗号分隔" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="price" label="价格">
              <InputNumber min={0} step={0.1} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="author" label="作者">
              <Input placeholder="作者名称" />
            </Form.Item>
            <Form.Item name="sort_order" label="排序权重">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="is_active" label="上架状态" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分类编辑弹窗 */}
      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={categoryModalVisible}
        onOk={handleCategorySubmit}
        onCancel={() => setCategoryModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={categoryForm} layout="vertical" className="mt-4">
          <Form.Item name="key" label="分类标识" rules={[{ required: true, message: '请输入分类标识' }]}
            extra="英文标识，如：content, design">
            <Input placeholder="英文标识" disabled={!!editingCategory} />
          </Form.Item>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="分类名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="分类描述" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序权重">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入提示词"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => setImportModalVisible(false)}
        width={800}
        okText="开始导入"
        cancelText="取消"
        confirmLoading={importing}
      >
        <div className="mb-4">
          <Upload
            accept=".txt"
            showUploadList={false}
            beforeUpload={handleFileUpload}
          >
            <Button icon={<UploadOutlined />}>选择 TXT 文件</Button>
          </Upload>
        </div>
        <div className="mb-2 text-gray-500 text-sm">
          <div className="font-medium mb-1">格式说明：</div>
          <div>每个提示词用 <code className="bg-gray-100 px-1">=== </code> 分隔，每个提示词包含以下字段：</div>
          <pre className="bg-gray-50 p-2 mt-2 rounded text-xs">
{`【标题】提示词标题
【分类】content
【简介】这是一段简介
【标签】标签1,标签2
【价格】9.9
【内容】
这里是提示词的完整内容
可以多行

===

【标题】第二个提示词
【分类】design
【简介】简介内容
【内容】
第二个提示词的内容`}
          </pre>
        </div>
        <TextArea
          rows={12}
          value={importContent}
          onChange={(e) => setImportContent(e.target.value)}
          placeholder="粘贴或上传 TXT 文件内容..."
        />
      </Modal>
    </div>
  );
};

export default Prompts;
