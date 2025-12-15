import { Card, Form, Input, Button, message, Tabs, Switch, InputNumber } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const Settings = () => {
  const [form] = Form.useForm();

  const handleSave = async (values: any) => {
    console.log('Settings:', values);
    message.success('设置已保存');
  };

  const items = [
    {
      key: 'basic',
      label: '基础设置',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            siteName: 'SmartAPI',
            siteDescription: 'AI工具平台',
            allowRegister: true,
            defaultBalance: 0,
          }}
        >
          <Form.Item label="站点名称" name="siteName">
            <Input placeholder="请输入站点名称" />
          </Form.Item>
          <Form.Item label="站点描述" name="siteDescription">
            <Input.TextArea rows={3} placeholder="请输入站点描述" />
          </Form.Item>
          <Form.Item label="允许注册" name="allowRegister" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="新用户默认余额" name="defaultBalance">
            <InputNumber min={0} precision={2} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'api',
      label: 'API配置',
      children: (
        <div className="text-gray-500">
          API配置功能开发中...
        </div>
      ),
    },
    {
      key: 'payment',
      label: '支付设置',
      children: (
        <div className="text-gray-500">
          支付设置功能开发中...
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">系统设置</h2>
        <p className="text-gray-500 mt-1">管理系统配置和参数</p>
      </div>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
};

export default Settings;
