import axios, { AxiosError } from 'axios';
import ApiConfig from '../models/ApiConfig';
import ApiCallLog from '../models/ApiCallLog';

// ALAPI response interface
export interface AlapiVideoResponse {
  code: number;
  msg: string;
  data?: {
    url?: string;
    title?: string;
    cover?: string;
    duration?: number;
    author?: string;
    author_avatar?: string;
    platform?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Service class for ALAPI integration
class AlapiService {
  private serviceName = 'video_parser';

  /**
   * Get configuration value by key
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
   * Update configuration value
   */
  private async updateConfig(key: string, value: string): Promise<void> {
    await ApiConfig.update(
      { config_value: value },
      {
        where: {
          service_name: this.serviceName,
          config_key: key
        }
      }
    );
  }

  /**
   * Get current active token
   */
  private async getCurrentToken(): Promise<{ token: string; type: string }> {
    const currentType = await this.getConfig('current_token') || 'primary';
    const tokenKey = currentType === 'primary' ? 'primary_token' : 'backup_token';
    const token = await this.getConfig(tokenKey);

    if (!token) {
      throw new Error(`Token not configured: ${tokenKey}`);
    }

    return { token, type: currentType };
  }

  /**
   * Switch to backup token
   */
  private async switchToBackupToken(): Promise<void> {
    console.log('⚠️  Switching from primary to backup token...');
    await this.updateConfig('current_token', 'backup');
  }

  /**
   * Log API call
   */
  private async logApiCall(params: {
    userId?: number;
    tokenType: string;
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
        token_type: params.tokenType,
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
   * Check if error is quota exceeded
   */
  private isQuotaExceededError(response: AlapiVideoResponse): boolean {
    // ALAPI quota exceeded error codes (adjust based on actual ALAPI documentation)
    const quotaErrorCodes = [101, 102, 103]; // Example error codes
    return quotaErrorCodes.includes(response.code);
  }

  /**
   * Parse video URL with automatic token switching
   */
  async parseVideo(videoUrl: string, userId?: number): Promise<AlapiVideoResponse> {
    const endpoint = await this.getConfig('api_endpoint') || 'https://v3.alapi.cn/api/video/url';
    const startTime = Date.now();

    // Get current token
    let { token, type } = await this.getCurrentToken();

    // First attempt
    const requestParams = { token, url: videoUrl };

    try {
      const response = await axios.post<AlapiVideoResponse>(
        endpoint,
        requestParams,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      const duration = Date.now() - startTime;

      // Log successful call
      await this.logApiCall({
        userId,
        tokenType: type,
        requestUrl: endpoint,
        requestParams,
        responseCode: response.status,
        responseData: response.data,
        callDuration: duration
      });

      // Check if quota exceeded and we're using primary token
      if (this.isQuotaExceededError(response.data) && type === 'primary') {
        console.log('⚠️  Primary token quota exceeded, switching to backup...');

        // Switch to backup token
        await this.switchToBackupToken();

        // Retry with backup token
        return await this.parseVideo(videoUrl, userId);
      }

      // Check if request was successful
      if (response.data.code !== 200) {
        const errorMessage = response.data.message || response.data.msg || 'ALAPI request failed';
        console.error(`❌ ALAPI Error (code ${response.data.code}): ${errorMessage}`);
        throw new Error(`ALAPI错误(${response.data.code}): ${errorMessage}`);
      }

      return response.data;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof AxiosError
        ? error.message
        : error instanceof Error
        ? error.message
        : 'Unknown error';

      // Log failed call
      await this.logApiCall({
        userId,
        tokenType: type,
        requestUrl: endpoint,
        requestParams,
        errorMessage,
        callDuration: duration
      });

      throw error;
    }
  }

  /**
   * Get API statistics
   */
  async getStatistics(userId?: number): Promise<{
    total_calls: number;
    success_calls: number;
    failed_calls: number;
    avg_duration: number;
    primary_calls: number;
    backup_calls: number;
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
    const primaryCalls = logs.filter(log => log.token_type === 'primary').length;
    const backupCalls = logs.filter(log => log.token_type === 'backup').length;

    return {
      total_calls: total,
      success_calls: success,
      failed_calls: failed,
      avg_duration: Math.round(avgDuration),
      primary_calls: primaryCalls,
      backup_calls: backupCalls
    };
  }

  /**
   * Get current token configuration (for admin)
   */
  async getTokenConfig(): Promise<{
    current_token: string;
    primary_token: string;
    backup_token: string;
    api_endpoint: string;
  }> {
    const currentToken = await this.getConfig('current_token') || 'primary';
    const primaryToken = await this.getConfig('primary_token') || '';
    const backupToken = await this.getConfig('backup_token') || '';
    const apiEndpoint = await this.getConfig('api_endpoint') || '';

    return {
      current_token: currentToken,
      primary_token: primaryToken,
      backup_token: backupToken,
      api_endpoint: apiEndpoint
    };
  }

  /**
   * Update token configuration (admin only)
   */
  async updateTokenConfig(config: {
    primary_token?: string;
    backup_token?: string;
    current_token?: 'primary' | 'backup';
  }): Promise<void> {
    if (config.primary_token) {
      await this.updateConfig('primary_token', config.primary_token);
    }
    if (config.backup_token) {
      await this.updateConfig('backup_token', config.backup_token);
    }
    if (config.current_token) {
      await this.updateConfig('current_token', config.current_token);
    }
  }
}

export default new AlapiService();
