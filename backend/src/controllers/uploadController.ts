import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { successResponse, errorResponse } from '../utils/response';

// 扩展 Request 类型以包含 multer 文件
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// 使用类型断言而不是继承，避免类型冲突
type MulterRequest = Request & {
  file?: MulterFile;
  files?: MulterFile[];
}

// 上传目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 子目录
const SUBDIRS = ['icons', 'images', 'avatars'];
SUBDIRS.forEach(subdir => {
  const dir = path.join(UPLOAD_DIR, subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 上传单个文件
 * POST /api/upload/:type (type: icons, images, avatars)
 */
export const uploadFile = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const type = req.params.type || 'images';

    if (!file) {
      errorResponse(res, '请选择要上传的文件', 400);
      return;
    }

    // 验证类型
    if (!SUBDIRS.includes(type)) {
      errorResponse(res, '无效的上传类型', 400);
      return;
    }

    // 构建文件URL
    // 在生产环境中使用实际域名
    const baseUrl = process.env.UPLOAD_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/uploads/${type}/${file.filename}`;

    successResponse(res, {
      url: fileUrl,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }, '文件上传成功');

  } catch (error: any) {
    console.error('Upload file error:', error);
    errorResponse(res, '文件上传失败', 500, error.message);
  }
};

/**
 * 上传多个文件
 * POST /api/upload/:type/multiple
 */
export const uploadMultipleFiles = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const files = req.files;
    const type = req.params.type || 'images';

    if (!files || files.length === 0) {
      errorResponse(res, '请选择要上传的文件', 400);
      return;
    }

    if (!SUBDIRS.includes(type)) {
      errorResponse(res, '无效的上传类型', 400);
      return;
    }

    const baseUrl = process.env.UPLOAD_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    const uploadedFiles = files.map(file => ({
      url: `${baseUrl}/uploads/${type}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    successResponse(res, {
      files: uploadedFiles,
      count: uploadedFiles.length
    }, '文件上传成功');

  } catch (error: any) {
    console.error('Upload multiple files error:', error);
    errorResponse(res, '文件上传失败', 500, error.message);
  }
};

/**
 * 删除文件
 * DELETE /api/upload/:type/:filename
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, filename } = req.params;

    if (!SUBDIRS.includes(type)) {
      errorResponse(res, '无效的文件类型', 400);
      return;
    }

    const filePath = path.join(UPLOAD_DIR, type, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      errorResponse(res, '文件不存在', 404);
      return;
    }

    // 删除文件
    fs.unlinkSync(filePath);

    successResponse(res, null, '文件删除成功');

  } catch (error: any) {
    console.error('Delete file error:', error);
    errorResponse(res, '文件删除失败', 500, error.message);
  }
};
