import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// InvoiceApplication attributes interface
export interface InvoiceApplicationAttributes {
  id: number;
  user_id: number;
  invoice_type: 'normal' | 'special'; // 普票 / 专票
  title: string; // 发票抬头
  tax_number: string | null; // 税号（专票必填）
  amount: number; // 开票金额
  email: string; // 接收邮箱
  remark: string | null; // 备注
  status: 'pending' | 'processing' | 'completed' | 'rejected'; // 状态
  admin_remark: string | null; // 管理员备注
  processed_at: Date | null; // 处理时间
  processed_by: number | null; // 处理人ID
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface InvoiceApplicationCreationAttributes extends Optional<InvoiceApplicationAttributes,
  'id' | 'tax_number' | 'remark' | 'status' | 'admin_remark' | 'processed_at' | 'processed_by' | 'created_at' | 'updated_at'> {}

// InvoiceApplication model class
class InvoiceApplication extends Model<InvoiceApplicationAttributes, InvoiceApplicationCreationAttributes> implements InvoiceApplicationAttributes {
  public id!: number;
  public user_id!: number;
  public invoice_type!: 'normal' | 'special';
  public title!: string;
  public tax_number!: string | null;
  public amount!: number;
  public email!: string;
  public remark!: string | null;
  public status!: 'pending' | 'processing' | 'completed' | 'rejected';
  public admin_remark!: string | null;
  public processed_at!: Date | null;
  public processed_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual fields
  public readonly user?: User;
  public readonly processor?: User;
}

// Initialize model
InvoiceApplication.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '申请用户ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    invoice_type: {
      type: DataTypes.ENUM('normal', 'special'),
      allowNull: false,
      defaultValue: 'normal',
      comment: '发票类型：normal-普票, special-专票'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '发票抬头'
    },
    tax_number: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: '纳税人识别号（专票必填）'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '开票金额'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '接收邮箱'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户备注'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'rejected'),
      defaultValue: 'pending',
      comment: '状态：pending-待处理, processing-处理中, completed-已完成, rejected-已拒绝'
    },
    admin_remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员备注'
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '处理时间'
    },
    processed_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '处理人ID',
      references: {
        model: 'users',
        key: 'id'
      }
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
    tableName: 'invoice_applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  }
);

// Define associations
InvoiceApplication.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

InvoiceApplication.belongsTo(User, {
  foreignKey: 'processed_by',
  as: 'processor'
});

export default InvoiceApplication;
