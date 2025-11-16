import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// CourseOrder attributes interface
export interface CourseOrderAttributes {
  id: number;
  order_no: string;
  user_id: number;
  course_title: string | null;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  admin_note: string | null;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface CourseOrderCreationAttributes extends Optional<CourseOrderAttributes,
  'id' | 'course_title' | 'status' | 'admin_note' | 'created_at' | 'updated_at'> {}

// CourseOrder model class
class CourseOrder extends Model<CourseOrderAttributes, CourseOrderCreationAttributes> implements CourseOrderAttributes {
  public id!: number;
  public order_no!: string;
  public user_id!: number;
  public course_title!: string | null;
  public amount!: number;
  public status!: 'pending' | 'completed' | 'cancelled';
  public admin_note!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
CourseOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: '订单ID'
    },
    order_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '订单号'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '用户ID'
    },
    course_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '课程标题'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '支付金额'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '订单状态'
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员备注'
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
    tableName: 'course_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['order_no'], unique: true },
      { fields: ['status'] }
    ]
  }
);

export default CourseOrder;
