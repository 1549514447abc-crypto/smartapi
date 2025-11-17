import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// UserReferral attributes interface
export interface UserReferralAttributes {
  id: number;
  referrer_id: number; // 推广人ID
  referee_id: number; // 被推广人ID
  referral_code: string; // 推广码
  status: 'pending' | 'active' | 'inactive'; // 状态
  first_purchase_at: Date | null; // 首次消费时间
  total_contribution: number; // 总贡献金额
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface UserReferralCreationAttributes extends Optional<UserReferralAttributes,
  'id' | 'status' | 'first_purchase_at' | 'total_contribution' | 'created_at' | 'updated_at'> {}

// UserReferral model class
class UserReferral extends Model<UserReferralAttributes, UserReferralCreationAttributes> implements UserReferralAttributes {
  public id!: number;
  public referrer_id!: number;
  public referee_id!: number;
  public referral_code!: string;
  public status!: 'pending' | 'active' | 'inactive';
  public first_purchase_at!: Date | null;
  public total_contribution!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual fields
  public readonly referrer?: User;
  public readonly referee?: User;
}

// Initialize model
UserReferral.init(
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
    referral_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '推广码'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'inactive'),
      defaultValue: 'pending',
      comment: '状态：pending-待激活, active-活跃, inactive-不活跃'
    },
    first_purchase_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '首次消费时间'
    },
    total_contribution: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      comment: '总贡献金额'
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
    tableName: 'user_referrals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['referrer_id'] },
      { fields: ['referee_id'] },
      { fields: ['referral_code'] },
      { fields: ['status'] }
    ]
  }
);

// Define associations
UserReferral.belongsTo(User, {
  foreignKey: 'referrer_id',
  as: 'referrer'
});

UserReferral.belongsTo(User, {
  foreignKey: 'referee_id',
  as: 'referee'
});

export default UserReferral;
