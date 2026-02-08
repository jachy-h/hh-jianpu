/**
 * OCR 服务类型定义
 */

/** OCR 处理状态 */
export type OCRStatus =
  | 'idle' // 空闲
  | 'preprocessing' // 预处理中
  | 'recognizing' // 识别中
  | 'postprocessing' // 后处理中
  | 'done' // 完成
  | 'error'; // 错误

/** OCR 处理结果 */
export interface OCRResult {
  /** 识别出的简谱源码 */
  source: string;
  /** 处理警告 */
  warnings: string[];
  /** 处理耗时（毫秒） */
  duration: number;
}

/** OCR 错误 */
export interface OCRError {
  code:
    | 'INVALID_IMAGE' // 无效图片
    | 'FILE_TOO_LARGE' // 文件过大
    | 'API_ERROR' // API 错误
    | 'NETWORK_ERROR' // 网络错误
    | 'TIMEOUT' // 超时
    | 'INVALID_API_KEY' // API Key 无效
    | 'NO_CONTENT'; // 未检测到简谱内容
  message: string;
}

/** LLM 服务商配置 */
export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'compatible';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** 导入模式 */
export type ImportMode = 'replace' | 'append';

// ===== 预处理相关 =====

/** 预处理选项 */
export interface PreprocessOptions {
  /** 最大宽度（像素），超过则等比缩放 */
  maxWidth: number;
  /** 最大高度（像素），超过则等比缩放 */
  maxHeight: number;
  /** JPEG 压缩质量 (0-1) */
  quality: number;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

/** 预处理结果 */
export interface PreprocessResult {
  /** Base64 编码的图片数据 */
  base64: string;
  /** MIME 类型 */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 原始尺寸 */
  originalSize: { width: number; height: number };
  /** 处理后尺寸 */
  processedSize: { width: number; height: number };
}

// ===== LLM 客户端相关 =====

/** LLM 请求 */
export interface LLMRequest {
  image: string; // Base64
  mimeType: string;
}

/** LLM 响应 */
export interface LLMResponse {
  /** LLM 返回的原始文本 */
  rawText: string;
  /** 使用的 token 数量（如果 API 返回） */
  usage?: { promptTokens: number; completionTokens: number };
}

// ===== 后处理相关 =====

/** 后处理结果 */
export interface PostprocessResult {
  /** 处理后的简谱源码 */
  source: string;
  /** 识别警告（如发现的不确定内容） */
  warnings: string[];
}

// ===== 进度回调 =====

/** 处理进度信息 */
export interface OCRProgress {
  status: OCRStatus;
  message: string;
  /** 进度百分比 (0-100) */
  progress?: number;
}

/** 进度回调函数 */
export type OnProgressCallback = (progress: OCRProgress) => void;
