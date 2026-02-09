/**
 * LLM API 配置管理
 * 存储在 localStorage 中
 */

import type { LLMProviderConfig, OCRError } from './types';
import { createLLMClient } from './llm-client';

const STORAGE_KEY = 'hh-jianpu-llm-config';

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

  // 创建一个 100x100 的测试图片（纯白色，满足 API 最小尺寸要求）
  // 使用 Canvas 生成
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    // 添加简单的文字以便识别
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('Test', 30, 50);
  }

  // 转换为 Base64（移除 data:image/png;base64, 前缀）
  const base64 = canvas.toDataURL('image/png').split(',')[1];

  try {
    await client.recognize({
      image: base64,
      mimeType: 'image/png',
    });
    // 如果没有抛出错误，说明连接成功
  } catch (error) {
    // 重新抛出错误
    throw error as OCRError;
  }
}
