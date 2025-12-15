import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// AppDownload attributes interface
export interface AppDownloadAttributes {
  id: number;
  app_key: string;  // 应用唯一标识，如 'jianying_helper'
  app_name: string;  // 应用名称
  description: string | null;
  windows_url: string | null;
  mac_url: string | null;
  windows_version: string | null;
  mac_version: string | null;
  icon_url: string | null;
  features: object | null;  // 功能特性列表
  is_active: boolean;
  download_count: number;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface AppDownloadCreationAttributes extends Optional<AppDownloadAttributes,
  'id' | 'description' | 'windows_url' | 'mac_url' | 'windows_version' |
  'mac_version' | 'icon_url' | 'features' | 'is_active' | 'download_count' |
  'created_at' | 'updated_at'> {}

// AppDownload model class
class AppDownload extends Model<AppDownloadAttributes, AppDownloadCreationAttributes> implements AppDownloadAttributes {
  public id!: number;
  public app_key!: string;
  public app_name!: string;
  public description!: string | null;
  public windows_url!: string | null;
  public mac_url!: string | null;
  public windows_version!: string | null;
  public mac_version!: string | null;
  public icon_url!: string | null;
  public features!: object | null;
  public is_active!: boolean;
  public download_count!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
AppDownload.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    app_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '应用唯一标识'
    },
    app_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '应用名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '应用描述'
    },
    windows_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Windows下载链接'
    },
    mac_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Mac下载链接'
    },
    windows_version: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Windows版本号'
    },
    mac_version: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Mac版本号'
    },
    icon_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '应用图标URL'
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '功能特性列表'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '下载次数'
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
    tableName: 'app_downloads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['app_key'] },
      { fields: ['is_active'] }
    ]
  }
);

export default AppDownload;
