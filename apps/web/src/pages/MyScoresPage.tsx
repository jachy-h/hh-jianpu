import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EXAMPLES, EXAMPLE_KEYS } from '../examples';
import { SettingsModal } from '../components/Settings';
import TopBar from '../components/Layout/TopBar';
import ButtonTip from '../components/ui/ButtonTip';
import FeedbackWidget from '../components/Feedback/FeedbackWidget';
import type { MyScore } from '../services/myScores';
import { migrateScoresToFileSystem, scanScoresFromFileSystem, clearAllScores } from '../services/myScores';
import {
  getStorageLocation,
  pickStorageDirectory,
  getSavedDirectoryHandle,
  isFileSystemAccessSupported,
  abandonStorage,
  type StorageLocation,
} from '../services/storageLocation';

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MyScoresPage: React.FC = () => {
  const navigate = useNavigate();
  const { myScores, currentScoreId, loadMyScore, deleteScore, renameScore, newScore, loadExample, refreshMyScores } =
    useStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ---- 存储位置 ----
  const [storageLocation, setStorageLocation] = useState<StorageLocation>({ type: 'localStorage' });
  const [isChangingStorage, setIsChangingStorage] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // ---- 放弃存储确认弹框 ----
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState(false);
  const [abandonInput, setAbandonInput] = useState('');
  const [isAbandoning, setIsAbandoning] = useState(false);

  // ---- 挂载时刷新曲谱列表 ----
  useEffect(() => {
    const init = async () => {
      const loc = await getStorageLocation();
      setStorageLocation(loc);
      if (loc.type === 'fileSystem') {
        // 有本地目录：扫描目录文件，合并到 localStorage 后刷新列表
        await scanScoresFromFileSystem();
      }
      // 无论何种模式，均从 localStorage 刷新 store
      refreshMyScores();
    };
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 重命名 ----
  const handleRenameStart = useCallback((score: MyScore) => {
    setRenamingId(score.id);
    setRenameValue(score.title);
    setDeleteConfirmId(null);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renameScore(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, renameScore]);

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

  // ---- 删除 ----
  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
    setRenamingId(null);
  }, []);

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      deleteScore(id);
      setDeleteConfirmId(null);
    },
    [deleteScore]
  );

  // ---- 打开 ----
  const handleOpen = useCallback(
    (id: string) => {
      loadMyScore(id);
      navigate(`/edit/${id}`);
    },
    [loadMyScore, navigate]
  );

  // ---- 新建 ----
  const handleNew = useCallback(() => {
    newScore();
    navigate('/edit');
  }, [newScore, navigate]);

  // ---- 更改存储位置 ----
  const handleChangeStorage = useCallback(async () => {
    setStorageError(null);
    if (!isFileSystemAccessSupported()) {
      setStorageError('您的浏览器不支持本地文件系统访问，请使用 Chrome 86+ 或 Edge 86+ 浏览器');
      return;
    }
    setIsChangingStorage(true);
    try {
      // 加载已有句柄，让 picker 默认定位到当前目录
      const currentHandle = await getSavedDirectoryHandle();
      const location = await pickStorageDirectory(currentHandle);
      // 迁移现有数据到新目录
      await migrateScoresToFileSystem();
      setStorageLocation(location);
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') {
        // 用户主动取消，不报错
      } else if (err.message === 'NOT_SUPPORTED') {
        setStorageError('您的浏览器不支持本地文件系统访问，请使用 Chrome 86+ 或 Edge 86+ 浏览器');
      } else {
        setStorageError('更改存储位置失败，请重试');
      }
    } finally {
      setIsChangingStorage(false);
    }
  }, []);

  // ---- 放弃存储 ----
  const handleAbandonStorage = useCallback(async () => {
    if (abandonInput !== 'DELETE') return;
    setIsAbandoning(true);
    try {
      await abandonStorage();
      clearAllScores();
      setStorageLocation({ type: 'localStorage' });
      setIsAbandonDialogOpen(false);
      setAbandonInput('');
      refreshMyScores();
    } catch {
      setStorageError('放弃存储失败，请重试');
    } finally {
      setIsAbandoning(false);
    }
  }, [abandonInput, refreshMyScores]);

  // ---- 加载示例 ----
  const handleLoadExample = useCallback(
    (key: string) => {
      loadExample(key);
      navigate('/edit');
    },
    [loadExample, navigate]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        actions={
          <>
            {/* 设置（暂时禁用） */}
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline text-gray-300 cursor-not-allowed bg-white"
              title="暂不可用"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">设置</span>
            </button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

          {/* 示例曲谱区 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              示例曲谱
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXAMPLE_KEYS.map((key) => (
                <ButtonTip
                  key={key}
                  tipContent={`加载示例：${EXAMPLES[key].name}`}
                  position="top"
                  onClick={() => handleLoadExample(key)}
                  variant="ghost"
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-left w-full"
                >
                  <span className="text-base">🎵</span>
                  <span className="text-gray-700 truncate">{EXAMPLES[key].name}</span>
                </ButtonTip>
              ))}
            </div>
          </section>

          {/* 我的谱谱区 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                我的谱谱
                {myScores.length > 0 && (
                  <span className="text-xs normal-case font-normal text-gray-400">
                    共 {myScores.length} 首
                  </span>
                )}
                <button
                  onClick={handleNew}
                  className="text-xs text-blue-500 hover:text-blue-600 font-normal normal-case ml-2"
                >
                  新建曲谱
                </button>
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs text-gray-300 select-none hidden sm:inline"
                  title={
                    storageLocation.type === 'localStorage'
                      ? '数据存储在浏览器 localStorage 中'
                      : `已同步至本地目录「${storageLocation.directoryName}」\n（受浏览器安全限制，仅可显示目录名，不含完整路径）`
                  }
                >
                  {storageLocation.type === 'localStorage'
                    ? '浏览器缓存(默认)'
                    : <>
                      `📁 ${storageLocation.directoryName}`
                      <ButtonTip
                        tipContent="删除所有本地存储内容并清空存储设置（不可恢复）"
                        position="top"
                        onClick={() => { setIsAbandonDialogOpen(true); setAbandonInput(''); }}
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-gray-300 hover:text-gray-500"
                      >×</ButtonTip></>
                    }
                </span>
                <ButtonTip
                  tipContent="更改数据存储位置（需要 Chrome / Edge 86+ 支持）"
                  position="top"
                  onClick={handleChangeStorage}
                  disabled={isChangingStorage}
                  variant="nude"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isChangingStorage ? '选择中…' : '更改存储位置'}
                </ButtonTip>
              </div>
            </div>
            {storageError && (
              <div className="mb-3 px-3 py-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{storageError}</span>
                <ButtonTip
                  tipContent="关闭提示"
                  position="left"
                  onClick={() => setStorageError(null)}
                  variant="ghost"
                  className="ml-auto flex-shrink-0 text-orange-400 hover:text-orange-600"
                  aria-label="关闭"
                >
                  ✕
                </ButtonTip>
              </div>
            )}

            {myScores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-dashed border-gray-200 rounded-lg text-gray-400">
                <span className="text-4xl">🎼</span>
                <p className="text-sm">还没有保存的曲谱</p>
                <p className="text-xs">点击"新建曲谱"或在示例基础上编辑后自动保存</p>
                <ButtonTip
                  tipContent="创建新曲谱"
                  position="top"
                  onClick={handleNew}
                  variant="primary"
                  size="md"
                  className="mt-2"
                >
                  ＋ 新建曲谱
                </ButtonTip>
              </div>
            ) : (
              <ul className="space-y-2">
                {myScores.map((score) => {
                  const isActive = score.id === currentScoreId;
                  const isRenaming = renamingId === score.id;
                  const isConfirmingDelete = deleteConfirmId === score.id;

                  return (
                    <li
                      key={score.id}
                      className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-lg transition-colors ${
                        isActive
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      {/* 当前指示器 */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      />

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
                            onClick={() => handleOpen(score.id)}
                            title={score.title}
                          >
                            {score.title}
                            {isActive && (
                              <span className="ml-2 text-xs text-blue-400 font-normal">
                                上次编辑
                              </span>
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
                            <span className="text-xs text-red-500 mr-1 hidden sm:inline">
                              确认删除？
                            </span>
                            <ButtonTip
                              tipContent="确认删除"
                              position="top"
                              onClick={() => handleDeleteConfirm(score.id)}
                              variant="danger"
                              size="sm"
                            >
                              删除
                            </ButtonTip>
                            <ButtonTip
                              tipContent="取消删除"
                              position="top"
                              onClick={() => setDeleteConfirmId(null)}
                              variant="secondary"
                              size="sm"
                            >
                              取消
                            </ButtonTip>
                          </>
                        ) : (
                          <>
                            <ButtonTip
                              tipContent="重命名"
                              position="top"
                              onClick={() => handleRenameStart(score)}
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 border border-gray-200 hover:bg-gray-100"
                            >
                              重命名
                            </ButtonTip>
                            <ButtonTip
                              tipContent="删除"
                              position="top"
                              onClick={() => handleDeleteClick(score.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 border border-red-200 hover:bg-red-50"
                            >
                              删除
                            </ButtonTip>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      {/* 底部提示 */}
      {/* <footer className="px-4 py-2 border-t border-barline bg-white text-center">
        <p className="text-xs text-gray-400">
          极简动态谱
        </p>
      </footer> */}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 放弃存储确认弹框 */}
      {isAbandonDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-gray-900">放弃存储</h3>
                <p className="text-sm text-gray-500 mt-1">
                  此操作将<strong>删除本地目录中所有曲谱文件</strong>，并清除浏览器中的所有曲谱数据与存储设置。
                  <br />此操作<strong>不可恢复</strong>。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                请输入 <span className="font-mono font-bold text-red-500">DELETE</span> 以确认：
              </label>
              <input
                autoFocus
                type="text"
                value={abandonInput}
                onChange={(e) => setAbandonInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAbandonStorage(); }}
                placeholder="DELETE"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setIsAbandonDialogOpen(false); setAbandonInput(''); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleAbandonStorage()}
                disabled={abandonInput !== 'DELETE' || isAbandoning}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAbandoning ? '删除中…' : '确认放弃'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右下角悬浮反馈组件 */}
      <FeedbackWidget />
    </div>
  );
};

export default MyScoresPage;
