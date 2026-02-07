import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// 系统配置键名枚举
export enum ConfigKey {
  // 推广相关
  COMMISSION_RATE = 'commission_rate',           // 推广返现比例 (%) - 通用
  COMMISSION_RATE_COURSE = 'commission_rate_course',     // 课程购买佣金比例 (%)
  COMMISSION_RATE_MEMBERSHIP = 'commission_rate_membership', // 会员购买佣金比例 (%)

  // 用户相关
  REGISTER_BONUS = 'register_bonus',             // 注册赠金 (元)

  // 提示词相关
  PROMPT_DEFAULT_PRICE = 'prompt_default_price', // 提示词默认价格 (元)

  // 充值相关
  RECHARGE_MIN_AMOUNT = 'recharge_min_amount',   // 充值最低金额 (元)
  RECHARGE_MAX_AMOUNT = 'recharge_max_amount',   // 充值最高金额 (元)

  // 会员价格
  YEARLY_MEMBERSHIP_PRICE = 'yearly_membership_price', // 年度会员价格 (元)
  COURSE_PRICE = 'course_price',                       // 课程当前价格 (元)
  COURSE_ORIGINAL_PRICE = 'course_original_price',     // 课程原价 (元)

  // 视频提取费率
  VIDEO_RATE_NORMAL = 'video_rate_normal',       // 普通用户费率 (元/秒)
  VIDEO_RATE_YEARLY = 'video_rate_yearly',       // 年度会员费率 (元/秒)
  VIDEO_RATE_COURSE = 'video_rate_course',       // 课程学员费率 (元/秒)

  // 提现相关
  MIN_WITHDRAWAL_AMOUNT = 'min_withdrawal_amount',   // 最低提现金额 (元)
  MAX_DAILY_WITHDRAWAL = 'max_daily_withdrawal',     // 每日提现上限 (元)
  MAX_SINGLE_TRANSFER = 'max_single_transfer',       // 单笔转账上限 (元)

  // 协议条款
  TERMS_OF_SERVICE = 'terms_of_service',             // 服务条款
  PRIVACY_POLICY = 'privacy_policy',                 // 隐私政策

  // 课程相关
  COURSE_QR_CODE = 'course_qr_code',                 // 课程群二维码图片URL
}

// 默认配置值
export const DEFAULT_CONFIG: Record<ConfigKey, { value: string; description: string }> = {
  [ConfigKey.COMMISSION_RATE]: { value: '25', description: '推广返现比例 (%) - 通用' },
  [ConfigKey.COMMISSION_RATE_COURSE]: { value: '10', description: '课程购买佣金比例 (%)' },
  [ConfigKey.COMMISSION_RATE_MEMBERSHIP]: { value: '10', description: '会员购买佣金比例 (%)' },
  [ConfigKey.REGISTER_BONUS]: { value: '1', description: '注册赠金 (元)' },
  [ConfigKey.PROMPT_DEFAULT_PRICE]: { value: '9.9', description: '提示词默认价格 (元)' },
  [ConfigKey.RECHARGE_MIN_AMOUNT]: { value: '10', description: '充值最低金额 (元)' },
  [ConfigKey.RECHARGE_MAX_AMOUNT]: { value: '10000', description: '充值最高金额 (元)' },
  [ConfigKey.YEARLY_MEMBERSHIP_PRICE]: { value: '299', description: '年度会员价格 (元)' },
  [ConfigKey.COURSE_PRICE]: { value: '799', description: '课程价格 (元)' },
  [ConfigKey.COURSE_ORIGINAL_PRICE]: { value: '1299', description: '课程原价 (元)' },
  [ConfigKey.VIDEO_RATE_NORMAL]: { value: '0.002', description: '普通用户视频费率 (元/秒)' },
  [ConfigKey.VIDEO_RATE_YEARLY]: { value: '0.0015', description: '年度会员视频费率 (元/秒)' },
  [ConfigKey.VIDEO_RATE_COURSE]: { value: '0.0013', description: '课程学员视频费率 (元/秒)' },
  [ConfigKey.MIN_WITHDRAWAL_AMOUNT]: { value: '10', description: '最低提现金额 (元)' },
  [ConfigKey.MAX_DAILY_WITHDRAWAL]: { value: '2000', description: '每日提现上限 (元)' },
  [ConfigKey.MAX_SINGLE_TRANSFER]: { value: '200', description: '单笔转账上限 (元)' },
  [ConfigKey.TERMS_OF_SERVICE]: { value: `服务条款

欢迎使用创作魔方平台（以下简称"本平台"）。在使用本平台服务前，请您仔细阅读以下条款：

1. 服务说明
本平台提供AI创作工具、工作流商店、课程服务等。用户需注册账号后方可使用相关服务。

2. 用户责任
- 用户应确保注册信息真实有效
- 用户应妥善保管账号密码
- 用户不得利用本平台从事违法活动

3. 知识产权
- 本平台的软件、技术、商标等知识产权归本公司所有
- 用户使用本平台生成的内容，其著作权归用户所有

4. 免责声明
本平台不对用户生成内容的准确性、合法性承担责任。

5. 条款修改
本公司保留随时修改服务条款的权利，修改后的条款将在平台公布。

如有疑问，请联系客服。`, description: '服务条款' },
  [ConfigKey.PRIVACY_POLICY]: { value: `隐私政策

我们非常重视您的隐私保护。本隐私政策说明我们如何收集、使用和保护您的个人信息。

1. 信息收集
我们可能收集以下信息：
- 注册信息：手机号、微信账号等
- 使用信息：使用记录、设备信息等
- 支付信息：充值记录、订单信息等

2. 信息使用
我们收集的信息用于：
- 提供和改进服务
- 发送服务通知
- 防止欺诈行为

3. 信息保护
我们采取严格的安全措施保护您的个人信息，包括：
- 数据加密存储
- 访问权限控制
- 定期安全审计

4. 信息共享
除法律要求外，我们不会向第三方共享您的个人信息。

5. 用户权利
您有权：
- 访问您的个人信息
- 更正不准确的信息
- 删除您的账号

如有疑问，请联系客服。`, description: '隐私政策' },
  [ConfigKey.COURSE_QR_CODE]: { value: '', description: '课程群二维码图片URL' },
};

