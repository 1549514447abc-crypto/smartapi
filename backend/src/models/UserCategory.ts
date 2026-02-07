import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// UserCategory attributes interface
export interface UserCategoryAttributes {
  id: number;
  category_key: string; // 分类标识（normal, blogger, vip等）
  category_name: string; // 分类名称（普通用户、博主、关系户等）
  default_course_rate: number; // 默认课程佣金比例 (%)
  default_membership_rate: number; // 默认会员佣金比例 (%)
  description: string | null; // 描述说明
  is_active: boolean; // 是否启用
  sort_order: number; // 排序
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface UserCategoryCreationAttributes extends Optional<UserCategoryAttributes,
  'id' | 'description' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'> {}

// UserCategory model class
class UserCategory extends Model<UserCategoryAttributes, UserCategoryCreationAttributes> implements UserCategoryAttributes {
  public id!: number;
  public category_key!: string;
  public category_name!: string;
  public default_course_rate!: number;
  public default_membership_rate!: number;
  public description!: string | null;
  public is_active!: boolean;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
UserCategory.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    category_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '分类标识（normal, blogger, vip等）'
    },
    category_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分类名称（普通用户、博主、关系户等）'
    },
    default_course_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      comment: '默认课程佣金比例(%)'
    },
    default_membership_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      comment: '默认会员佣金比例(%)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '描述说明'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序（数字越小越靠前）'
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
    tableName: 'user_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category_key'], unique: true },
      { fields: ['is_active'] },
      { fields: ['sort_order'] }
    ]
  }
);

export default UserCategory;
