import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { uploadFile, uploadMultipleFiles, deleteFile } from '../controllers/uploadController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// 上传目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 动态导入 multer（避免类型问题）
let multer: any;
try {
  multer = require('multer');
} catch (e) {
  console.error('Multer not installed. File upload will not work.');
}

// Multer 存储配置
const storage = multer?.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const type = req.params.type || 'images';
    const dir = path.join(UPLOAD_DIR, type);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req: any, file: any, cb: any) => {
    // 生成唯一文件名: timestamp-random.ext
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req: any, file: any, cb: any) => {
  const type = req.params.type;
  // 检查路径是否是 /workflows（没有 :type 参数的情况）
  const isWorkflowUpload = req.path === '/workflows' || req.originalUrl?.includes('/upload/workflows');

  // 允许的图片类型
  const imageMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  // 允许的压缩包类型（用于工作流文件）
  const archiveMimes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/octet-stream' // 有些浏览器会把zip识别为这个
  ];

  // 如果是 workflows 类型，允许 zip 文件
  if (type === 'workflows' || isWorkflowUpload) {
    if (archiveMimes.includes(file.mimetype) || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('工作流文件只允许上传 ZIP 压缩包'));
    }
  } else {
    // 其他类型只允许图片
    if (imageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WebP, SVG)'));
    }
  }
};

// Multer 实例 - 图片上传
const upload = multer?.({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // 最多10个文件
  }
});

// Multer 实例 - 工作流文件上传（允许更大的文件）
const uploadWorkflow = multer?.({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

/**
 * @route   POST /api/upload/workflows
 * @desc    上传工作流文件（zip，最大50MB）
 * @access  Private + Admin
 */
router.post('/workflows', authenticate, requireAdmin, uploadWorkflow?.single('file'), uploadFile as any);

/**
 * @route   POST /api/upload/:type
 * @desc    上传单个文件
 * @access  Private (需要登录，管理员可上传任何类型)
 * @param   type - icons, images, avatars
 */
router.post('/:type', authenticate, upload?.single('file'), uploadFile as any);

/**
 * @route   POST /api/upload/:type/multiple
 * @desc    上传多个文件
 * @access  Private + Admin
 */
router.post('/:type/multiple', authenticate, requireAdmin, upload?.array('files', 10), uploadMultipleFiles as any);

/**
 * @route   DELETE /api/upload/:type/:filename
 * @desc    删除文件
 * @access  Private + Admin
 */
router.delete('/:type/:filename', authenticate, requireAdmin, deleteFile);

// 错误处理中间件
router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err && err.code) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const isWorkflow = req.params.type === 'workflows' || req.path.includes('workflows');
      return res.status(400).json({
        success: false,
        error: isWorkflow ? '文件大小不能超过 50MB' : '文件大小不能超过 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: '最多只能上传 10 个文件'
      });
    }
  }

  if (err && err.message) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  return res.status(500).json({
    success: false,
    error: '上传失败'
  });
});

export default router;
