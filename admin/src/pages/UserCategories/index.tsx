import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

interface UserCategory {
  id: number;
  category_key: string;
  category_name: string;
  default_course_rate: number;
  default_membership_rate: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const UserCategories = () => {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('/api/admin/user-categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCategories(response.data.data.categories);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      default_course_rate: 10,
      default_membership_rate: 10,
      is_active: true,
      sort_order: 999
    });
    setModalVisible(true);
  };

  const handleEdit = (category: UserCategory) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.delete(`/api/admin/user-categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        message.success('删除成功');
        fetchCategories();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('admin_token');

      if (editingCategory) {
        // 更新
        const response = await axios.put(
          `/api/admin/user-categories/${editingCategory.id}`,
          values,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          message.success('更新成功');
          setModalVisible(false);
          fetchCategories();
        }
      } else {
        // 创建
        const response = await axios.post(
          '/api/admin/user-categories',
          values,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          message.success('创建成功');
          setModalVisible(false);
          fetchCategories();
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80
    },
    {
      title: '分类标识',
      dataIndex: 'category_key',
      key: 'category_key',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '分类名称',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '课程佣金',
      dataIndex: 'default_course_rate',
      key: 'default_course_rate',
      render: (rate: number) => <Tag color="green">{rate}%</Tag>
    },
    {
      title: '会员佣金',
      dataIndex: 'default_membership_rate',
      key: 'default_membership_rate',
      render: (rate: number) => <Tag color="orange">{rate}%</Tag>
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: UserCategory) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.category_key !== 'normal' && (
            <Popconfirm
              title="确定删除此分类？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>分佣设置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增分类
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          {!editingCategory && (
            <Form.Item
              label="分类标识"
              name="category_key"
              rules={[{ required: true, message: '请输入分类标识' }]}
              extra="英文标识，如：blogger、vip、platinum"
            >
              <Input placeholder="例如：blogger" />
            </Form.Item>
          )}

          <Form.Item
            label="分类名称"
            name="category_name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：博主" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              label="课程佣金比例(%)"
              name="default_course_rate"
              rules={[{ required: true, message: '请输入课程佣金比例' }]}
            >
              <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="会员佣金比例(%)"
              name="default_membership_rate"
              rules={[{ required: true, message: '请输入会员佣金比例' }]}
            >
              <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            label="描述说明"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="简单描述这个分类的用途" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              label="排序"
              name="sort_order"
              extra="数字越小越靠前"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="是否启用"
              name="is_active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserCategories;
