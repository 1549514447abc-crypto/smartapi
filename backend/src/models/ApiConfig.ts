import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// ApiConfig attributes interface
export interface ApiConfigAttributes {
  id: number;
  service_name: string;
  config_key: string;
  config_value: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface ApiConfigCreationAttributes extends Optional<ApiConfigAttributes,
  'id' | 'description' | 'is_active' | 'created_at' | 'updated_at'> {}

// ApiConfig model class
class ApiConfig extends Model<ApiConfigAttributes, ApiConfigCreationAttributes> implements ApiConfigAttributes {
  public id!: number;
  public service_name!: string;
  public config_key!: string;
  public config_value!: string;
  public description!: string | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
ApiConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '服务名称'
    },
    config_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '配置键'
    },
    config_value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '配置值'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '说明'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
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
    tableName: 'api_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['service_name', 'config_key']
      },
      { fields: ['service_name'] }
    ]
  }
);

export default ApiConfig;
