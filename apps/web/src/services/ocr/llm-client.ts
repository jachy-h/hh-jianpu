/**
 * LLM API 客户端
 * 支持 OpenAI、Anthropic 和兼容 API
 */

import type { LLMProviderConfig, LLMRequest, LLMResponse, OCRError } from './types';

/** API 请求超时时间（毫秒） */
// const API_TIMEOUT = 30000; // 30秒
const API_TIMEOUT = 0; // 暂时禁用超时，用于测试实际响应时间

/** 简谱识别 Prompt */
const RECOGNITION_PROMPT = `你是一个简谱识别专家。请分析图片中的简谱（数字简谱/jianpu），将其转换为以下文本格式。

格式规则：
- 第一行：标题: <歌曲名> （如果图片中有）
- 第二行：调号: <调号> （如 C, D, G 等，看图片中 1=? 的标注）
- 第三行：拍号: <拍号> （如 4/4, 3/4 等）
- 第四行：速度: <BPM> （如果有标注，否则默认 120）
- 空一行后输出音符

音符规则：
- 数字 1-7 表示 do-si
- 0 表示休止符
- - 表示延长前一个音符一拍（使用英文减号，不是中文·）
- | 表示小节线
- ' 在数字后面表示高八度（如 1' 表示高音 do）
- , 在数字后面表示低八度（如 1, 表示低音 do）
- / 在数字后面表示减半时値（如 1/ 表示八分音符）
- # 在数字前面表示升半音
- b 在数字前面表示降半音
- 音符之间用空格分隔

节拍要求（重要）：
- 严格按照拍号分配时值：4/4拍每小节4拍，3/4拍每小节3拍，2/4拍每小节2拍
- 四分音符=1拍，二分音符=2拍，八分音符=0.5拍，全音符=4拍
- 每个小节的总时值必须与拍号匹配
- 延长音(-)占用额外时值，如 1 - 共占2拍
- 若时值不够，可使用休止符0或延长音-补齐
- 若时值过多，检查是否有八分音符需要加减时线/

歌词规则（如果图片中有歌词）：
- 使用 Q 标记旋律行（可选）：Q 1 2 3 4 |
- 使用 C 标记歌词行：C 一 闪 一 闪
- 一个汉字对应一个音符（不包括休止符0和延长线-）
- 旋律中的 - 表示延长前一音符，不需要对应新的歌词
- 多字对应一个音符用括号：C (我的) 祖 国
- 空白歌词用短横线占位：C - 星 - 光
- 没有歌词的音符用下划线占位：C 星 _ _ 光

其他信息（如果图片中有作曲、作词、备注等）：
- 使用 --- 包裹其他信息
- 格式：
---
作曲: <作曲人>
作词: <作词人>
备注: <其他说明>
---

注意：
- 只输出格式化后的文本，不要添加任何解释
- 延长音必须使用英文句号下方的减号"-"，不要使用中文圆点"·"
- 严格检查每小节节拍是否正确：4/4拍=4拍，3/4拍=3拍，2/4拍=2拍
- 如果某个音符不确定，用 ? 标记
- 保持原谱的小节划分
- 每行一个乐句或合理分行
- 如果没有歌词，不要添加 C 行
- 如果没有其他信息，不要添加 --- 区域

示例输出1（带歌词和其他信息）：
标题: 小星星
调号: C
拍号: 4/4
速度: 120

---
作曲: 莫扎特
作词: Jane Taylor
---

Q 1 1 5 5 | 6 6 5 - |
C 一 闪 一 闪 亮 晶 晶

Q 4 4 3 3 | 2 2 1 - |
C 满 天 都 是 小 星 星

示例输出2（仅音符）：
标题: 练习曲
调号: C
拍号: 4/4
速度: 120

1 2 3 4 | 5 6 7 1' |`;

/**
 * 创建 LLM 客户端
 */
export function createLLMClient(config: LLMProviderConfig) {
  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config);
    case 'anthropic':
      return new AnthropicClient(config);
    case 'compatible':
      return new CompatibleClient(config);
    default:
      throw {
        code: 'API_ERROR',
        message: `不支持的 LLM 服务商: ${config.provider}`,
      } as OCRError;
  }
}

/**
 * LLM 客户端基类
 */
abstract class BaseLLMClient {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  /**
   * 识别图片中的简谱
   */
  async recognize(request: LLMRequest): Promise<LLMResponse> {
    // 暂时禁用超时控制，用于测试实际响应时间
    const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await this.makeRequest(request, controller.signal);
      // clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  /**
   * 发送 API 请求（由子类实现）
   */
  protected abstract makeRequest(
    request: LLMRequest,
    signal: AbortSignal
  ): Promise<LLMResponse>;

  /**
   * 统一错误处理
   */
  protected handleError(error: unknown): OCRError {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { code: 'TIMEOUT', message: '识别超时（30秒），请重试或使用更清晰的图片' };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络后重试' };
    }

    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401) {
        return { code: 'INVALID_API_KEY', message: 'API Key 无效，请检查设置' };
      }
      if (status === 429) {
        return { code: 'API_ERROR', message: 'API 调用频率限制，请稍后重试' };
      }
      if (status === 403) {
        return { code: 'INVALID_API_KEY', message: 'API Key 权限不足或已过期' };
      }
    }

    return { code: 'API_ERROR', message: '识别失败，请重试' };
  }
}

/**
 * OpenAI 客户端
 */
class OpenAIClient extends BaseLLMClient {
  protected async makeRequest(
    request: LLMRequest,
    signal: AbortSignal
  ): Promise<LLMResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const model = this.config.model || 'gpt-4o';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: RECOGNITION_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${request.mimeType};base64,${request.image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
      signal,
    });

    if (!response.ok) {
      throw { status: response.status };
    }

    const data = await response.json();

    return {
      rawText: data.choices[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

/**
 * Anthropic 客户端
 */
class AnthropicClient extends BaseLLMClient {
  protected async makeRequest(
    request: LLMRequest,
    signal: AbortSignal
  ): Promise<LLMResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const model = this.config.model || 'claude-3-5-sonnet-20241022';

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: request.mimeType,
                  data: request.image,
                },
              },
              {
                type: 'text',
                text: RECOGNITION_PROMPT,
              },
            ],
          },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      throw { status: response.status };
    }

    const data = await response.json();

    return {
      rawText: data.content[0]?.text || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
          }
        : undefined,
    };
  }
}

/**
 * 兼容 API 客户端（使用 OpenAI 格式）
 */
class CompatibleClient extends OpenAIClient {
  // 继承 OpenAI 客户端，只是使用自定义的 baseUrl
}
