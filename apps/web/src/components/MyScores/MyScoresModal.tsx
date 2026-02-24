import React, { useState, useCallback } from 'react';
import type { MyScore } from '../../services/myScores';

interface MyScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  myScores: MyScore[];
  currentScoreId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNew: () => void;
}

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const MyScoresModal: React.FC<MyScoresModalProps> = ({
  isOpen,
  onClose,
  myScores,
  currentScoreId,
  onOpen,
  onDelete,
  onRename,
  onNew,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleRenameStart = useCallback((score: MyScore) => {
    setRenamingId(score.id);
    setRenameValue(score.title);
    setDeleteConfirmId(null);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleRenameConfirm();
      if (e.key === 'Escape') {
        setRenamingId(null);
        setRenameValue('');
      }
    },
    [handleRenameConfirm]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
    setRenamingId(null);
  }, []);

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      onDelete(id);
      setDeleteConfirmId(null);
    },
    [onDelete]
  );

  const handleOpenScore = useCallback(
    (id: string) => {
      onOpen(id);
      onClose();
    },
    [onOpen, onClose]
  );

  const handleNew = useCallback(() => {
    onNew();
    onClose();
  }, [onNew, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">🎼 我的谱谱</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>＋</span>
              <span>新建曲谱</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {myScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <span className="text-4xl">🎵</span>
              <p className="text-sm">还没有保存的曲谱</p>
              <p className="text-xs">编辑区域输入内容后会自动保存</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {myScores.map((score) => {
                const isActive = score.id === currentScoreId;
                const isRenaming = renamingId === score.id;
                const isConfirmingDelete = deleteConfirmId === score.id;

                return (
                  <li
                    key={score.id}
                    className={`flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* 当前编辑指示器 */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />

                    {/* 标题区域 */}
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={handleRenameConfirm}
                          onKeyDown={handleRenameKeyDown}
                          className="w-full border border-blue-400 rounded px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      ) : (
                        <p
                          className="text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-blue-600"
                          onClick={() => handleOpenScore(score.id)}
                          title={score.title}
                        >
                          {score.title}
                          {isActive && (
                            <span className="ml-2 text-xs text-blue-500 font-normal">编辑中</span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        更新于 {formatTime(score.updatedAt)}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isConfirmingDelete ? (
                        <>
                          <span className="text-xs text-red-500 mr-1">确认删除？</span>
                          <button
                            onClick={() => handleDeleteConfirm(score.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            删除
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenScore(score.id)}
                            className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                            title="打开编辑"
                          >
                            打开
                          </button>
                          <button
                            onClick={() => handleRenameStart(score)}
                            className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            title="重命名"
                          >
                            重命名
                          </button>
                          <button
                            onClick={() => handleDeleteClick(score.id)}
                            className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            💡 编辑区域内容变化后将自动保存 · 加载示例后编辑会自动另存为新谱
          </p>
        </div>
      </div>
    </div>
  );
};
