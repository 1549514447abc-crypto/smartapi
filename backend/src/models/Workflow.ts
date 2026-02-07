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

  // 下载相关
  download_url: string | null; // 压缩包下载链接
  file_size: string | null; // 文件大小 (如 "7.45KB")

  // 文档链接
  video_url: string | null; // 教学视频链接
  feishu_link: string | null; // 飞书文档链接
  related_links: object[] | null; // 相关链接数组 [{title, url, description}]

  // 插件说明
  requires_paid_plugin: boolean; // 是否需要付费插件
  plugin_note: string | null; // 插件说明

  // 教学图片
  images: { url: string; description: string }[] | null; // 教学图片数组 [{url, description}]

  // 统计
  view_count: number;
  use_count: number; // 下载次数
  rating: number;

  // 状态
  is_public: boolean;
  is_official: boolean;
  status: 'published' | 'draft' | 'offline';
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface WorkflowCreationAttributes extends Optional<WorkflowAttributes,
  'id' | 'creator_id' | 'description' | 'category' | 'platform' | 'cover_url' |
  'download_url' | 'file_size' | 'video_url' | 'feishu_link' | 'related_links' |
  'requires_paid_plugin' | 'plugin_note' | 'images' |
  'view_count' | 'use_count' | 'rating' | 'is_public' | 'is_official' |
  'status' | 'created_at' | 'updated_at'> {}

// Workflow model class
class Workflow extends Model<WorkflowAttributes, WorkflowCreationAttributes> implements WorkflowAttributes {
  public id!: number;
  public creator_id!: number | null;
  public name!: string;
  public description!: string | null;
  public category!: string | null;
  public platform!: string | null;
  public cover_url!: string | null;

  // 下载相关
  public download_url!: string | null;
  public file_size!: string | null;

  // 文档链接
  public video_url!: string | null;
  public feishu_link!: string | null;
  public related_links!: object[] | null;

  // 插件说明
  public requires_paid_plugin!: boolean;
  public plugin_note!: string | null;

  // 教学图片
  public images!: { url: string; description: string }[] | null;

  // 统计
  public view_count!: number;
  public use_count!: number;
  public rating!: number;

  // 状态
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
      comment: '分类：self_media/celebrity/tools/image_process/ecommerce/video/education/image_gen/novel'
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

    // 下载相关
    download_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '压缩包下载链接'
    },
    file_size: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '文件大小'
    },

    // 文档链接
    video_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '教学视频链接'
    },
    feishu_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '飞书文档链接'
    },
    related_links: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '相关链接数组 [{title, url, description}]'
    },

    // 插件说明
    requires_paid_plugin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否需要付费插件'
    },
    plugin_note: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '插件说明'
    },

    // 教学图片
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '教学图片数组 [{url, description}]'
    },

    // 统计
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '浏览次数'
    },
    use_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '下载次数'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      comment: '评分'
    },

    // 状态
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
