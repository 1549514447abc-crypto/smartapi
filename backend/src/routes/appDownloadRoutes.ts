import express from 'express';
import {
  getAppByKey,
  getAllApps,
  recordDownload,
  upsertApp
} from '../controllers/appDownloadController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 公开接口
router.get('/list', getAllApps);
router.get('/:appKey', getAppByKey);
router.post('/:appKey/download', recordDownload);

// 管理接口（需要登录）
router.post('/admin/upsert', authenticate, upsertApp);

export default router;
