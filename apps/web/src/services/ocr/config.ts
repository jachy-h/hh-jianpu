/**
 * LLM API 配置管理
 * 存储在 localStorage 中
 */

import type { LLMProviderConfig, OCRError } from './types';
import { createLLMClient } from './llm-client';

const STORAGE_KEY = 'as-nmn-llm-config';

/**
 * 保存 LLM 配置
 */
export function saveLLMConfig(config: LLMProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save LLM config:', error);
  }
}

/**
 * 加载 LLM 配置
 */
export function loadLLMConfig(): LLMProviderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LLMProviderConfig;
  } catch (error) {
    console.error('Failed to load LLM config:', error);
    return null;
  }
}

/**
 * 清除 LLM 配置
 */
export function clearLLMConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear LLM config:', error);
  }
}

/**
 * 测试 LLM 连接
 * 发送一个简单的请求验证 API Key 是否有效
 */
export async function testLLMConnection(config: LLMProviderConfig): Promise<void> {
  const client = createLLMClient(config);

  // 创建一个 1x1 的测试图片（白色像素）
  const testImage =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  try {
    await client.recognize({
      image: testImage,
      mimeType: 'image/png',
    });
    // 如果没有抛出错误，说明连接成功
  } catch (error) {
    // 重新抛出错误
    throw error as OCRError;
  }
}
