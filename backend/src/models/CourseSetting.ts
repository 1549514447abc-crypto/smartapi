import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// CourseSetting attributes interface
export interface CourseSettingAttributes {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image: string | null;
  original_price: number;
  current_price: number;
  instructor_name: string | null;
  instructor_avatar: string | null;
  instructor_bio: string | null;
  highlights: string[] | null;
  outline: Array<{ chapter: string; lessons: number }> | null;
  wechat_qr_image: string | null;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface CourseSettingCreationAttributes extends Optional<CourseSettingAttributes,
  'id' | 'subtitle' | 'description' | 'cover_image' | 'instructor_name' |
  'instructor_avatar' | 'instructor_bio' | 'highlights' | 'outline' |
  'wechat_qr_image' | 'created_at' | 'updated_at'> {}

// CourseSetting model class
class CourseSetting extends Model<CourseSettingAttributes, CourseSettingCreationAttributes> implements CourseSettingAttributes {
  public id!: number;
  public title!: string;
  public subtitle!: string | null;
  public description!: string | null;
  public cover_image!: string | null;
  public original_price!: number;
  public current_price!: number;
  public instructor_name!: string | null;
  public instructor_avatar!: string | null;
  public instructor_bio!: string | null;
  public highlights!: string[] | null;
  public outline!: Array<{ chapter: string; lessons: number }> | null;
  public wechat_qr_image!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
CourseSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: '课程设置ID'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '课程标题'
    },
    subtitle: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: '课程副标题'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '课程描述'
    },
    cover_image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '课程封面图路径'
    },
    original_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '原价'
    },
    current_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '现价'
    },
    instructor_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '讲师姓名'
    },
    instructor_avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '讲师头像路径'
    },
    instructor_bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '讲师简介'
    },
    highlights: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '课程亮点（数组）'
    },
    outline: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '课程大纲（章节数组）'
    },
    wechat_qr_image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '微信二维码图片路径'
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
    tableName: 'course_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default CourseSetting;
