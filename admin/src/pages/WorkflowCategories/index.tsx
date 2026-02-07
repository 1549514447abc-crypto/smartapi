import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Switch, message, Popconfirm, InputNumber, Radio, Upload, Image } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import api from '../../api/request';

const { Dragger } = Upload;

interface WorkflowCategory {
  id: number;
  category_key: string;
  category_name: string;
  icon: string;
  description: string | null;
  workflow_count: number;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = '';

const WorkflowCategories = () => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkflowCategory | null>(null);
  const [form] = Form.useForm();

  // 图标类型和上传相关
  const [iconType, setIconType] = useState<'emoji' | 'image'>('emoji');
  const [iconUrl, setIconUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflow-config/categories');
      if ((res as any).success) {
        setCategories((res as any).data);
      }
    } catch (error) {
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, sort_order: 0 });
    setIconType('emoji');
    setIconUrl('');
    setFileList([]);
    setModalVisible(true);
  };

  const handleEdit = (category: WorkflowCategory) => {
    setEditingCategory(category);

    // 判断图标是emoji还是图片URL
    const isImageUrl = category.icon.startsWith('http://') || category.icon.startsWith('https://') || category.icon.startsWith('/');
    setIconType(isImageUrl ? 'image' : 'emoji');

    if (isImageUrl) {
      setIconUrl(category.icon);
      setFileList([]);
    } else {
      setIconUrl('');
      setFileList([]);
    }

    form.setFieldsValue({
      ...category,
      is_active: category.is_active === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/workflow-config/categories/${id}`);
      message.success('删除成功');
      fetchCategories();
    } catch (error) {
      message.error('删除失败');
    }
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
      formData.append('file', file);

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
          form.setFieldsValue({ icon: result.data.url });
          message.success('图标上传成功');
          onSuccess?.(result);
        } else {
          message.error(result.error || '上传失败');
          onError?.(new Error(result.error || '上传失败'));
        }
      } catch (error: any) {
        message.error('上传失败: ' + error.message);
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 如果是图片类型但没有上传，提示错误
      if (iconType === 'image' && !iconUrl) {
        message.error('请上传图标图片');
        return;
      }

      const data = {
        ...values,
        icon: iconType === 'image' ? iconUrl : values.icon,
        is_active: values.is_active ? 1 : 0,
      };

      if (editingCategory) {
        await api.put(`/workflow-config/categories/${editingCategory.id}`, data);
        message.success('更新成功');
      } else {
        await api.post('/workflow-config/categories', data);
        message.success('创建成功');
      }

      setModalVisible(false);
      fetchCategories();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '分类标识',
      dataIndex: 'category_key',
      width: 150,
    },
    {
      title: '分类名称',
      dataIndex: 'category_name',
      width: 150,
      render: (text: string, record: WorkflowCategory) => (
        <span>
          {record.icon} {text}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '工作流数量',
      dataIndex: 'workflow_count',
      width: 120,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (val: number) => (
        <span className={val === 1 ? 'text-green-600' : 'text-gray-400'}>
          {val === 1 ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: WorkflowCategory) => (
        <div className="flex gap-2">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定要删除这个分类吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">工作流分类管理</h2>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加分类
          </Button>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分类标识"
            name="category_key"
            rules={[{ required: true, message: '请输入分类标识' }]}
            extra="英文小写，用下划线分隔，如：short_video"
          >
            <Input placeholder="如：short_video" disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item
            label="分类名称"
            name="category_name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="如：短视频" />
          </Form.Item>

          <Form.Item label="图标类型">
            <Radio.Group value={iconType} onChange={(e) => setIconType(e.target.value)}>
              <Radio value="emoji">Emoji 图标</Radio>
              <Radio value="image">图片上传</Radio>
            </Radio.Group>
          </Form.Item>

          {iconType === 'emoji' ? (
            <Form.Item
              label="Emoji 图标"
              name="icon"
              rules={[{ required: iconType === 'emoji', message: '请输入emoji图标' }]}
              extra="输入一个emoji图标，如：📱"
            >
              <Input placeholder="如：📱" style={{ fontSize: '24px' }} />
            </Form.Item>
          ) : (
            <Form.Item
              label="图标图片"
              required
              extra="支持 JPG、PNG、GIF、WebP 格式，建议尺寸 128x128px"
            >
              {iconUrl ? (
                <div>
                  <Image src={iconUrl} width={100} height={100} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        setIconUrl('');
                        setFileList([]);
                        form.setFieldsValue({ icon: '' });
                      }}
                    >
                      删除图标
                    </Button>
                  </div>
                </div>
              ) : (
                <Dragger {...uploadProps} style={{ padding: '20px 0' }}>
                  <p className="ant-upload-drag-icon">
                    {uploading ? (
                      <LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    ) : (
                      <InboxOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    )}
                  </p>
                  <p className="ant-upload-text">{uploading ? '上传中...' : '点击或拖拽图片到此区域上传'}</p>
                  <p className="ant-upload-hint" style={{ color: '#999' }}>
                    支持 JPG、PNG、GIF、WebP 格式
                  </p>
                </Dragger>
              )}
            </Form.Item>
          )}

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="分类描述（可选）" />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort_order"
            rules={[{ required: true, message: '请输入排序值' }]}
            extra="数字越小越靠前"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="状态" name="is_active" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowCategories;
