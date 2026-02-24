import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EXAMPLES, EXAMPLE_KEYS } from '../examples';
import { SettingsModal } from '../components/Settings';
import TopBar from '../components/Layout/TopBar';
import type { MyScore } from '../services/myScores';

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MyScoresPage: React.FC = () => {
  const navigate = useNavigate();
  const { myScores, currentScoreId, loadMyScore, deleteScore, renameScore, newScore, loadExample } =
    useStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
            {/* 设置 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-gray-50 bg-white transition-colors"
              title="设置"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">设置</span>
            </button>

            {/* 帮助 */}
            <button
              onClick={() => navigate('/help')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline bg-white hover:bg-blue-50 transition-colors text-blue-600"
              title="帮助"
            >
              <span>❓</span>
              <span className="hidden sm:inline">帮助</span>
            </button>

            {/* 新建 */}
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <span>＋</span>
              <span>新建曲谱</span>
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
                <button
                  key={key}
                  onClick={() => handleLoadExample(key)}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-left"
                >
                  <span className="text-base">🎵</span>
                  <span className="text-gray-700 truncate">{EXAMPLES[key].name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 我的谱谱区 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              我的谱谱
              {myScores.length > 0 && (
                <span className="ml-2 text-xs normal-case font-normal text-gray-400">
                  共 {myScores.length} 首
                </span>
              )}
            </h2>

            {myScores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-dashed border-gray-200 rounded-lg text-gray-400">
                <span className="text-4xl">🎼</span>
                <p className="text-sm">还没有保存的曲谱</p>
                <p className="text-xs">点击"新建曲谱"或在示例基础上编辑后自动保存</p>
                <button
                  onClick={handleNew}
                  className="mt-2 px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ＋ 新建曲谱
                </button>
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
                              onClick={() => handleOpen(score.id)}
                              className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                            >
                              打开
                            </button>
                            <button
                              onClick={() => handleRenameStart(score)}
                              className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            >
                              重命名
                            </button>
                            <button
                              onClick={() => handleDeleteClick(score.id)}
                              className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
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
          </section>
        </div>
      </main>

      {/* 底部提示 */}
      <footer className="px-4 py-2 border-t border-barline bg-white text-center">
        <p className="text-xs text-gray-400">
          💡 编辑内容 300ms 后自动保存 · 加载示例后编辑会自动另存为新谱
        </p>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default MyScoresPage;
