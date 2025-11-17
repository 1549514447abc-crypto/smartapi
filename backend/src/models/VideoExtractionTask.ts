// Updated status types for async processing
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// VideoExtractionTask attributes interface
export interface VideoExtractionTaskAttributes {
  id: number;
  user_id: number;
  original_url: string;
  platform: string | null;
  video_url: string | null;
  video_title: string | null;
  video_cover: string | null;
  video_duration: number | null;
  author_name: string | null;
  author_avatar: string | null;
  audio_url: string | null;
  transcript: string | null;
  corrected_transcript: string | null;
  audio_duration: number | null;
  used_seconds: number | null;
  enable_correction: boolean;
  correction_cost: number | null;
  raw_response: object | null;
  status: 'pending' | 'step1_parsing' | 'step2_transcribing' | 'step3_correcting' | 'completed' | 'failed';
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

// Attributes that are optional during creation
interface VideoExtractionTaskCreationAttributes extends Optional<VideoExtractionTaskAttributes,
  'id' | 'platform' | 'video_url' | 'video_title' | 'video_cover' |
  'video_duration' | 'author_name' | 'author_avatar' | 'audio_url' |
  'transcript' | 'corrected_transcript' | 'audio_duration' | 'used_seconds' |
  'enable_correction' | 'correction_cost' | 'raw_response' |
  'status' | 'error_message' | 'created_at' | 'completed_at'> {}

// VideoExtractionTask model class
class VideoExtractionTask extends Model<VideoExtractionTaskAttributes, VideoExtractionTaskCreationAttributes>
  implements VideoExtractionTaskAttributes {
  public id!: number;
  public user_id!: number;
  public original_url!: string;
  public platform!: string | null;
  public video_url!: string | null;
  public video_title!: string | null;
  public video_cover!: string | null;
  public video_duration!: number | null;
  public author_name!: string | null;
  public author_avatar!: string | null;
  public audio_url!: string | null;
  public transcript!: string | null;
  public corrected_transcript!: string | null;
  public audio_duration!: number | null;
  public used_seconds!: number | null;
  public enable_correction!: boolean;
  public correction_cost!: number | null;
  public raw_response!: object | null;
  public status!: 'pending' | 'step1_parsing' | 'step2_transcribing' | 'step3_correcting' | 'completed' | 'failed';
  public error_message!: string | null;
  public readonly created_at!: Date;
  public completed_at!: Date | null;
}

// Initialize model
VideoExtractionTask.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '用户ID'
    },
    original_url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      comment: '原始短视频链接'
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '平台(抖音/快手/B站等)'
    },
    video_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: '解析后的视频直链'
    },
    video_title: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '视频标题'
    },
    video_cover: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: '封面图'
    },
    video_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '时长(秒)'
    },
    author_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '作者名'
    },
    author_avatar: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: '作者头像'
    },
    audio_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: '音频直链URL'
    },
    transcript: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '识别出的原始文案'
    },
    corrected_transcript: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '纠错后的文案'
    },
    audio_duration: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '音频时长(秒)'
    },
    used_seconds: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '计费秒数'
    },
    enable_correction: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否启用智能纠错'
    },
    correction_cost: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '纠错消耗的token数'
    },
    raw_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'ALAPI完整响应'
    },
    status: {
      type: DataTypes.ENUM('pending', 'step1_parsing', 'step2_transcribing', 'step3_correcting', 'completed', 'failed'),
      defaultValue: 'pending',
      comment: '任务状态'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误信息'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '完成时间'
    }
  },
  {
    sequelize,
    tableName: 'video_extraction_tasks',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  }
);

// Define associations
VideoExtractionTask.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

export default VideoExtractionTask;
