import { Card, Empty } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const Plugins = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">插件管理</h2>

      <Card bordered={false}>
        <Empty
          image={<AppstoreOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description={
            <span className="text-gray-500">
              插件管理功能开发中，敬请期待
            </span>
          }
        />
      </Card>
    </div>
  );
};

export default Plugins;
