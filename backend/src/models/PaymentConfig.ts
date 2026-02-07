import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 支付渠道枚举
export enum PaymentChannel {
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
}

// PaymentConfig attributes interface
export interface PaymentConfigAttributes {
  id: number;
  channel: PaymentChannel;
  is_enabled: boolean;
  is_sandbox: boolean;

  // 通用字段
  app_id: string;

  // 支付宝专用字段
  gateway_url: string | null;           // 支付宝网关地址
  app_private_key: string | null;       // 应用私钥 (RSA2)
  app_public_key: string | null;        // 应用公钥
  alipay_public_key: string | null;     // 支付宝公钥 (用于验签)
  app_cert_path: string | null;         // 应用公钥证书路径
  alipay_cert_path: string | null;      // 支付宝公钥证书路径
  root_cert_path: string | null;        // 支付宝根证书路径
  sign_type: string | null;             // 签名类型: RSA2, RSA

  // 微信支付专用字段
  mch_id: string | null;                // 商户号
  api_key: string | null;               // API密钥 (V2)
  api_key_v3: string | null;            // API密钥 (V3)
  serial_no: string | null;             // 证书序列号
  private_key_path: string | null;      // 商户私钥路径

  // 回调地址
  notify_url: string | null;            // 异步通知地址
  return_url: string | null;            // 同步跳转地址 (支付宝用)

  // 其他配置 (JSON格式存储扩展配置)
  extra_config: string | null;

  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface PaymentConfigCreationAttributes extends Optional<PaymentConfigAttributes,
  'id' | 'is_enabled' | 'is_sandbox' | 'gateway_url' | 'app_private_key' | 'app_public_key' |
  'alipay_public_key' | 'app_cert_path' | 'alipay_cert_path' | 'root_cert_path' | 'sign_type' |
  'mch_id' | 'api_key' | 'api_key_v3' | 'serial_no' | 'private_key_path' |
  'notify_url' | 'return_url' | 'extra_config' | 'description' | 'created_at' | 'updated_at'> {}

// PaymentConfig model class
class PaymentConfig extends Model<PaymentConfigAttributes, PaymentConfigCreationAttributes> implements PaymentConfigAttributes {
  public id!: number;
  public channel!: PaymentChannel;
  public is_enabled!: boolean;
  public is_sandbox!: boolean;
  public app_id!: string;
  public gateway_url!: string | null;
  public app_private_key!: string | null;
  public app_public_key!: string | null;
  public alipay_public_key!: string | null;
  public app_cert_path!: string | null;
  public alipay_cert_path!: string | null;
  public root_cert_path!: string | null;
  public sign_type!: string | null;
  public mch_id!: string | null;
  public api_key!: string | null;
  public api_key_v3!: string | null;
  public serial_no!: string | null;
  public private_key_path!: string | null;
  public notify_url!: string | null;
  public return_url!: string | null;
  public extra_config!: string | null;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 获取支付宝配置
  static async getAlipayConfig(): Promise<PaymentConfig | null> {
    return PaymentConfig.findOne({
      where: { channel: PaymentChannel.ALIPAY, is_enabled: true }
    });
  }

  // 获取微信支付配置
  static async getWechatConfig(): Promise<PaymentConfig | null> {
    return PaymentConfig.findOne({
      where: { channel: PaymentChannel.WECHAT, is_enabled: true }
    });
  }

  // 获取所有启用的支付渠道
  static async getEnabledChannels(): Promise<PaymentChannel[]> {
    const configs = await PaymentConfig.findAll({
      where: { is_enabled: true },
      attributes: ['channel']
    });
    return configs.map(c => c.channel);
  }

  // 检查支付渠道是否可用
  static async isChannelEnabled(channel: PaymentChannel): Promise<boolean> {
    const config = await PaymentConfig.findOne({
      where: { channel, is_enabled: true }
    });
    return config !== null;
  }

  // 获取扩展配置 (解析JSON)
  getExtraConfig<T = Record<string, unknown>>(): T | null {
    if (!this.extra_config) return null;
    try {
      return JSON.parse(this.extra_config) as T;
    } catch {
      return null;
    }
  }

  // 设置扩展配置
  setExtraConfig(config: Record<string, unknown>): void {
    this.extra_config = JSON.stringify(config);
  }
}

// Initialize model
PaymentConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    channel: {
      type: DataTypes.ENUM(...Object.values(PaymentChannel)),
      allowNull: false,
      unique: true,
      comment: '支付渠道: alipay, wechat'
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否启用'
    },
    is_sandbox: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否沙箱环境'
    },
    app_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '应用ID'
    },
    gateway_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '支付网关地址'
    },
    app_private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '应用私钥'
    },
    app_public_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '应用公钥'
    },
    alipay_public_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '支付宝公钥'
    },
    app_cert_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '应用公钥证书路径'
    },
    alipay_cert_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '支付宝公钥证书路径'
    },
    root_cert_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '支付宝根证书路径'
    },
    sign_type: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'RSA2',
      comment: '签名类型'
    },
    mch_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '微信商户号'
    },
    api_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信API密钥V2'
    },
    api_key_v3: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信API密钥V3'
    },
    serial_no: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信证书序列号'
    },
    private_key_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '微信商户私钥路径'
    },
    notify_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '异步通知地址'
    },
    return_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '同步跳转地址'
    },
    extra_config: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '扩展配置(JSON)'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '说明'
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
    tableName: 'payment_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['channel'] },
      { fields: ['is_enabled'] }
    ]
  }
);

export default PaymentConfig;
