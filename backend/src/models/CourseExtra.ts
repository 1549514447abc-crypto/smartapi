import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// CourseExtra attributes interface
export interface CourseExtraAttributes {
  id: number;
  type: string;
  title: string;
  description: string | null;
  link_url: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// Attributes that are optional during creation
interface CourseExtraCreationAttributes extends Optional<CourseExtraAttributes,
  'id' | 'description' | 'link_url' | 'sort_order' | 'created_at' | 'updated_at'> {}

// CourseExtra model class
class CourseExtra extends Model<CourseExtraAttributes, CourseExtraCreationAttributes> implements CourseExtraAttributes {
  public id!: number;
  public type!: string;
  public title!: string;
  public description!: string | null;
  public link_url!: string | null;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// Initialize model
CourseExtra.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: '附赠内容ID'
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '类型: reward/prompt_library/workflow_download/workflow_list'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '标题'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '描述'
    },
    link_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '链接地址'
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
    tableName: 'course_extras',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['type'] },
      { fields: ['sort_order'] }
    ]
  }
);

export default CourseExtra;
