import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PromptCategoryAttributes {
  id: number;
  key: string;           // 分类标识，如 'content', 'design'
  name: string;          // 分类名称，如 '内容创作', '设计创意'
  icon: string | null;   // 图标
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PromptCategoryCreationAttributes extends Optional<PromptCategoryAttributes,
  'id' | 'icon' | 'description' | 'sort_order' | 'is_active' | 'created_at' | 'updated_at'> {}

class PromptCategory extends Model<PromptCategoryAttributes, PromptCategoryCreationAttributes>
  implements PromptCategoryAttributes {
  public id!: number;
  public key!: string;
  public name!: string;
  public icon!: string | null;
  public description!: string | null;
  public sort_order!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PromptCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '分类标识',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '分类名称',
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '图标',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '分类描述',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'prompt_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PromptCategory;
