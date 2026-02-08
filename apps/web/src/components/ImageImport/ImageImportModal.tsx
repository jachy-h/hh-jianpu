/**
 * 图片导入面板
 */

import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { ImagePreview } from './ImagePreview';
import { RecognitionResult } from './RecognitionResult';
import { validateImage } from '../../services/ocr';

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageImportModal: React.FC<ImageImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { ocrStatus, ocrResult, ocrError, recognizeImage, applyOCRResult, clearOCRState } =
    useStore();

  // 重置状态
  const resetState = () => {
    setSelectedFile(null);
    clearOCRState();
  };

  // 关闭面板
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 文件选择
  const handleFileSelect = (file: File) => {
    const error = validateImage(file);
    if (error) {
      alert(error.message);
      return;
    }
    setSelectedFile(file);
    clearOCRState();
  };

  // 点击选择文件
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 拖拽处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 开始识别
  const handleRecognize = async () => {
    if (!selectedFile) return;
    await recognizeImage(selectedFile);
  };

  // 应用结果
  const handleApply = (mode: 'replace' | 'append') => {
    applyOCRResult(mode);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-paper w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-paper border-b border-barline px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">📷 从图片识别简谱</h2>
            <button
              onClick={handleClose}
              className="text-played hover:text-ink transition-colors"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-6">
          {/* 未识别时：上传区域 */}
          {!ocrResult && ocrStatus !== 'done' && (
            <div className="space-y-4">
              {/* 拖拽上传区域 */}
              {!selectedFile && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-highlight bg-blue-50'
                      : 'border-barline hover:border-highlight hover:bg-gray-50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="text-6xl">📷</div>
                    <div>
                      <p className="text-lg font-medium text-ink">
                        拖拽图片到此处或点击选择文件
                      </p>
                      <p className="text-sm text-played mt-2">
                        支持 JPG、PNG、WebP 格式，最大 10MB
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* 图片预览 */}
              {selectedFile && (
                <ImagePreview file={selectedFile} onRemove={() => setSelectedFile(null)} />
              )}

              {/* 识别中状态 */}
              {(ocrStatus === 'preprocessing' ||
                ocrStatus === 'recognizing' ||
                ocrStatus === 'postprocessing') && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-highlight mb-4"></div>
                  <p className="text-lg font-medium text-ink">
                    {ocrStatus === 'preprocessing' && '正在处理图片...'}
                    {ocrStatus === 'recognizing' && '正在识别简谱...'}
                    {ocrStatus === 'postprocessing' && '正在整理结果...'}
                  </p>
                  <p className="text-sm text-played mt-2">请稍候，这可能需要 10-30 秒</p>
                </div>
              )}

              {/* 错误提示 */}
              {ocrError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm font-medium text-red-800">❌ {ocrError.message}</p>
                </div>
              )}
            </div>
          )}

          {/* 已识别：显示结果 */}
          {ocrResult && ocrStatus === 'done' && (
            <RecognitionResult
              result={ocrResult}
              onApply={handleApply}
              onCancel={handleClose}
            />
          )}
        </div>

        {/* 底部操作栏（仅在未识别时显示） */}
        {!ocrResult && ocrStatus !== 'done' && (
          <div className="sticky bottom-0 bg-paper border-t border-barline px-6 py-4 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-barline text-ink rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleRecognize}
              disabled={
                !selectedFile ||
                ocrStatus === 'preprocessing' ||
                ocrStatus === 'recognizing' ||
                ocrStatus === 'postprocessing'
              }
              className="px-4 py-2 bg-highlight text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              开始识别
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
