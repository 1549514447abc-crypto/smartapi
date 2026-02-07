import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import WithdrawalRequest from './WithdrawalRequest';

// 转账明细属性接口
export interface WithdrawalTransferAttributes {
  id: number;
  withdrawal_id: number; // 关联的提现申请ID
  transfer_no: number; // 第几笔（1,2,3...）
  amount: number; // 本笔转账金额（≤200）
  out_batch_no: string; // 商户批次单号
  out_detail_no: string; // 商户明细单号
  wechat_batch_id: string | null; // 微信批次单号
  wechat_detail_id: string | null; // 微信明细单号
  batch_status: string | null; // 批次状态（ACCEPTED, PROCESSING, FINISHED, CLOSED, WAIT_USER_CONFIRM）
  package_info: string | null; // 用于调起用户确认收款（新版本）
  status: 'pending' | 'processing' | 'success' | 'failed';
  fail_reason: string | null; // 失败原因
  transferred_at: Date | null; // 转账完成时间
  created_at: Date;
  updated_at: Date;
}

// 创建时可选的属性
interface WithdrawalTransferCreationAttributes extends Optional<WithdrawalTransferAttributes,
  'id' | 'wechat_batch_id' | 'wechat_detail_id' | 'batch_status' | 'package_info' |
  'status' | 'fail_reason' | 'transferred_at' | 'created_at' | 'updated_at'> {}

// 转账明细模型类
class WithdrawalTransfer extends Model<WithdrawalTransferAttributes, WithdrawalTransferCreationAttributes> implements WithdrawalTransferAttributes {
  public id!: number;
  public withdrawal_id!: number;
  public transfer_no!: number;
  public amount!: number;
  public out_batch_no!: string;
  public out_detail_no!: string;
  public wechat_batch_id!: string | null;
  public wechat_detail_id!: string | null;
  public batch_status!: string | null;
  public package_info!: string | null;
  public status!: 'pending' | 'processing' | 'success' | 'failed';
  public fail_reason!: string | null;
  public transferred_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 虚拟字段
  public readonly withdrawalRequest?: WithdrawalRequest;
}

// 初始化模型
WithdrawalTransfer.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键'
    },
    withdrawal_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '关联的提现申请ID',
      references: {
        model: 'withdrawal_requests',
        key: 'id'
      }
    },
    transfer_no: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '第几笔（1,2,3...）'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '本笔转账金额（≤200）'
    },
    out_batch_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '商户批次单号'
    },
    out_detail_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: '商户明细单号'
    },
    wechat_batch_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信批次单号'
    },
    wechat_detail_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信明细单号'
    },
    batch_status: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '批次状态（ACCEPTED, PROCESSING, FINISHED, CLOSED, WAIT_USER_CONFIRM）'
    },
    package_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用于调起用户确认收款（新版本）'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
      defaultValue: 'pending',
      comment: '状态：pending-待转账, processing-转账中, success-成功, failed-失败'
    },
    fail_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '失败原因'
    },
    transferred_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '转账完成时间'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
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
    tableName: 'withdrawal_transfers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['withdrawal_id'] },
      { fields: ['out_batch_no'] },
      { fields: ['status'] }
    ]
  }
);

// 定义关联
WithdrawalTransfer.belongsTo(WithdrawalRequest, {
  foreignKey: 'withdrawal_id',
  as: 'withdrawalRequest'
});

export default WithdrawalTransfer;
