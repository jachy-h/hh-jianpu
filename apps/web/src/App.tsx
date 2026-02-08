import React, { useCallback, useState } from 'react';
import { useStore } from './store/useStore';
import AppLayout from './components/Layout/AppLayout';
import Editor from './components/Editor/Editor';
import ScoreView from './components/ScoreView/ScoreView';
import PlayerBar from './components/Player/PlayerBar';
import { HelpModal } from './components/HelpModal';
import { ResizablePanels } from './components/ResizablePanels';
import { SettingsModal } from './components/Settings';
import { ImageImportModal } from './components/ImageImport';

const App: React.FC = () => {
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
    setTempo,
    play,
    pause,
    stop,
    loadExample,
  } = useStore();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);

  const handleModeToggle = useCallback(() => {
    setMode(mode === 'edit' ? 'play' : 'edit');
  }, [mode, setMode]);

  const handleHelpClick = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const handleHelpClose = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleImageImportClick = useCallback(() => {
    setIsImageImportOpen(true);
  }, []);

  const handleImageImportClose = useCallback(() => {
    setIsImageImportOpen(false);
  }, []);

  return (
    <>
    <AppLayout
      mode={mode}
      title={score?.metadata.title}
      onModeToggle={handleModeToggle}
      onLoadExample={loadExample}
      onHelpClick={handleHelpClick}
      onSettingsClick={handleSettingsClick}
      onImageImportClick={handleImageImportClick}
    >
      {mode === 'edit' ? (
        /* ===== 编辑模式 ===== */
        <ResizablePanels
          left={<Editor value={source} onChange={setSource} />}
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
                  <ScoreView
                    score={score}
                    currentNoteIndex={-1}
                  />
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
              <ScoreView
                score={score}
                currentNoteIndex={currentNoteIndex}
              />
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
    </AppLayout>

    {/* 帮助模态框 */}
    <HelpModal isOpen={isHelpOpen} onClose={handleHelpClose} />

    {/* 设置模态框 */}
    <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />

    {/* 图片导入模态框 */}
    <ImageImportModal isOpen={isImageImportOpen} onClose={handleImageImportClose} />
    </>
  );
};

export default App;
