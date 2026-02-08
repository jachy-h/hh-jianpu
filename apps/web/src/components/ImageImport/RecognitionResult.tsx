/**
 * 识别结果展示组件
 */

import React from 'react';
import type { OCRResult, ImportMode } from '../../services/ocr';

interface RecognitionResultProps {
  result: OCRResult;
  onApply: (mode: ImportMode) => void;
  onCancel: () => void;
}

export const RecognitionResult: React.FC<RecognitionResultProps> = ({
  result,
  onApply,
  onCancel,
}) => {
  return (
    <div className="space-y-4">
      {/* 成功标题 */}
      <div className="flex items-center gap-2 text-green-600">
        <span className="text-2xl">✅</span>
        <h3 className="text-lg font-semibold">识别完成</h3>
      </div>

      {/* 识别结果预览 */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">识别结果：</label>
        <textarea
          value={result.source}
          readOnly
          className="w-full h-64 px-3 py-2 border border-barline rounded-md bg-gray-50 text-ink font-mono text-sm resize-none focus:outline-none"
        />
      </div>

      {/* 统计信息 */}
      <div className="text-sm text-played">
        <p>
          识别耗时: <span className="font-medium">{(result.duration / 1000).toFixed(1)}秒</span>
        </p>
        <p>
          内容长度: <span className="font-medium">{result.source.length}字符</span>
        </p>
      </div>

      {/* 警告信息 */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ 注意事项：</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {result.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          💡 请在编辑器中检查并修正识别结果。识别准确率受图片质量影响。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-barline text-ink rounded-md hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onApply('append')}
          className="px-4 py-2 border border-highlight text-highlight rounded-md hover:bg-blue-50 transition-colors"
        >
          追加到末尾
        </button>
        <button
          onClick={() => onApply('replace')}
          className="px-4 py-2 bg-highlight text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          替换内容
        </button>
      </div>
    </div>
  );
};
