import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// User attributes interface
export interface UserAttributes {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  avatar_url: string | null;
  nickname: string | null;
  status: 'active' | 'suspended';
  user_type: 'normal' | 'admin';
  metadata: object | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  balance: number;
  bonus_balance: number;
  commission_balance: number;
  pending_commission_balance: number; // 待结算佣金余额（15天内）
  total_commission_earned: number; // 累计获得佣金
  total_commission_withdrawn: number; // 累计提现佣金
  points: number;
  referral_level: number;
  total_recharged: number;
  total_consumed: number;
  workflow_member_status: string | null;
  workflow_member_expire: Date | null;
  ai_content_member_status: string | null;
  ai_content_member_expire: Date | null;
  membership_type: string | null;
  membership_expiry: Date | null;
  is_course_student: boolean;
  referral_code: string | null; // 用户专属推荐码
  referred_by_user_id: number | null; // 推荐人用户ID
  referred_at: Date | null; // 被推荐时间
  user_category: string | null; // 用户分类（normal, blogger, vip等）
  custom_course_rate: number | null; // 自定义课程佣金比例(%)
  custom_membership_rate: number | null; // 自定义会员佣金比例(%)
  commission_note: string | null; // 佣金备注说明
  jianying_client_expire: Date | null; // 剪映客户端到期时间
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface UserCreationAttributes extends Optional<UserAttributes,
  'id' | 'email' | 'phone' | 'avatar_url' | 'nickname' | 'status' |
  'user_type' | 'metadata' | 'last_login_at' | 'last_login_ip' |
  'balance' | 'bonus_balance' | 'commission_balance' | 'pending_commission_balance' | 'total_commission_earned' | 'total_commission_withdrawn' | 'points' | 'referral_level' | 'total_recharged' | 'total_consumed' |
  'workflow_member_status' | 'workflow_member_expire' |
  'ai_content_member_status' | 'ai_content_member_expire' |
  'wechat_openid' | 'wechat_unionid' |
  'membership_type' | 'membership_expiry' | 'is_course_student' |
  'referral_code' | 'referred_by_user_id' | 'referred_at' |
  'user_category' | 'custom_course_rate' | 'custom_membership_rate' | 'commission_note' |
  'jianying_client_expire' | 'created_at' | 'updated_at'> {}

// User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string | null;
  public phone!: string | null;
  public password_hash!: string;
  public wechat_openid!: string | null;
  public wechat_unionid!: string | null;
  public avatar_url!: string | null;
  public nickname!: string | null;
  public status!: 'active' | 'suspended';
  public user_type!: 'normal' | 'admin';
  public metadata!: object | null;
  public last_login_at!: Date | null;
  public last_login_ip!: string | null;
  public balance!: number;
  public bonus_balance!: number;
  public commission_balance!: number;
  public pending_commission_balance!: number;
  public total_commission_earned!: number;
  public total_commission_withdrawn!: number;
  public points!: number;
  public referral_level!: number;
  public total_recharged!: number;
  public total_consumed!: number;
  public workflow_member_status!: string | null;
  public workflow_member_expire!: Date | null;
  public ai_content_member_status!: string | null;
  public ai_content_member_expire!: Date | null;
  public membership_type!: string | null;
  public membership_expiry!: Date | null;
  public is_course_student!: boolean;
  public referral_code!: string | null;
  public referred_by_user_id!: number | null;
  public referred_at!: Date | null;
  public user_category!: string | null;
  public custom_course_rate!: number | null;
  public custom_membership_rate!: number | null;
  public commission_note!: string | null;
  public jianying_client_expire!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Method to get user data without sensitive info
  public toSafeJSON() {
    const values = this.toJSON() as UserAttributes;
    const { password_hash, ...safeData } = values;
    return safeData;
  }
}

// Initialize model
User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '用户ID'
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '用户名'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: '邮箱'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: '手机号'
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码哈希'
    },
    wechat_openid: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: '微信OpenID'
    },
    wechat_unionid: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '微信UnionID'
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '头像URL'
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '昵称'
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended'),
      defaultValue: 'active',
      comment: '账户状态'
    },
    user_type: {
      type: DataTypes.ENUM('normal', 'admin'),
      defaultValue: 'normal',
      comment: '用户类型'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '扩展元数据'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
    },
    last_login_ip: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '最后登录IP'
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
    },
    balance: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '账户余额（充值金）'
    },
    bonus_balance: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '赠金余额'
    },
    commission_balance: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '可提现佣金余额（已结算）'
    },
    pending_commission_balance: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '待结算佣金余额（15天结算期内）'
    },
    total_commission_earned: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '累计获得佣金总额'
    },
    total_commission_withdrawn: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      comment: '累计提现佣金总额'
    },
    points: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '推广积分'
    },
    referral_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '推广等级'
    },
    total_recharged: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 0,
      comment: '累计充值'
    },
    total_consumed: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 0,
      comment: '累计消费'
    },
    workflow_member_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '工作流会员状态'
    },
    workflow_member_expire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '工作流会员到期时间'
    },
    ai_content_member_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '降AI率会员状态'
    },
    ai_content_member_expire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '降AI率会员到期时间'
    },
    membership_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '会员类型'
    },
    membership_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '会员到期时间'
    },
    is_course_student: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否为课程学员'
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: '用户专属推荐码'
    },
    referred_by_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '推荐人用户ID'
    },
    referred_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '被推荐时间'
    },
    user_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'normal',
      comment: '用户分类（normal, blogger, vip等）'
    },
    custom_course_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '自定义课程佣金比例(%)'
    },
    custom_membership_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '自定义会员佣金比例(%)'
    },
    commission_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '佣金备注说明'
    },
    jianying_client_expire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '剪映客户端到期时间'
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['phone'] },
      { fields: ['status'] },
      { fields: ['wechat_openid'] },
      { fields: ['referral_code'] },
      { fields: ['user_category'] }
    ]
  }
);

export default User;
