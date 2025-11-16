import axios, { AxiosError } from 'axios';
import ApiConfig from '../models/ApiConfig';
import ApiCallLog from '../models/ApiCallLog';
import { promisify } from 'util';
import { execFile } from 'child_process';
import * as path from 'path';

const execFileAsync = promisify(execFile);

/**
 * 阿里云DashScope语音识别响应接口（异步任务提交）
 */
export interface DashscopeAsrSubmitResponse {
  output?: {
    task_id?: string;
  };
  request_id?: string;
  code?: string;
  message?: string;
}

/**
 * 阿里云DashScope语音识别任务查询响应
 */
export interface DashscopeAsrTaskResponse {
  output?: {
    task_id?: string;
    task_status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    submit_time?: string;
    scheduled_time?: string;
    end_time?: string;
    results?: Array<{
      transcription_url?: string;
      transcription?: {
        text?: string;
        sentences?: Array<{
          text?: string;
          begin_time?: number;
          end_time?: number;
        }>;
      };
    }>;
  };
  usage?: {
    duration?: number; // 实际使用时长（秒）
  };
  request_id?: string;
  code?: string;
  message?: string;
}

/**
 * 语音识别结果
 */
export interface TranscriptionResult {
  text: string;
  duration: number; // 音频时长（秒）
  usedSeconds: number; // 计费秒数
  requestId?: string;
}

/**
 * 阿里云DashScope语音识别服务
 */
class DashscopeAsrService {
  private serviceName = 'dashscope_asr';

  /**
   * 从数据库获取配置
   */
  private async getConfig(key: string): Promise<string | null> {
    const config = await ApiConfig.findOne({
      where: {
        service_name: this.serviceName,
        config_key: key,
        is_active: true
      }
    });
    return config ? config.config_value : null;
  }

