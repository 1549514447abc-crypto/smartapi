import { Card, Empty } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';

const Workflows = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">工作流管理</h2>

      <Card bordered={false}>
        <Empty
          image={<BranchesOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description={
            <span className="text-gray-500">
              工作流管理功能开发中，敬请期待
            </span>
          }
        />
      </Card>
    </div>
  );
};

export default Workflows;
