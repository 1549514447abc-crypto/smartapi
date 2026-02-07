import { Request, Response } from 'express';
import os from 'os';
import sequelize from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Get system status
 * GET /api/admin/system-status
 */
export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connection
    let databaseStatus: 'ok' | 'error' = 'ok';
    try {
      await sequelize.authenticate();
    } catch (error) {
      databaseStatus = 'error';
      console.error('Database connection error:', error);
    }

    // Get CPU usage (average load)
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = Math.round((1 - idle / total) * 100);

    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Convert bytes to MB
    const totalMemoryMB = Math.round(totalMemory / 1024 / 1024);
    const usedMemoryMB = Math.round(usedMemory / 1024 / 1024);

    // Get system uptime
    const uptime = Math.floor(process.uptime());

    successResponse(res, {
      api: 'ok',
      database: databaseStatus,
      uptime,
      memory: {
        used: usedMemoryMB,
        total: totalMemoryMB,
      },
      cpu: cpuUsage,
    }, 'System status retrieved successfully');

  } catch (error: any) {
    console.error('Get system status error:', error);
    errorResponse(res, 'Failed to get system status', 500, error.message);
  }
};
