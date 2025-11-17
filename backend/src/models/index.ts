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
  Commission
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
  Commission
};
