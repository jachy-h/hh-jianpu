/**
 * 图片预览组件
 */

import React from 'react';

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = React.useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="relative border-2 border-barline rounded-lg overflow-hidden bg-gray-50">
      {/* 图片 */}
      <img
        src={previewUrl}
        alt="预览"
        className="w-full h-auto max-h-64 object-contain"
      />

      {/* 信息栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white px-3 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{file.name}</div>
            <div className="text-xs opacity-90">{fileSizeMB} MB</div>
          </div>
          <button
            onClick={onRemove}
            className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs transition-colors"
            aria-label="移除图片"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  );
};
