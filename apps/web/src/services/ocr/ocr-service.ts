/**
 * OCR 服务统一入口
 * 串联预处理 → LLM 识别 → 后处理
 */

import type {
  LLMProviderConfig,
  OCRResult,
  OnProgressCallback,
  PreprocessOptions,
} from './types';
import { preprocessImage } from './preprocessor';
import { createLLMClient } from './llm-client';
import { postprocess } from './postprocessor';

/**
 * 识别图片中的简谱
 *
 * @param file - 图片文件
 * @param config - LLM 配置
 * @param onProgress - 进度回调（可选）
 * @param preprocessOptions - 预处理选项（可选）
 * @returns 识别结果
 */
export async function recognizeImage(
  file: File,
  config: LLMProviderConfig,
  onProgress?: OnProgressCallback,
  preprocessOptions?: Partial<PreprocessOptions>
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // === 阶段 1: 预处理 ===
    onProgress?.({
      status: 'preprocessing',
      message: '正在处理图片...',
      progress: 10,
    });

    const preprocessResult = await preprocessImage(file, preprocessOptions);

    // === 阶段 2: LLM 识别 ===
    onProgress?.({
      status: 'recognizing',
      message: '正在识别简谱...',
      progress: 40,
    });

    const client = createLLMClient(config);
    const llmResponse = await client.recognize({
      image: preprocessResult.base64,
      mimeType: preprocessResult.mimeType,
    });

    // === 阶段 3: 后处理 ===
    onProgress?.({
      status: 'postprocessing',
      message: '正在整理结果...',
      progress: 90,
    });

    const postprocessResult = postprocess(llmResponse.rawText);

    // === 完成 ===
    const duration = Date.now() - startTime;

    onProgress?.({
      status: 'done',
      message: '识别完成',
      progress: 100,
    });

    return {
      source: postprocessResult.source,
      warnings: postprocessResult.warnings,
      duration,
    };
  } catch (error) {
    onProgress?.({
      status: 'error',
      message: '识别失败',
    });

    throw error;
  }
}
