import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// CourseLesson attributes interface
export interface CourseLessonAttributes {
  id: number;
  title: string;
  video_path: string;
  duration: number | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface CourseLessonCreationAttributes extends Optional<CourseLessonAttributes,
  'id' | 'duration' | 'sort_order' | 'created_at' | 'updated_at'> {}

// CourseLesson model class
class CourseLesson extends Model<CourseLessonAttributes, CourseLessonCreationAttributes> implements CourseLessonAttributes {
  public id!: number;
  public title!: string;
  public video_path!: string;
  public duration!: number | null;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
CourseLesson.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: '课程ID'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '课程标题'
    },
    video_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '视频文件路径'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '视频时长（秒）'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序序号'
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
    tableName: 'course_lessons',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['sort_order'] }
    ]
  }
);

export default CourseLesson;
