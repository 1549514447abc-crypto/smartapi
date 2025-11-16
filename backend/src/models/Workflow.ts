import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// Workflow attributes interface
export interface WorkflowAttributes {
  id: number;
  creator_id: number | null;
  name: string;
  description: string | null;
  category: string | null;
  platform: string | null; // coze, make, n8n, comfyui
  cover_url: string | null;
  workflow_config: object | null;
  price: number; // 价格（0表示免费）
  is_svip_free: boolean; // SVIP是否免费
  view_count: number;
  use_count: number;
  rating: number;
  is_public: boolean;
  is_official: boolean;
  status: 'published' | 'draft' | 'offline';
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface WorkflowCreationAttributes extends Optional<WorkflowAttributes,
  'id' | 'creator_id' | 'description' | 'category' | 'platform' | 'cover_url' |
  'workflow_config' | 'price' | 'is_svip_free' | 'view_count' | 'use_count' |
  'rating' | 'is_public' | 'is_official' | 'status' | 'created_at' | 'updated_at'> {}

// Workflow model class
class Workflow extends Model<WorkflowAttributes, WorkflowCreationAttributes> implements WorkflowAttributes {
  public id!: number;
  public creator_id!: number | null;
  public name!: string;
  public description!: string | null;
  public category!: string | null;
  public platform!: string | null;
  public cover_url!: string | null;
  public workflow_config!: object | null;
  public price!: number;
  public is_svip_free!: boolean;
  public view_count!: number;
  public use_count!: number;
  public rating!: number;
  public is_public!: boolean;
  public is_official!: boolean;
  public status!: 'published' | 'draft' | 'offline';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual field for creator info
  public readonly creator?: User;
}

// Initialize model
Workflow.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    creator_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '创建者ID'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '工作流名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '描述'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '分类：video/scraping/image/content/automation/social/analysis'
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '平台：coze/make/n8n/comfyui'
    },
    cover_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '封面图'
    },
    workflow_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '工作流节点配置'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '价格（0表示免费）'
    },
    is_svip_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'SVIP是否免费'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '浏览次数'
    },
    use_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '使用次数'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      comment: '评分'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否公开'
    },
    is_official: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否官方'
    },
    status: {
      type: DataTypes.ENUM('published', 'draft', 'offline'),
      defaultValue: 'published',
      comment: '状态'
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
    tableName: 'workflows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['category'] },
      { fields: ['platform'] },
      { fields: ['status'] },
      { fields: ['is_public'] },
      { fields: ['view_count'] },
      { fields: ['use_count'] }
    ]
  }
);

// Define associations
Workflow.belongsTo(User, {
  foreignKey: 'creator_id',
  as: 'creator'
});

export default Workflow;
