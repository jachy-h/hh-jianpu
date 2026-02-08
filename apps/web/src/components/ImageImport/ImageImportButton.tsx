/**
 * 图片导入按钮
 */

import React from 'react';
import { loadLLMConfig } from '../../services/ocr';

interface ImageImportButtonProps {
  onClick: () => void;
  className?: string;
}

export const ImageImportButton: React.FC<ImageImportButtonProps> = ({
  onClick,
  className = '',
}) => {
  const hasApiKey = !!loadLLMConfig();

  return (
    <button
      onClick={onClick}
      disabled={!hasApiKey}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm border border-barline rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title={hasApiKey ? '从图片识别简谱' : '需要先在设置中配置 API Key'}
    >
      <span>📷</span>
      <span>识别图片</span>
    </button>
  );
};
