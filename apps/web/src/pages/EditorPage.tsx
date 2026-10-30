import { getScoreVoices } from '@hh-jianpu/core';
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Editor from '../components/Editor/Editor';
import ScoreView from '../components/ScoreView/ScoreView';
import PlayerBar from '../components/Player/PlayerBar';
import Metronome from '../components/Player/Metronome';
import { ResizablePanels } from '../components/ResizablePanels';
import { ImageImportModal, ImageImportButton } from '../components/ImageImport';
import TopBar from '../components/Layout/TopBar';
import { getFilesystemSyncState, retryFilesystemSync, subscribeFilesystemSync, type FilesystemSyncState } from '../services/myScores';

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

  const {
    source,
    setSource,
    score,
    parseErrors,
    playbackStatus,
    playbackError,
    instrumentId,
    setInstrument,
    currentNoteIndex,
    activeNoteIndices,
    mutedVoices,
    setVoiceMuted,
    tempo,
    practiceSpeed,
    setPracticeSpeed,
    isLoading,
    isAutoSaving,
    saveStatus,
    saveError,
    retrySave,
    setTempo,
    play,
    pause,
    stop,
    playDelay,
    countdownValue,
    isMetronomeActive,
    setPlayDelay,
    loadMyScore,
    lastSavedAt,
    saveAsNewScore,
    noteFontSize,
    setNoteFontSize,
    loopSelection,
    selectLoopMeasure,
    clearLoopSelection,
  } = useStore();

  const [isImageImportOpen, setIsImageImportOpen] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isControlPinned] = useState(true);
  const [scrollToMeasure, setScrollToMeasure] = useState<number | undefined>(undefined);
  const [respectSourceLineBreaks, setRespectSourceLineBreaks] = useState(true);
  const [sourceRangeToLocate, setSourceRangeToLocate] = useState<{ from: number; to: number } | null>(null);
  const [filesystemSync, setFilesystemSync] = useState<FilesystemSyncState>(getFilesystemSyncState());
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribeFilesystemSync(setFilesystemSync), []);

  // 根据路由参数加载曲谱
  useEffect(() => {
    if (id && id !== useStore.getState().currentScoreId) {
      loadMyScore(id);
    }
  }, [id, loadMyScore]);

  useEffect(() => () => { useStore.getState().stop(); }, []);

  // 键盘快捷键：空格键播放/暂停/取消倒计时
  useKeyboardShortcut(playButtonRef, play, pause, playbackStatus, isMetronomeActive, isEditorFocused);

  // 处理编辑器滚动事件，计算应该滚动到的小节
  const handleEditorScroll = (firstVisibleLine: number) => {
    if (!score) return;
    
    // 找到第一个起始行号 <= 当前可见行的小节
    let targetMeasure: number | undefined;
    for (const measure of getScoreVoices(score).flatMap(voice => voice.measures).sort((a, b) => (a.sourceLine ?? 0) - (b.sourceLine ?? 0))) {
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

  const handlePreviewMeasureClick = (measureNumber: number, voiceId?: 'upper' | 'lower') => {
    selectLoopMeasure(measureNumber);
    const measures = voiceId === 'lower' ? score?.secondaryVoice?.measures : score?.measures;
    const measure = measures?.find((item) => item.number === measureNumber);
    if (measure?.sourceRange) setSourceRangeToLocate({ ...measure.sourceRange });
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
            {playbackError && (
              <span className="flex items-center gap-2 text-xs text-error" role="alert">
                {playbackError}
                <button onClick={() => void play()} className="underline hover:no-underline">重试</button>
              </span>
            )}
            {isAutoSaving && (
              <span className="text-xs text-gray-400 animate-pulse">保存中…</span>
            )}
            {saveStatus === 'saved' && !isAutoSaving && (
              <span className="text-xs text-green-600">浏览器已保存</span>
            )}
            {saveStatus === 'error' && saveError && (
              <span className="flex items-center gap-2 text-xs text-error" role="status">
                {saveError}
                <button onClick={retrySave} className="underline hover:no-underline">重试</button>
              </span>
            )}
            {filesystemSync.status === 'saving' && (
              <span className="text-xs text-gray-400">目录备份中…</span>
            )}
            {filesystemSync.status === 'error' && filesystemSync.error && (
              <span className="flex items-center gap-2 text-xs text-error" role="status">
                目录备份失败：{filesystemSync.error}
                <button onClick={() => void retryFilesystemSync()} className="underline hover:no-underline">重试</button>
              </span>
            )}
            {filesystemSync.status === 'saved' && (
              <span className="text-xs text-green-600">目录备份已同步</span>
            )}
          </span>
        }
        actions={
          <>
            {/* 图片识别 */}
            <ImageImportButton onClick={() => setIsImageImportOpen(true)} />

          </>
        }
      />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex flex-col pb-32 sm:pb-24">
        <div className="flex-1 overflow-hidden">
          <ResizablePanels
          left={<Editor value={source} onChange={setSource} parseErrors={parseErrors} isAutoSaving={isAutoSaving} lastSavedAt={lastSavedAt} onTransposeApply={(s) => saveAsNewScore(s, '移调版')} onFocus={() => setIsEditorFocused(true)} onBlur={() => setIsEditorFocused(false)} onScroll={handleEditorScroll} sourceRangeToLocate={sourceRangeToLocate} />}
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
                    <ScoreView score={score} currentNoteIndex={currentNoteIndex} activeNoteIndices={activeNoteIndices} noteFontSize={noteFontSize} scrollToMeasure={scrollToMeasure} loopSelection={loopSelection} onMeasureClick={handlePreviewMeasureClick} isPlaying={playbackStatus === 'playing'} followResumeDelayMs={2000} respectSourceLineBreaks={respectSourceLineBreaks} />
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
          instrumentId={instrumentId}
          onInstrumentChange={setInstrument}
          playButtonRef={playButtonRef}
          status={playbackStatus}
          voices={score?.secondaryVoice ? getScoreVoices(score) : undefined}
          mutedVoices={mutedVoices}
          onVoiceMutedChange={setVoiceMuted}
          isLoading={isLoading}
          practiceSpeed={practiceSpeed}
          onPracticeSpeedChange={setPracticeSpeed}
          playDelay={playDelay}
          isMetronomeActive={isMetronomeActive}
          countdownValue={countdownValue}
          noteFontSize={noteFontSize}
          respectSourceLineBreaks={respectSourceLineBreaks}
          onRespectSourceLineBreaksChange={setRespectSourceLineBreaks}
          collapsed={isEditorFocused}
          pinned={isControlPinned}
          onNoteFontSizeChange={setNoteFontSize}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onPlayDelayChange={setPlayDelay}
          loopSelection={loopSelection}
          onClearLoopSelection={clearLoopSelection}
        />

        {/* 悬浮节拍器 */}
        <Metronome tempo={Math.round(tempo * practiceSpeed)} status={playbackStatus} onTempoChange={(bpm) => setTempo(bpm / practiceSpeed)} />
      </main>


      {/* 图片导入模态框 */}
      <ImageImportModal isOpen={isImageImportOpen} onClose={() => setIsImageImportOpen(false)} />

    </div>
  );
};

export default EditorPage;
