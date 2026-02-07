import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 佣金配置属性接口
export interface CommissionSettingAttributes {
  id: number;
  config_key: string; // 配置键
  config_value: string; // 配置值
  description: string | null; // 说明
  created_at: Date;
  updated_at: Date;
}

// 创建时可选的属性
interface CommissionSettingCreationAttributes extends Optional<CommissionSettingAttributes,
  'id' | 'description' | 'created_at' | 'updated_at'> {}

// 佣金配置模型类
class CommissionSetting extends Model<CommissionSettingAttributes, CommissionSettingCreationAttributes> implements CommissionSettingAttributes {
  public id!: number;
  public config_key!: string;
  public config_value!: string;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 静态方法：获取配置值
  static async getValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await CommissionSetting.findOne({ where: { config_key: key } });
    return setting?.config_value || defaultValue;
  }

  // 静态方法：获取数值配置
  static async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await CommissionSetting.getValue(key, String(defaultValue));
    return parseFloat(value) || defaultValue;
  }

  // 静态方法：设置配置值
  static async setValue(key: string, value: string, description?: string): Promise<void> {
    await CommissionSetting.upsert({
      config_key: key,
      config_value: value,
      description: description || null
    });
  }
}

// 初始化模型
CommissionSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键'
    },
    config_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '配置键'
    },
    config_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '配置值'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '说明'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  },
  {
    sequelize,
    tableName: 'commission_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// 默认配置
export const DEFAULT_COMMISSION_SETTINGS = {
  commission_rate: { value: '0.10', description: '佣金比例（10%）' },
  settlement_days: { value: '15', description: '结算周期（天）' },
  min_withdrawal_amount: { value: '10', description: '最低提现金额（元）' },
  max_daily_withdrawal: { value: '2000', description: '单日最大提现（元）' },
  max_single_transfer: { value: '200', description: '单笔转账上限（元）' }
};

export default CommissionSetting;
