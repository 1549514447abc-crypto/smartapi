import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Prompt attributes interface
export interface PromptAttributes {
  id: number;
  title: string;
  description: string;
  content: string; // 提示词内容
  category: string; // 分类
  tags: string[] | null; // 标签
  price: number; // 价格，默认9.9
  cover_url: string | null; // 封面图
  author: string | null; // 作者
  usage_count: number; // 使用次数
  purchase_count: number; // 购买次数
  is_active: boolean; // 是否上架
  sort_order: number; // 排序
  created_at: Date;
  updated_at: Date;
}

interface PromptCreationAttributes extends Optional<PromptAttributes,
  'id' | 'tags' | 'price' | 'cover_url' | 'author' | 'usage_count' |
  'purchase_count' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'> {}

class Prompt extends Model<PromptAttributes, PromptCreationAttributes> implements PromptAttributes {
  public id!: number;
  public title!: string;
  public description!: string;
  public content!: string;
  public category!: string;
  public tags!: string[] | null;
  public price!: number;
  public cover_url!: string | null;
  public author!: string | null;
  public usage_count!: number;
  public purchase_count!: number;
  public is_active!: boolean;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Prompt.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '提示词ID'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '提示词标题'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '提示词简介'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '提示词内容'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分类'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '标签'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 9.9,
      comment: '价格'
    },
    cover_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '封面图URL'
    },
    author: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '作者'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '使用次数'
    },
    purchase_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '购买次数'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否上架'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重'
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
    tableName: 'prompts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['sort_order'] }
    ]
  }
);

export default Prompt;
