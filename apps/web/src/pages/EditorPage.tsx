import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Editor from '../components/Editor/Editor';
import ScoreView from '../components/ScoreView/ScoreView';
import PlayerBar from '../components/Player/PlayerBar';
import { ResizablePanels } from '../components/ResizablePanels';
import { SettingsModal } from '../components/Settings';
import { ImageImportModal, ImageImportButton } from '../components/ImageImport';
import TopBar from '../components/Layout/TopBar';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const {
    source,
    setSource,
    score,
    parseErrors,
    mode,
    setMode,
    playbackStatus,
    currentNoteIndex,
    tempo,
    isLoading,
    isAutoSaving,
    setTempo,
    play,
    pause,
    stop,
    currentScoreId,
    loadMyScore,
  } = useStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);

  // 根据路由参数加载曲谱
  useEffect(() => {
    if (id && id !== currentScoreId) {
      loadMyScore(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeToggle = useCallback(() => {
    setMode(mode === 'edit' ? 'play' : 'edit');
  }, [mode, setMode]);

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <TopBar
        backTo="/"
        backLabel="我的谱谱"
        subtitle={
          <span className="flex items-center gap-2">
            {mode === 'play' && score?.metadata.title && (
              <span className="text-sm text-played">— {score.metadata.title}</span>
            )}
            {isAutoSaving && (
              <span className="text-xs text-gray-400 animate-pulse">保存中…</span>
            )}
          </span>
        }
        actions={
          <>
            {/* 图片识别（仅编辑模式） */}
            {mode === 'edit' && (
              <ImageImportButton onClick={() => setIsImageImportOpen(true)} />
            )}

            {/* 设置 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-gray-50 transition-colors"
              title="设置"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">设置</span>
            </button>

            {/* 帮助 */}
            <button
              onClick={() => navigate('/help')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-blue-50 transition-colors text-blue-600"
              title="帮助"
            >
              <span>❓</span>
              <span className="hidden sm:inline">帮助</span>
            </button>

            {/* 模式切换 */}
            <button
              onClick={handleModeToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-gray-50 transition-colors"
            >
              {mode === 'edit' ? (
                <>
                  <span>▶</span>
                  <span>演奏模式</span>
                </>
              ) : (
                <>
                  <span>✏️</span>
                  <span>编辑模式</span>
                </>
              )}
            </button>
          </>
        }
      />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        {mode === 'edit' ? (
          /* ===== 编辑模式 ===== */
          <ResizablePanels
            left={<Editor value={source} onChange={setSource} parseErrors={parseErrors} />}
            right={
              score ? (
                <div className="h-full flex flex-col">
                  {/* 错误提示条 */}
                  {parseErrors.length > 0 && (
                    <div className="bg-error/10 border-l-4 border-error px-4 py-3 space-y-1">
                      {parseErrors.map((err, i) => (
                        <div key={i} className="text-error text-sm">
                          ⚠️ 行 {err.position.line}: {err.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 曲谱预览 */}
                  <div className="flex-1 overflow-auto">
                    <ScoreView score={score} currentNoteIndex={-1} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-played">
                  {parseErrors.length > 0 ? (
                    <div className="space-y-2">
                      {parseErrors.map((err, i) => (
                        <div key={i} className="text-error text-sm">
                          行 {err.position.line}: {err.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>输入简谱文本以预览</p>
                  )}
                </div>
              )
            }
            minLeftWidth={300}
            minRightWidth={300}
            defaultLeftWidth={50}
          />
        ) : (
          /* ===== 演奏模式 ===== */
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              {score ? (
                <ScoreView score={score} currentNoteIndex={currentNoteIndex} />
              ) : (
                <div className="flex items-center justify-center h-full text-played">
                  <p>没有可播放的曲谱，请先编辑</p>
                </div>
              )}
            </div>

            {/* 播放控制栏 */}
            <PlayerBar
              status={playbackStatus}
              tempo={tempo}
              isLoading={isLoading}
              onPlay={play}
              onPause={pause}
              onStop={stop}
              onTempoChange={setTempo}
            />
          </div>
        )}
      </main>

      {/* 设置模态框 */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 图片导入模态框 */}
      <ImageImportModal isOpen={isImageImportOpen} onClose={() => setIsImageImportOpen(false)} />
    </div>
  );
};

export default EditorPage;
