import { Request, Response } from 'express';
import AppDownload from '../models/AppDownload';

// 获取应用下载信息（通过 app_key）
export const getAppByKey = async (req: Request, res: Response) => {
  try {
    const { appKey } = req.params;

    const app = await AppDownload.findOne({
      where: { app_key: appKey, is_active: true }
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: '应用不存在'
      });
    }

    return res.json({
      success: true,
      data: app
    });
  } catch (err) {
    console.error('获取应用下载信息失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取应用下载信息失败'
    });
  }
};

// 获取所有应用列表
export const getAllApps = async (req: Request, res: Response) => {
  try {
    const apps = await AppDownload.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    return res.json({
      success: true,
      data: apps
    });
  } catch (err) {
    console.error('获取应用列表失败:', err);
    return res.status(500).json({
      success: false,
      message: '获取应用列表失败'
    });
  }
};

// 记录下载（增加下载计数）
export const recordDownload = async (req: Request, res: Response) => {
  try {
    const { appKey } = req.params;
    const { platform } = req.body; // 'windows' or 'mac'

    const app = await AppDownload.findOne({
      where: { app_key: appKey, is_active: true }
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: '应用不存在'
      });
    }

    // 增加下载计数
    await app.update({
      download_count: app.download_count + 1
    });

    // 返回对应平台的下载链接
    const downloadUrl = platform === 'mac' ? app.mac_url : app.windows_url;

    return res.json({
      success: true,
      data: {
        download_url: downloadUrl,
        download_count: app.download_count + 1
      }
    });
  } catch (err) {
    console.error('记录下载失败:', err);
    return res.status(500).json({
      success: false,
      message: '记录下载失败'
    });
  }
};

// 管理员：创建或更新应用
export const upsertApp = async (req: Request, res: Response) => {
  try {
    const {
      app_key,
      app_name,
      description,
      windows_url,
      mac_url,
      windows_version,
      mac_version,
      icon_url,
      features,
      is_active
    } = req.body;

    if (!app_key || !app_name) {
      return res.status(400).json({
        success: false,
        message: 'app_key 和 app_name 为必填项'
      });
    }

    const [app, created] = await AppDownload.upsert({
      app_key,
      app_name,
      description,
      windows_url,
      mac_url,
      windows_version,
      mac_version,
      icon_url,
      features,
      is_active: is_active !== false
    });

    return res.json({
      success: true,
      message: created ? '创建成功' : '更新成功',
      data: app
    });
  } catch (err) {
    console.error('保存应用失败:', err);
    return res.status(500).json({
      success: false,
      message: '保存应用失败'
    });
  }
};
