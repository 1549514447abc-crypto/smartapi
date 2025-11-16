import axios, { AxiosError } from 'axios';
import ApiConfig from '../models/ApiConfig';
import ApiCallLog from '../models/ApiCallLog';

/**
 * 豆包LLM响应接口
 */
export interface DoubaoLlmResponse {
  id?: string;
  choices?: Array<{
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
  };
}

/**
 * 文本纠错结果
 */
export interface CorrectionResult {
  originalText: string;
  correctedText: string;
  changed: boolean;
  totalTokens: number;
}

/**
 * 豆包大模型服务
 */
class DoubaoLlmService {
  private serviceName = 'doubao_llm';
  private MAX_CHUNK_SIZE = 4500; // 单次处理最大字符数（留出余量）

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
        token_type: 'bearer',
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
   * 在句子边界分割长文本
   * 优先在中文句号、感叹号、问号处分割
   */
  private splitTextAtSentences(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // 句子分隔符（优先级从高到低）
    const sentenceEnds = ['。', '！', '？', '；', '，'];

    // 按字符遍历
    for (let i = 0; i < text.length; i++) {
      currentChunk += text[i];

      // 如果达到最大长度
      if (currentChunk.length >= maxChunkSize) {
        // 尝试在最近的句子边界分割
        let splitIndex = -1;

        for (const separator of sentenceEnds) {
          const lastIndex = currentChunk.lastIndexOf(separator);
          if (lastIndex > maxChunkSize * 0.7) { // 至少保证70%的利用率
            splitIndex = lastIndex + 1;
            break;
          }
        }

        if (splitIndex > 0) {
          // 在句子边界分割
          chunks.push(currentChunk.substring(0, splitIndex));
          currentChunk = currentChunk.substring(splitIndex);
        } else {
          // 如果找不到合适的分割点，强制分割
          chunks.push(currentChunk);
          currentChunk = '';
        }
      }
    }

    // 添加最后一块
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * 调用豆包API进行单次文本纠错
   */
  private async correctTextChunk(text: string, userId?: number): Promise<{
    correctedText: string;
    tokens: number;
  }> {
    const startTime = Date.now();

    // 获取配置
    const bearerToken = await this.getConfig('bearer_token');
    const model = await this.getConfig('model') || 'doubao-1-5-pro-32k-250115';
    const systemPrompt = await this.getConfig('system_prompt') || '你是一位专业的文本纠错助手，负责纠正视频转文字中的错别字。';
    const apiEndpoint = await this.getConfig('api_endpoint') ||
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

    if (!bearerToken) {
      throw new Error('Doubao Bearer Token not configured');
    }

    const requestParams = {
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ]
    };

    try {
      const response = await axios.post<DoubaoLlmResponse>(
        apiEndpoint,
        requestParams,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60秒超时
        }
      );

      const duration = Date.now() - startTime;

      // 记录成功的API调用
      await this.logApiCall({
        userId,
        requestUrl: apiEndpoint,
        requestParams,
        responseCode: response.status,
        responseData: response.data,
        callDuration: duration
      });

      // 检查响应
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const correctedText = response.data.choices?.[0]?.message?.content || text;
      const tokens = response.data.usage?.total_tokens || 0;

      return {
        correctedText,
        tokens
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof AxiosError
        ? error.response?.data?.error?.message || error.message
        : error instanceof Error
        ? error.message
        : 'Unknown error';

      // 记录失败的API调用
      await this.logApiCall({
        userId,
        requestUrl: apiEndpoint,
        requestParams,
        errorMessage,
        callDuration: duration
      });

      console.error('❌ Text correction error:', errorMessage);
      throw new Error(`Text correction failed: ${errorMessage}`);
    }
  }

  /**
   * 文本纠错（支持长文本自动分割）
   */
  async correctText(text: string, userId?: number): Promise<CorrectionResult> {
    console.log(`📝 Starting text correction: ${text.length} characters`);

    // 如果文本为空，直接返回
    if (!text || text.trim().length === 0) {
      return {
        originalText: text,
        correctedText: text,
        changed: false,
        totalTokens: 0
      };
    }

    try {
      // 如果文本超过最大长度，需要分割
      if (text.length > this.MAX_CHUNK_SIZE) {
        console.log(`⚠️  Text too long (${text.length} chars), splitting into chunks...`);

        const chunks = this.splitTextAtSentences(text, this.MAX_CHUNK_SIZE);
        console.log(`✂️  Split into ${chunks.length} chunks`);

        const correctedChunks: string[] = [];
        let totalTokens = 0;

        // 逐块处理
        for (let i = 0; i < chunks.length; i++) {
          console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

          const { correctedText, tokens } = await this.correctTextChunk(chunks[i], userId);
          correctedChunks.push(correctedText);
          totalTokens += tokens;

          // 添加延迟避免API限流（每次请求间隔200ms）
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        const finalText = correctedChunks.join('');
        const changed = finalText !== text;

        console.log(`✅ Text correction completed: ${chunks.length} chunks, ${totalTokens} tokens, changed: ${changed}`);

        return {
          originalText: text,
          correctedText: finalText,
          changed,
          totalTokens
        };

      } else {
        // 文本长度在限制内，直接处理
        const { correctedText, tokens } = await this.correctTextChunk(text, userId);
        const changed = correctedText !== text;

        console.log(`✅ Text correction completed: ${tokens} tokens, changed: ${changed}`);

        return {
          originalText: text,
          correctedText,
          changed,
          totalTokens: tokens
        };
      }

    } catch (error) {
      console.error('Text correction error:', error);
      throw error;
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
    total_tokens: number;
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

    // 计算总token数（从response_data中提取）
    let totalTokens = 0;
    logs.forEach(log => {
      if (log.response_data) {
        const data = log.response_data as any;
        totalTokens += data.usage?.total_tokens || 0;
      }
    });

    return {
      total_calls: total,
      success_calls: success,
      failed_calls: failed,
      avg_duration: Math.round(avgDuration),
      total_tokens: totalTokens
    };
  }
}

export default new DoubaoLlmService();
