import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// ApiCallLog attributes interface
export interface ApiCallLogAttributes {
  id: number;
  user_id: number | null;
  api_service: string | null;
  token_type: string | null;
  request_url: string | null;
  request_params: object | null;
  response_code: number | null;
  response_data: object | null;
  error_message: string | null;
  call_duration: number | null;
  created_at: Date;
}

// Attributes that are optional during creation
interface ApiCallLogCreationAttributes extends Optional<ApiCallLogAttributes,
  'id' | 'user_id' | 'api_service' | 'token_type' | 'request_url' |
  'request_params' | 'response_code' | 'response_data' | 'error_message' |
  'call_duration' | 'created_at'> {}

// ApiCallLog model class
class ApiCallLog extends Model<ApiCallLogAttributes, ApiCallLogCreationAttributes> implements ApiCallLogAttributes {
  public id!: number;
  public user_id!: number | null;
  public api_service!: string | null;
  public token_type!: string | null;
  public request_url!: string | null;
  public request_params!: object | null;
  public response_code!: number | null;
  public response_data!: object | null;
  public error_message!: string | null;
  public call_duration!: number | null;
  public readonly created_at!: Date;
}

// Initialize model
ApiCallLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '用户ID'
    },
    api_service: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '服务名称'
    },
    token_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Token类型(primary/backup)'
    },
    request_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: '请求URL'
    },
    request_params: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '请求参数'
    },
    response_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '响应状态码'
    },
    response_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '响应数据'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误信息'
    },
    call_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '调用耗时(ms)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'api_call_logs',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['api_service'] },
      { fields: ['token_type'] },
      { fields: ['created_at'] }
    ]
  }
);

// Define associations
ApiCallLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

export default ApiCallLog;
