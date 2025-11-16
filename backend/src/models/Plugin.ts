import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// Plugin attributes interface
export interface PluginAttributes {
  id: number;
  developer_id: number | null;
  name: string;
  description: string | null;
  category: string | null;
  icon_url: string | null;
  plugin_config: object | null;
  version: string;
  install_count: number;
  rating: number;
  review_count: number;
  is_free: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'offline';
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface PluginCreationAttributes extends Optional<PluginAttributes,
  'id' | 'developer_id' | 'description' | 'category' | 'icon_url' |
  'plugin_config' | 'version' | 'install_count' | 'rating' | 'review_count' |
  'is_free' | 'status' | 'created_at' | 'updated_at'> {}

// Plugin model class
class Plugin extends Model<PluginAttributes, PluginCreationAttributes> implements PluginAttributes {
  public id!: number;
  public developer_id!: number | null;
  public name!: string;
  public description!: string | null;
  public category!: string | null;
  public icon_url!: string | null;
  public plugin_config!: object | null;
  public version!: string;
  public install_count!: number;
  public rating!: number;
  public review_count!: number;
  public is_free!: boolean;
  public status!: 'approved' | 'pending' | 'rejected' | 'offline';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual field for developer info
  public readonly developer?: User;
}

// Initialize model
Plugin.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    developer_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '开发者ID'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '插件名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '插件描述'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '分类'
    },
    icon_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '图标URL'
    },
    plugin_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '插件配置'
    },
    version: {
      type: DataTypes.STRING(20),
      defaultValue: '1.0.0',
      comment: '版本号'
    },
    install_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '安装次数'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      comment: '评分'
    },
    review_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '评论数'
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否免费'
    },
    status: {
      type: DataTypes.ENUM('approved', 'pending', 'rejected', 'offline'),
      defaultValue: 'pending',
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
    tableName: 'plugins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['developer_id'] },
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['install_count'] }
    ]
  }
);

// Define associations
Plugin.belongsTo(User, {
  foreignKey: 'developer_id',
  as: 'developer'
});

export default Plugin;
