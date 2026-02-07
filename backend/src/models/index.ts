// Import all models to ensure they are registered with Sequelize
// and their associations are properly established

import User from './User';
import ApiConfig from './ApiConfig';
import ApiCallLog from './ApiCallLog';
import VideoExtractionTask from './VideoExtractionTask';
import Workflow from './Workflow';
import Plugin from './Plugin';
import UserPlugin from './UserPlugin';
import CourseSetting from './CourseSetting';
import CourseLesson from './CourseLesson';
import CourseOrder from './CourseOrder';
import UserReferral from './UserReferral';
import Commission from './Commission';
import AppDownload from './AppDownload';
import Prompt from './Prompt';
import UserPrompt from './UserPrompt';
import PromptCategory from './PromptCategory';
import SystemConfig from './SystemConfig';
import PaymentConfig from './PaymentConfig';
import InvoiceApplication from './InvoiceApplication';
import WithdrawalRequest from './WithdrawalRequest';
import WithdrawalTransfer from './WithdrawalTransfer';
import CommissionSetting from './CommissionSetting';
import UserCategory from './UserCategory';

// 配置额外的关联（避免循环依赖）
WithdrawalRequest.hasMany(WithdrawalTransfer, {
  foreignKey: 'withdrawal_id',
  as: 'transfers'
});

// Export all models
export {
  User,
  ApiConfig,
  ApiCallLog,
  VideoExtractionTask,
  Workflow,
  Plugin,
  UserPlugin,
  CourseSetting,
  CourseLesson,
  CourseOrder,
  UserReferral,
  Commission,
  AppDownload,
  Prompt,
  UserPrompt,
  PromptCategory,
  SystemConfig,
  PaymentConfig,
  InvoiceApplication,
  WithdrawalRequest,
  WithdrawalTransfer,
  CommissionSetting,
  UserCategory
};

// This ensures all model associations are loaded when the app starts
export default {
  User,
  ApiConfig,
  ApiCallLog,
  VideoExtractionTask,
  Workflow,
  Plugin,
  UserPlugin,
  CourseSetting,
  CourseLesson,
  CourseOrder,
  UserReferral,
  Commission,
  AppDownload,
  Prompt,
  UserPrompt,
  PromptCategory,
  SystemConfig,
  PaymentConfig,
  InvoiceApplication,
  WithdrawalRequest,
  WithdrawalTransfer,
  CommissionSetting,
  UserCategory
};