interface SystemConfigAttributes {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
}

class SystemConfig extends Model<SystemConfigAttributes> implements SystemConfigAttributes {
  public id!: number;
  public config_key!: string;
  public config_value!: string;
  public description!: string;
  public created_at?: Date;
  public updated_at?: Date;

  // 获取配置值（带缓存）
  private static cache: Map<string, string> = new Map();
  private static cacheExpiry: number = 0;
  private static CACHE_TTL = 60000; // 缓存1分钟

  // 获取单个配置
  static async getConfig(key: ConfigKey): Promise<string> {
    // 检查缓存
    if (Date.now() < this.cacheExpiry && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // 从数据库获取
    const config = await SystemConfig.findOne({ where: { config_key: key } });
    if (config) {
      this.cache.set(key, config.config_value);
      return config.config_value;
    }

    // 返回默认值
    return DEFAULT_CONFIG[key]?.value || '';
  }

  // 获取数字配置
  static async getNumberConfig(key: ConfigKey): Promise<number> {
    const value = await this.getConfig(key);
    return parseFloat(value) || 0;
  }

  // 获取所有配置
  static async getAllConfigs(): Promise<Record<string, { value: string; description: string }>> {
    const configs = await SystemConfig.findAll();
    const result: Record<string, { value: string; description: string }> = {};

    // 先填充默认值
    for (const [key, defaultVal] of Object.entries(DEFAULT_CONFIG)) {
      result[key] = { ...defaultVal };
    }

    // 用数据库值覆盖
    for (const config of configs) {
      result[config.config_key] = {
        value: config.config_value,
        description: config.description
      };
    }

    return result;
  }

  // 设置配置
  static async setConfig(key: string, value: string, description?: string): Promise<void> {
    const [config] = await SystemConfig.upsert({
      config_key: key,
      config_value: value,
      description: description || DEFAULT_CONFIG[key as ConfigKey]?.description || key
    } as any);

    // 清除缓存
    this.cache.delete(key);
  }

  // 批量设置配置
  static async setConfigs(configs: Array<{ key: string; value: string }>): Promise<void> {
    for (const { key, value } of configs) {
      await this.setConfig(key, value);
    }
    // 清除所有缓存
    this.cache.clear();
    this.cacheExpiry = 0;
  }

  // 初始化默认配置
  static async initDefaults(): Promise<void> {
    for (const [key, { value, description }] of Object.entries(DEFAULT_CONFIG)) {
      const existing = await SystemConfig.findOne({ where: { config_key: key } });
      if (!existing) {
        await SystemConfig.create({
          config_key: key,
          config_value: value,
          description
        } as any);
      }
    }
  }
}

SystemConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    config_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '配置键名',
    },
    config_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '配置值',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '配置说明',
    },
  },
  {
    sequelize,
    tableName: 'system_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SystemConfig;
