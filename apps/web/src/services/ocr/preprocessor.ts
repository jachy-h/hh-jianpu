/**
 * 图片预处理模块
 * 功能：校验、压缩、转换为 Base64
 */

import type { PreprocessOptions, PreprocessResult, OCRError } from './types';

/** 默认预处理配置 */
export const DEFAULT_PREPROCESS_OPTIONS: PreprocessOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

/** 支持的图片格式 */
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * 校验图片文件
 */
export function validateImage(file: File): OCRError | null {
  // 检查文件类型
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      code: 'INVALID_IMAGE',
      message: `不支持的图片格式，请使用 JPG、PNG 或 WebP 格式`,
    };
  }

  // 检查文件大小
  if (file.size > DEFAULT_PREPROCESS_OPTIONS.maxFileSize) {
    const maxSizeMB = DEFAULT_PREPROCESS_OPTIONS.maxFileSize / (1024 * 1024);
    return {
      code: 'FILE_TOO_LARGE',
      message: `图片文件过大（${(file.size / (1024 * 1024)).toFixed(1)}MB），请上传小于 ${maxSizeMB}MB 的图片`,
    };
  }

  return null;
}

/**
 * 预处理图片
 * 1. 读取图片
 * 2. 等比缩放到指定尺寸
 * 3. 转换为 JPEG Base64
 */
export async function preprocessImage(
  file: File,
  options: Partial<PreprocessOptions> = {}
): Promise<PreprocessResult> {
  const config = { ...DEFAULT_PREPROCESS_OPTIONS, ...options };

  // 先校验
  const error = validateImage(file);
  if (error) {
    throw error;
  }

  // 读取图片
  const img = await loadImage(file);

  // 计算缩放后的尺寸
  const originalSize = { width: img.width, height: img.height };
  const processedSize = calculateResizedDimensions(
    img.width,
    img.height,
    config.maxWidth,
    config.maxHeight
  );

  // 使用 Canvas 进行缩放和格式转换
  const canvas = document.createElement('canvas');
  canvas.width = processedSize.width;
  canvas.height = processedSize.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw {
      code: 'API_ERROR',
      message: '无法创建 Canvas 上下文',
    } as OCRError;
  }

  // 绘制图片（自动缩放）
  ctx.drawImage(img, 0, 0, processedSize.width, processedSize.height);

  // 转换为 JPEG Base64（减小体积）
  const base64 = canvas.toDataURL('image/jpeg', config.quality);

  // 移除 "data:image/jpeg;base64," 前缀
  const base64Data = base64.split(',')[1];

  return {
    base64: base64Data,
    mimeType: 'image/jpeg',
    originalSize,
    processedSize,
  };
}

/**
 * 加载图片到 HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject({
        code: 'INVALID_IMAGE',
        message: '无法加载图片，请确认文件格式正确',
      } as OCRError);
    };

    img.src = url;
  });
}

/**
 * 计算等比缩放后的尺寸
 */
function calculateResizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // 如果图片尺寸已经小于限制，不缩放
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  // 计算缩放比例
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  // 等比缩放
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}
