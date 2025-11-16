/**
 * Supabase 同步服务
 * 负责将本地数据同步到 Supabase，实现双向数据同步
 * 配置从数据库 api_configs 表读取
 */

import ApiConfig from '../models/ApiConfig';

interface UnifiedUser {
  user_id: string;
  balance: number;
  total_recharged: number;
  total_consumed: number;
  status: string;
}

interface UnifiedApiKey {
  api_key: string;
  user_id: string;
  key_name: string;
  status: string;
}

class SupabaseService {
  private serviceName = 'supabase';
  private url: string | null = null;
  private key: string | null = null;
  private enabled: boolean = false;

  /**
   * 获取配置值
   */
  private async getConfig(key: string): Promise<string | null> {
    try {
      const config = await ApiConfig.findOne({
        where: {
          service_name: this.serviceName,
          config_key: key,
          is_active: true
        }
      });
      return config ? config.config_value : null;
    } catch (error) {
      console.error(`获取 Supabase 配置失败 (${key}):`, error);
      return null;
    }
  }

  /**
   * 初始化配置（每次调用前检查）
   */
  private async initConfig(): Promise<boolean> {
    try {
      // 检查是否启用
      const enabledStr = await this.getConfig('enabled');
      this.enabled = enabledStr === 'true';

      if (!this.enabled) {
        return false;
      }

      // 加载URL和Key
      this.url = await this.getConfig('url');
      this.key = await this.getConfig('key');

      if (!this.url || !this.key) {
        console.warn('⚠️  Supabase 配置不完整，同步功能已禁用');
        this.enabled = false;
        return false;
      }

      return true;
    } catch (error) {
      console.error('初始化 Supabase 配置失败:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    if (!this.key) {
      throw new Error('Supabase key not initialized');
    }
    return {
      'apikey': this.key,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.key}`
    };
  }

  /**
   * 同步用户信息到 Supabase
   */
  async syncUser(userId: number, balance: number): Promise<boolean> {
    // 初始化配置
    const isConfigured = await this.initConfig();
    if (!isConfigured) {
      console.log('🔕 Supabase 同步已禁用，跳过用户同步');
      return false;
    }

    try {
      const unifiedUserId = `u_${userId}`;
      console.log(`📤 同步用户到 Supabase: ${unifiedUserId}, balance: ${balance}`);

      const userData: UnifiedUser = {
        user_id: unifiedUserId,
        balance,
        total_recharged: 0,
        total_consumed: 0,
        status: 'active'
      };

      const response = await fetch(`${this.url}/rest/v1/unified_users`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Supabase 同步用户失败: ${response.status} ${errorText}`);
        return false;
      }

      console.log(`✅ Supabase 用户同步成功: ${unifiedUserId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Supabase 同步用户失败:', error.message);
      return false;
    }
  }

  /**
   * 同步余额到 Supabase
   */
  async syncBalance(userId: number, balance: number): Promise<boolean> {
    const isConfigured = await this.initConfig();
    if (!isConfigured) {
      console.log('🔕 Supabase 同步已禁用，跳过余额同步');
      return false;
    }

    try {
      const unifiedUserId = `u_${userId}`;
      console.log(`📤 同步余额到 Supabase: ${unifiedUserId}, balance: ${balance}`);

      const response = await fetch(
        `${this.url}/rest/v1/unified_users?user_id=eq.${unifiedUserId}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ balance })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Supabase 同步余额失败: ${response.status} ${errorText}`);
        return false;
      }

      console.log(`✅ Supabase 余额同步成功: ${unifiedUserId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Supabase 同步余额失败:', error.message);
      return false;
    }
  }

  /**
   * 同步 API Key 到 Supabase
   */
  async syncApiKey(apiKey: string, userId: number, keyName: string): Promise<boolean> {
    const isConfigured = await this.initConfig();
    if (!isConfigured) {
      console.log('🔕 Supabase 同步已禁用，跳过 API Key 同步');
      return false;
    }

    try {
      const unifiedUserId = `u_${userId}`;
      console.log(`📤 同步 API Key 到 Supabase: ${apiKey}`);

      const apiKeyData: UnifiedApiKey = {
        api_key: apiKey,
        user_id: unifiedUserId,
        key_name: keyName,
        status: 'active'
      };

      const response = await fetch(`${this.url}/rest/v1/unified_api_keys`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(apiKeyData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Supabase 同步 API Key 失败: ${response.status} ${errorText}`);
        return false;
      }

      console.log(`✅ Supabase API Key 同步成功: ${apiKey}`);
      return true;
    } catch (error: any) {
      console.error('❌ Supabase 同步 API Key 失败:', error.message);
      return false;
    }
  }

  /**
   * 删除 API Key
   */
  async deleteApiKey(apiKey: string): Promise<boolean> {
    const isConfigured = await this.initConfig();
    if (!isConfigured) {
      console.log('🔕 Supabase 同步已禁用，跳过 API Key 删除');
      return false;
    }

    try {
      console.log(`📤 删除 Supabase API Key: ${apiKey}`);

      const response = await fetch(
        `${this.url}/rest/v1/unified_api_keys?api_key=eq.${apiKey}`,
        {
          method: 'DELETE',
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Supabase 删除 API Key 失败: ${response.status} ${errorText}`);
        return false;
      }

      console.log(`✅ Supabase API Key 删除成功: ${apiKey}`);
      return true;
    } catch (error: any) {
      console.error('❌ Supabase 删除 API Key 失败:', error.message);
      return false;
    }
  }

  /**
   * 查询用户余额
   */
  async getUserBalance(userId: number): Promise<number | null> {
    const isConfigured = await this.initConfig();
    if (!isConfigured) {
      return null;
    }

    try {
      const unifiedUserId = `u_${userId}`;

      const response = await fetch(
        `${this.url}/rest/v1/unified_users?user_id=eq.${unifiedUserId}&select=balance`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any[];
      if (data && data.length > 0) {
        return parseFloat(data[0].balance);
      }

      return null;
    } catch (error: any) {
      console.error('查询 Supabase 余额失败:', error.message);
      return null;
    }
  }

  /**
   * 重试机制
   */
  private async retrySync(
    syncFunc: () => Promise<boolean>,
    retryCount: number = 3
  ): Promise<boolean | null> {
    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await syncFunc();
        return result;
      } catch (error) {
        console.warn(`⚠️  同步失败，第 ${i + 1}/${retryCount} 次重试`);
        if (i === retryCount - 1) {
          console.error('❌ 同步失败，已达最大重试次数');
          return null;
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return null;
  }
}

// 导出单例（配置从数据库读取）
export default new SupabaseService();
