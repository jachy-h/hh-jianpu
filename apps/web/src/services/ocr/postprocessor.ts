/**
 * LLM 输出后处理模块
 * 功能：清洗和规范化 LLM 返回的文本
 */

import { parse } from '@as-nmn/core';
import type { PostprocessResult } from './types';

/**
 * 后处理 LLM 输出
 */
export function postprocess(rawText: string): PostprocessResult {
  const warnings: string[] = [];

  // 1. 去除 markdown 代码块标记
  let text = rawText.trim();
  text = text.replace(/```[a-z]*\n?/gi, '');
  text = text.replace(/```\n?/g, '');

  // 2. 去除多余的解释性文字（保留格式化的简谱内容）
  // 通常 LLM 会在开头或结尾添加解释，但格式化的简谱应该以"标题:"或数字开始
  const lines = text.split('\n');
  const startIndex = lines.findIndex(
    (line) =>
      line.trim().startsWith('标题:') ||
      line.trim().startsWith('调号:') ||
      /^[0-7\|\-\s#b'._P]+$/.test(line.trim())
  );

  if (startIndex > 0) {
    // 移除开头的解释文字
    text = lines.slice(startIndex).join('\n');
  }

  // 3. 规范化空格和换行
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  // 4. 检查是否包含不确定标记
  if (text.includes('?')) {
    warnings.push('识别结果中包含不确定的音符（标记为 ?），请手动修正');
  }

  // 5. 尝试解析验证
  try {
    const parseResult = parse(text);
    if (parseResult.errors.length > 0) {
      warnings.push(`解析时发现 ${parseResult.errors.length} 个错误，可能需要手动调整`);
    }
  } catch (error) {
    warnings.push('识别结果无法被解析器解析，请检查格式');
  }

  // 6. 检查是否为空
  if (!text || text.length < 10) {
    warnings.push('识别结果过短，可能未检测到有效内容');
  }

  return {
    source: text,
    warnings,
  };
}
