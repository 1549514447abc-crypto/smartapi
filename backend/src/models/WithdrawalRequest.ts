import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// 提现申请属性接口
export interface WithdrawalRequestAttributes {
  id: number;
  user_id: number;
  amount: number; // 申请提现总金额
  openid: string; // 收款微信OpenID
  status: 'pending' | 'approved' | 'processing' | 'success' | 'partial' | 'failed' | 'rejected';
  reviewed_by: number | null; // 审核人（管理员ID）
  reviewed_at: Date | null; // 审核时间
  reject_reason: string | null; // 拒绝原因
  success_amount: number; // 成功转账金额
  fail_amount: number; // 失败转账金额
  transfer_count: number; // 转账笔数
  success_count: number; // 成功笔数
  remark: string | null; // 备注
  created_at: Date;
  updated_at: Date;
}

// 创建时可选的属性
interface WithdrawalRequestCreationAttributes extends Optional<WithdrawalRequestAttributes,
  'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'reject_reason' |
  'success_amount' | 'fail_amount' | 'transfer_count' | 'success_count' |
  'remark' | 'created_at' | 'updated_at'> {}

// 提现申请模型类
class WithdrawalRequest extends Model<WithdrawalRequestAttributes, WithdrawalRequestCreationAttributes> implements WithdrawalRequestAttributes {
  public id!: number;
  public user_id!: number;
  public amount!: number;
  public openid!: string;
  public status!: 'pending' | 'approved' | 'processing' | 'success' | 'partial' | 'failed' | 'rejected';
  public reviewed_by!: number | null;
  public reviewed_at!: Date | null;
  public reject_reason!: string | null;
  public success_amount!: number;
  public fail_amount!: number;
  public transfer_count!: number;
  public success_count!: number;
  public remark!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 虚拟字段
  public readonly user?: User;
  public readonly reviewer?: User;
}

// 初始化模型
WithdrawalRequest.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '申请用户ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '申请提现总金额'
    },
    openid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '收款微信OpenID'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'processing', 'success', 'partial', 'failed', 'rejected'),
      defaultValue: 'pending',
      comment: '状态：pending-待审核, approved-已审核, processing-转账中, success-成功, partial-部分成功, failed-失败, rejected-已拒绝'
    },
    reviewed_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '审核人（管理员ID）'
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '审核时间'
    },
    reject_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '拒绝原因'
    },
    success_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '成功转账金额'
    },
    fail_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '失败转账金额'
    },
    transfer_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '转账笔数'
    },
    success_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '成功笔数'
    },
    remark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '备注'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '申请时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  },
  {
    sequelize,
    tableName: 'withdrawal_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  }
);

// 定义关联
WithdrawalRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

WithdrawalRequest.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer'
});

// WithdrawalTransfer 关联在 models/index.ts 中配置，避免循环依赖

export default WithdrawalRequest;
