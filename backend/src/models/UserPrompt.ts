import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 用户已购买/已拥有的提示词
export interface UserPromptAttributes {
  id: number;
  user_id: number;
  prompt_id: number;
  purchase_type: 'paid' | 'member_free'; // 购买方式：付费购买 或 会员免费获取
  price_paid: number; // 实际支付金额
  created_at: Date;
}

interface UserPromptCreationAttributes extends Optional<UserPromptAttributes,
  'id' | 'price_paid' | 'created_at'> {}

class UserPrompt extends Model<UserPromptAttributes, UserPromptCreationAttributes> implements UserPromptAttributes {
  public id!: number;
  public user_id!: number;
  public prompt_id!: number;
  public purchase_type!: 'paid' | 'member_free';
  public price_paid!: number;
  public readonly created_at!: Date;
}

UserPrompt.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '用户ID'
    },
    prompt_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '提示词ID'
    },
    purchase_type: {
      type: DataTypes.ENUM('paid', 'member_free'),
      allowNull: false,
      comment: '获取方式：paid-付费购买, member_free-会员免费'
    },
    price_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '实际支付金额'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'user_prompts',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['prompt_id'] },
      { unique: true, fields: ['user_id', 'prompt_id'] } // 一个用户对一个提示词只能有一条记录
    ]
  }
);

export default UserPrompt;