  /**
   * 记录API调用日志
   */
  private async logApiCall(params: {
    userId?: number;
    requestUrl: string;
    requestParams: object;
    responseCode?: number;
    responseData?: object;
    errorMessage?: string;
    callDuration: number;
  }): Promise<void> {
    try {
      await ApiCallLog.create({
        user_id: params.userId || null,
        api_service: this.serviceName,
        token_type: 'api_key',
        request_url: params.requestUrl,
        request_params: params.requestParams,
        response_code: params.responseCode || null,
        response_data: params.responseData || null,
        error_message: params.errorMessage || null,
        call_duration: params.callDuration
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
    }
  }

  /**
   * 提交异步语音识别任务
   */
  private async submitAsrTask(audioUrl: string, apiKey: string, model: string, endpoint: string): Promise<string> {
    const requestParams = {
      model,
      input: {
        file_urls: [audioUrl]  // 使用 file_urls 数组格式
      },
      parameters: {
        format: 'mp3'
      }
    };

    console.log(`📤 Submitting ASR task for: ${audioUrl.substring(0, 50)}...`);

    const response = await axios.post<any>(
      endpoint,
      requestParams,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // 检查响应
    if (response.data.code && response.data.code !== '200') {
      const errorMsg = response.data.message || 'Failed to submit ASR task';
      console.error(`❌ DashScope Error (code ${response.data.code}): ${errorMsg}`);
      throw new Error(`DashScope错误(${response.data.code}): ${errorMsg}`);
    }

    const taskId = response.data.output?.task_id;
    if (!taskId) {
      throw new Error('No task_id returned from DashScope');
    }

    console.log(`✅ ASR task submitted: ${taskId}`);
    return taskId;
  }

  /**
   * 查询异步任务状态
   */
  private async getTaskStatus(taskId: string, apiKey: string): Promise<any> {
    const endpoint = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

    const response = await axios.get<any>(
      endpoint,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * 等待任务完成（带轮询）
   */
  private async waitForTaskCompletion(taskId: string, apiKey: string, maxWaitTime: number = 180000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 3000; // 每3秒查询一次
    let attempts = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      console.log(`🔍 Checking task status (attempt ${attempts})...`);

      const statusResponse = await this.getTaskStatus(taskId, apiKey);

      const status = statusResponse.output?.task_status;

      if (status === 'SUCCEEDED') {
        console.log(`✅ Task completed successfully`);
        return statusResponse;
      } else if (status === 'FAILED') {
        const errorMsg = statusResponse.message || 'Task failed';
        throw new Error(`ASR task failed: ${errorMsg}`);
      } else if (status === 'PENDING' || status === 'RUNNING') {
        console.log(`⏳ Task status: ${status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        throw new Error(`Unknown task status: ${status}`);
      }
    }

    throw new Error(`Task timeout after ${maxWaitTime}ms`);
  }

  /**
   * 语音识别 - 通过音频URL（使用 Python SDK）
   */
  async transcribeFromUrl(audioUrl: string, userId?: number): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // 获取配置
    const apiKey = await this.getConfig('api_key');
    const model = await this.getConfig('model') || 'paraformer-v2';

    if (!apiKey) {
      throw new Error('DashScope API Key not configured');
    }

    try {
      console.log(`🎤 Starting speech recognition (Python SDK) for: ${audioUrl.substring(0, 50)}...`);

      // 调用 Python 脚本
      const pythonScript = path.join(__dirname, '../../dashscope-asr.py');
      const { stdout, stderr } = await execFileAsync('python', [pythonScript, audioUrl, apiKey, model], {
        encoding: 'utf8', // 指定UTF-8编码以正确处理中文
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 180000 // 3分钟超时
      });

      if (stderr && stderr.trim()) {
        console.warn('Python script stderr:', stderr);
      }

      // 解析 JSON 结果
      const result = JSON.parse(stdout);

      const duration = Date.now() - startTime;

      if (!result.success) {
        throw new Error(result.error || 'Python script failed');
      }

      // 记录成功的API调用
      await this.logApiCall({
        userId,
        requestUrl: 'python:dashscope-asr',
        requestParams: { audioUrl, model },
        responseCode: 200,
        responseData: result,
        callDuration: duration
      });

      console.log(`✅ Speech recognition completed: ${result.text.length} characters, ${result.duration}s audio`);

      return {
        text: result.text,
        duration: result.duration,
        usedSeconds: result.duration,
        requestId: result.task_id
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error';

      // 记录失败的API调用
      await this.logApiCall({
        userId,
        requestUrl: 'python:dashscope-asr',
        requestParams: { audioUrl, model },
        errorMessage,
        callDuration: duration
      });

      console.error('❌ Speech recognition error:', errorMessage);
      throw new Error(`Speech recognition failed: ${errorMessage}`);
    }
  }

  /**
   * 获取API统计信息
   */
  async getStatistics(userId?: number): Promise<{
    total_calls: number;
    success_calls: number;
    failed_calls: number;
    avg_duration: number;
    total_audio_seconds: number;
  }> {
    const where: any = { api_service: this.serviceName };
    if (userId) {
      where.user_id = userId;
    }

    const logs = await ApiCallLog.findAll({ where });

    const total = logs.length;
    const success = logs.filter(log => log.response_code === 200).length;
    const failed = total - success;
    const avgDuration = total > 0
      ? logs.reduce((sum, log) => sum + (log.call_duration || 0), 0) / total
      : 0;

    // 计算总音频秒数（从response_data中提取）
    let totalAudioSeconds = 0;
    logs.forEach(log => {
      if (log.response_data) {
        const data = log.response_data as any;
        totalAudioSeconds += data.usage?.duration || data.output?.duration || 0;
      }
    });

    return {
      total_calls: total,
      success_calls: success,
      failed_calls: failed,
      avg_duration: Math.round(avgDuration),
      total_audio_seconds: totalAudioSeconds
    };
  }
}

export default new DashscopeAsrService();
