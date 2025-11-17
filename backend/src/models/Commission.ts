import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import UserReferral from './UserReferral';

// Commission attributes interface
export interface CommissionAttributes {
  id: number;
  referrer_id: number; // 推广人ID
  referee_id: number; // 被推广人ID
  referral_id: number; // 推广关系ID
  amount: number; // 佣金金额
  commission_rate: number; // 佣金比例
  source_amount: number; // 来源金额（充值或消费）
  source_type: 'recharge' | 'consume'; // 来源类型
  source_id: number | null; // 来源记录ID
  status: 'pending' | 'settled' | 'cancelled'; // 状态
  settled_at: Date | null; // 结算时间
  notes: string | null; // 备注
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface CommissionCreationAttributes extends Optional<CommissionAttributes,
  'id' | 'source_id' | 'status' | 'settled_at' | 'notes' | 'created_at' | 'updated_at'> {}

// Commission model class
class Commission extends Model<CommissionAttributes, CommissionCreationAttributes> implements CommissionAttributes {
  public id!: number;
  public referrer_id!: number;
  public referee_id!: number;
  public referral_id!: number;
  public amount!: number;
  public commission_rate!: number;
  public source_amount!: number;
  public source_type!: 'recharge' | 'consume';
  public source_id!: number | null;
  public status!: 'pending' | 'settled' | 'cancelled';
  public settled_at!: Date | null;
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual fields
  public readonly referrer?: User;
  public readonly referee?: User;
  public readonly referral?: UserReferral;
}

// Initialize model
Commission.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    referrer_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '推广人ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    referee_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '被推广人ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    referral_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '推广关系ID',
      references: {
        model: 'user_referrals',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      comment: '佣金金额'
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: '佣金比例(%)'
    },
    source_amount: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      comment: '来源金额'
    },
    source_type: {
      type: DataTypes.ENUM('recharge', 'consume'),
      allowNull: false,
      comment: '来源类型：recharge-充值, consume-消费'
    },
    source_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '来源记录ID'
    },
    status: {
      type: DataTypes.ENUM('pending', 'settled', 'cancelled'),
      defaultValue: 'settled',
      comment: '状态：pending-待结算, settled-已结算, cancelled-已取消'
    },
    settled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '结算时间'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'commissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['referrer_id'] },
      { fields: ['referee_id'] },
      { fields: ['referral_id'] },
      { fields: ['status'] },
      { fields: ['source_type'] }
    ]
  }
);

// Define associations
Commission.belongsTo(User, {
  foreignKey: 'referrer_id',
  as: 'referrer'
});

Commission.belongsTo(User, {
  foreignKey: 'referee_id',
  as: 'referee'
});

Commission.belongsTo(UserReferral, {
  foreignKey: 'referral_id',
  as: 'referral'
});

export default Commission;
