/**
 * 图片导入按钮
 */

import React from 'react';

interface ImageImportButtonProps {
  onClick: () => void;
  className?: string;
}

// v0.7.0 暂不开放图片识别入口，保留调用方接口。
export const ImageImportButton: React.FC<ImageImportButtonProps> = () => null;
