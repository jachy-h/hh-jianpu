import React, { useEffect, useRef, useState } from 'react';
import ButtonTip from '../ui/ButtonTip';

interface ScoreImportModalProps {
  readonly onClose: () => void;
  readonly onImport: (file: File) => Promise<void>;
}

/** 文件选择和拖放共用导入流程，原生 dialog 负责焦点约束与 Escape 关闭。 */
export const ScoreImportModal: React.FC<ScoreImportModalProps> = ({ onClose, onImport }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (importingRef.current || !files?.length) return;
    setError(null);
    if (files.length !== 1) {
      setError('请一次导入一个文件；备份文件可包含多首曲谱。');
      return;
    }
    const file = files[0];
    if (!/\.jsonc?$/i.test(file.name)) {
      setError('请选择 JSON 或 JSONC 曲谱文件。');
      return;
    }
    importingRef.current = true;
    setIsImporting(true);
    try {
      await onImport(file);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '曲谱导入失败，请重试。');
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="score-import-title" aria-describedby="score-import-description"
      onCancel={(event) => { event.preventDefault(); if (!importingRef.current) onClose(); }}
      onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}
      className="w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-barline bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/40">
      <div className="flex items-start justify-between gap-4 border-b border-barline px-6 py-5">
        <div>
          <h2 id="score-import-title" className="text-lg font-semibold">导入曲谱</h2>
          <p id="score-import-description" className="mt-1 text-sm text-played">支持单首曲谱和曲谱库备份，JSON / JSONC 格式。</p>
        </div>
        <button type="button" onClick={onClose} disabled={isImporting} aria-label="关闭导入曲谱"
          className="rounded px-2 py-1 text-played hover:bg-stone-100 hover:text-ink disabled:opacity-40">✕</button>
      </div>
      <div className="p-6" aria-busy={isImporting}>
        <div onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
          className={`flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${isDragging ? 'border-highlight bg-blue-50' : 'border-barline bg-stone-50/60'}`}>
          <svg aria-hidden="true" className="mb-4 h-9 w-9 text-played" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
          </svg>
          <p className="font-medium" role="status">{isImporting ? '正在导入曲谱…' : isDragging ? '松开即可导入' : '将曲谱文件拖到这里'}</p>
          <p className="mb-5 mt-1 text-xs text-played">或从设备中选择一个文件</p>
          <ButtonTip type="button" tipContent="选择 JSON 或 JSONC 文件" variant="primary" disabled={isImporting}
            onClick={() => inputRef.current?.click()}>选择文件</ButtonTip>
          <input ref={inputRef} type="file" accept=".json,.jsonc,application/json" aria-label="选择曲谱文件" className="hidden"
            onChange={(event) => { void handleFiles(event.target.files); event.target.value = ''; }} />
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">{error}</p>}
      </div>
      <div className="flex justify-end border-t border-barline px-6 py-4">
        <ButtonTip type="button" tipContent="关闭导入窗口" variant="ghost" disabled={isImporting} onClick={onClose}>取消</ButtonTip>
      </div>
    </dialog>
  );
};
