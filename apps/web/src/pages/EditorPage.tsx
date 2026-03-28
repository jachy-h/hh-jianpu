import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Editor from '../components/Editor/Editor';
import ScoreView from '../components/ScoreView/ScoreView';
import PlayerBar from '../components/Player/PlayerBar';
import Metronome from '../components/Player/Metronome';
import { ResizablePanels } from '../components/ResizablePanels';
import { SettingsModal } from '../components/Settings';
import { ImageImportModal, ImageImportButton } from '../components/ImageImport';
import TopBar from '../components/Layout/TopBar';
import FeedbackWidget from '../components/Feedback/FeedbackWidget';

/** 处理空格键播放/暂停/取消倒计时 */
function useKeyboardShortcut(
  playButtonRef: React.RefObject<HTMLButtonElement>,
  onPlay: () => void,
  onPause: () => void,
  status: 'idle' | 'playing' | 'paused',
  isMetronomeActive: boolean,
  isEditorFocused: boolean
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 空格键响应播放/暂停
      if (e.code !== 'Space') return;
      
      // 编辑器聚焦时不响应空格键（避免与编辑冲突）
      if (isEditorFocused) return;

      e.preventDefault();
      if (status === 'playing') {
        onPause();
      } else if (isMetronomeActive) {
        // 倒计时期间：停止倒计时（play() 内部检测 isMetronomeActive 会停止）
        onPlay();
      } else {
        onPlay();
      }
      // 触发后将焦点设置到播放按钮
      playButtonRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlay, onPause, status, isMetronomeActive, playButtonRef, isEditorFocused]);
}

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const {
    source,
    setSource,
    score,
    parseErrors,
    playbackStatus,
    currentNoteIndex,
    tempo,
    isLoading,
    isAutoSaving,
    setTempo,
    play,
    pause,
    stop,
    playDelay,
    countdownValue,
    isMetronomeActive,
    setPlayDelay,
    currentScoreId,
    loadMyScore,
    lastSavedAt,
    saveAsNewScore,
    noteFontSize,
    setNoteFontSize,
  } = useStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isControlPinned, setIsControlPinned] = useState(false);
  const [scrollToMeasure, setScrollToMeasure] = useState<number | undefined>(undefined);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  // 根据路由参数加载曲谱
  useEffect(() => {
    if (id && id !== currentScoreId) {
      loadMyScore(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 键盘快捷键：空格键播放/暂停/取消倒计时
  useKeyboardShortcut(playButtonRef, play, pause, playbackStatus, isMetronomeActive, isEditorFocused);

  // 处理编辑器滚动事件，计算应该滚动到的小节
  const handleEditorScroll = (firstVisibleLine: number) => {
    if (!score) return;
    
    // 找到第一个起始行号 <= 当前可见行的小节
    let targetMeasure: number | undefined;
    for (const measure of score.measures) {
      if (measure.sourceLine !== undefined && measure.sourceLine <= firstVisibleLine) {
        targetMeasure = measure.number;
      } else {
        break;
      }
    }
    
    if (targetMeasure !== undefined && targetMeasure !== scrollToMeasure) {
      setScrollToMeasure(targetMeasure);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <TopBar
        backTo="/"
        backLabel="我的谱谱"
        subtitle={
          <span className="flex items-center gap-2">
            {score?.metadata.title && (
              <span className="text-sm text-played">— {score.metadata.title}</span>
            )}
            {isAutoSaving && (
              <span className="text-xs text-gray-400 animate-pulse">保存中…</span>
            )}
          </span>
        }
        actions={
          <>
            {/* 图片识别 */}
            <ImageImportButton onClick={() => setIsImageImportOpen(true)} />

            {/* 设置（暂时禁用） */}
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline text-gray-300 cursor-not-allowed"
              title="暂不可用"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">设置</span>
            </button>


          </>
        }
      />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ResizablePanels
            left={<Editor value={source} onChange={setSource} parseErrors={parseErrors} isAutoSaving={isAutoSaving} lastSavedAt={lastSavedAt} onTransposeApply={(s) => saveAsNewScore(s, '移调版')} onFocus={() => setIsEditorFocused(true)} onBlur={() => setIsEditorFocused(false)} onScroll={handleEditorScroll} />}
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
                    <ScoreView score={score} currentNoteIndex={currentNoteIndex} noteFontSize={noteFontSize} scrollToMeasure={scrollToMeasure} />
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
            defaultLeftWidth={35}
          />
        </div>

        {/* 播放控制栏 */}
        <PlayerBar
          playButtonRef={playButtonRef}
          status={playbackStatus}
          playDelay={playDelay}
          isMetronomeActive={isMetronomeActive}
          countdownValue={countdownValue}
          noteFontSize={noteFontSize}
          collapsed={isEditorFocused}
          pinned={isControlPinned}
          onNoteFontSizeChange={setNoteFontSize}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onPlayDelayChange={setPlayDelay}
        />

        {/* 悬浮节拍器 */}
        <Metronome tempo={tempo} status={playbackStatus} onTempoChange={setTempo} />
      </main>

      {/* 设置模态框 */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 图片导入模态框 */}
      <ImageImportModal isOpen={isImageImportOpen} onClose={() => setIsImageImportOpen(false)} />

      {/* 右下角悬浮反馈组件 */}
      <FeedbackWidget />
    </div>
  );
};

export default EditorPage;
