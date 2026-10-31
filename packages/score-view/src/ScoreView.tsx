import './style.css';
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { createLayout, getScoreVoices } from '@hh-jianpu/core';
import type { Score, PlaybackPosition, TimeCursor } from '@hh-jianpu/core';
import { PlaybackCursor } from './PlaybackCursor.js';
import { createSlurSegments } from './slur-segments.js';
import MeasureView from './MeasureView.js';
import { isPlaybackJump, playbackScrollTop, shouldRepositionCursor } from './playback-scroll.js';
import { createFollowResumeTimer } from './follow-resume.js';

interface ScoreViewProps {
  score: Score;
  currentNoteIndex: number;
  activeNoteIndices?: number[];
  width?: number;
  measuresPerLine?: number;
  respectSourceLineBreaks?: boolean;
  layoutMode?: 'natural' | 'aligned' | 'time';
  /** 紧凑播放视图：省略重复标题和扩展说明，只保留调号与拍号。 */
  compactHeader?: boolean;
  /** 显式播放状态，区分暂停时仍保留的音符高亮。 */
  isPlaying?: boolean;
  playbackStatus?: 'idle' | 'playing' | 'paused';
  readPlaybackPosition?: () => PlaybackPosition | null;
  /** 手动浏览后闲置多久恢复跟随；省略或 0 表示不自动恢复。 */
  followResumeDelayMs?: number;
  noteFontSize?: number;
  onNoteClick?: (index: number) => void;
  onMeasureClick?: (measureNumber: number, voiceId?: 'upper' | 'lower') => void;
  loopSelection?: { startMeasure: number; endMeasure: number | null } | null;
  /** 滚动到指定小节编号（从 1 开始） */
  scrollToMeasure?: number;
}

const ScoreView: React.FC<ScoreViewProps> = ({
  score,
  currentNoteIndex,
  activeNoteIndices,
  width,
  measuresPerLine,
  respectSourceLineBreaks,
  layoutMode,
  compactHeader = false,
  isPlaying = false,
  playbackStatus = 'idle',
  readPlaybackPosition,
  followResumeDelayMs,
  noteFontSize = 18,
  onNoteClick,
  onMeasureClick,
  loopSelection,
  scrollToMeasure,
}) => {
  // 响应式：根据预览容器宽度自动调整
  const [containerWidth, setContainerWidth] = useState(width || 800);
  const [followPlayback, setFollowPlayback] = useState(true);
  // 容器引用，用于滚动
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const interactionHeld = useRef(false);
  const previousScroll = useRef<{ layout: ReturnType<typeof createLayout>; line: number; measure: number; height: number } | null>(null);

  useEffect(() => {
    if (!followResumeDelayMs || !Number.isFinite(followResumeDelayMs) || followResumeDelayMs < 0) return;
    const idle = createFollowResumeTimer(followResumeDelayMs, () => setFollowPlayback(true));
    idle.hold(interactionHeld.current);
    idle.enable(isPlaying && !followPlayback);
    const activity = () => idle.activity();
    const hold = () => { interactionHeld.current = true; idle.hold(true); };
    const release = () => { interactionHeld.current = false; idle.hold(false); };
    const activities = ['wheel', 'pointermove', 'touchmove', 'keydown', 'scroll'];
    const holds = ['pointerdown', 'touchstart'];
    const releases = ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur'];
    activities.forEach(name => window.addEventListener(name, activity, { capture: true, passive: true }));
    holds.forEach(name => window.addEventListener(name, hold, { capture: true, passive: true }));
    releases.forEach(name => window.addEventListener(name, release, { capture: true, passive: true }));
    return () => {
      idle.dispose();
      activities.forEach(name => window.removeEventListener(name, activity, true));
      holds.forEach(name => window.removeEventListener(name, hold, true));
      releases.forEach(name => window.removeEventListener(name, release, true));
    };
  }, [isPlaying, followPlayback, followResumeDelayMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateHeight = () => setViewportHeight(container.clientHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(container);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateHeight); };
  }, []);

  useEffect(() => {
    if (width !== undefined) return;
    const container = containerRef.current;
    if (!container) return;
    const updateDimensions = () => {
      const availableWidth = container.clientWidth;
      setContainerWidth(Math.max(160, availableWidth - 16));
    };
    updateDimensions();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(container);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width]);

  const finalWidth = width || containerWidth;

  const layout = useMemo(
    () => createLayout(score, {
      width: finalWidth,
      measuresPerLine,
      respectSourceLineBreaks,
      layoutMode,
      noteFontSize,
      lineHeight: Math.max(60, noteFontSize * 3.3),
      // 时值模式为 1.5 倍黑猫在播放线下方保留空间，避免覆盖下一行。
      ...(layoutMode === 'time' ? { lineGap: 50 } : {}),
      ...(compactHeader ? { marginTop: 48 } : {}),
    }),
    [score, finalWidth, measuresPerLine, respectSourceLineBreaks, layoutMode, noteFontSize, compactHeader]
  );

  // 以最长谱行为基准整体居中，保留各行共同的左起点。
  const scoreOffset = useMemo(() => {
    const measures = layout.lines.flatMap(line => [...line.measures, ...(line.secondaryMeasures ?? [])]);
    if (!measures.length) return 0;
    const left = Math.min(...measures.map(measure => measure.x));
    const right = Math.max(...measures.map(measure => measure.x + measure.width));
    return Math.max(0, (layout.width - (right - left)) / 2 - left);
  }, [layout]);

  const activeIndices = activeNoteIndices ?? (currentNoteIndex < 0 ? [] : [currentNoteIndex]);
  const voiceIndex = (voiceId?: 'upper' | 'lower'): number => score.secondaryVoice
    ? activeIndices.find(index => layout.allNotes[index]?.voiceId === voiceId) ?? -1 : currentNoteIndex;
  const voices = getScoreVoices(score);
  const latestActive = activeIndices.map(index => layout.allNotes[index]).filter(Boolean)
    .sort((a, b) => (b.startBeat ?? 0) - (a.startBeat ?? 0))[0];

  const slurs = useMemo(() => createSlurSegments(layout, noteFontSize), [layout, noteFontSize]);

  useEffect(() => {
    if (currentNoteIndex < 0) setFollowPlayback(true);
  }, [currentNoteIndex]);

  const playbackMeasure = latestActive?.measureNumber ?? layout.allNotes[currentNoteIndex]?.measureNumber;

  const cursorScroll = useRef<{ layout: typeof layout; line: number; measure: number; height: number } | null>(null);
  const handleCursorPosition = useCallback((cursor: TimeCursor) => {
    const container = containerRef.current;
    if (!container || !followPlayback) { cursorScroll.current = null; return; }
    const previous = cursorScroll.current;
    const line = layout.lines[cursor.lineIndex];
    const x = cursor.x + scoreOffset;
    const padding = Math.min(container.clientWidth * 0.2, noteFontSize * 3);
    const left = x < container.scrollLeft + padding || x > container.scrollLeft + container.clientWidth - padding
      ? Math.max(0, x - container.clientWidth / 2) : container.scrollLeft;
    const lineChanged = shouldRepositionCursor(previous, layout, cursor.lineIndex, container.clientHeight);
    const jump = previous && (cursor.measureNumber < previous.measure || cursor.measureNumber > previous.measure + 1);
    const top = lineChanged || jump ? playbackScrollTop(line.y, container.clientHeight, container.scrollHeight) : container.scrollTop;
    cursorScroll.current = { layout, line: cursor.lineIndex, measure: cursor.measureNumber, height: container.clientHeight };
    if (left !== container.scrollLeft || top !== container.scrollTop) {
      if (typeof container.scrollTo === 'function') container.scrollTo({ top, left, behavior: 'auto' });
      else { container.scrollTop = top; container.scrollLeft = left; }
    }
  }, [followPlayback, layout, noteFontSize, scoreOffset]);

  // 每次换行主动将播放行放到视口上方三分之一处；手动浏览后暂停跟随。
  useEffect(() => {
    const container = containerRef.current;
    const isPlayback = currentNoteIndex >= 0;
    if (isPlayback && layoutMode === 'time' && readPlaybackPosition) return;
    if (!container || (isPlayback && !followPlayback)) { previousScroll.current = null; return; }
    const activeMeasure = isPlayback ? playbackMeasure : scrollToMeasure;
    if (!isPlayback) previousScroll.current = null;
    if (activeMeasure === undefined) return;
    const lineIndex = layout.lines.findIndex((item) => item.measures.some((measure) => measure.measure.number === activeMeasure));
    const line = layout.lines[lineIndex];
    if (!line) return;
    const previous = previousScroll.current;
    const activeNote = isPlayback ? (latestActive ?? layout.allNotes[currentNoteIndex]) : undefined;
    const targetMeasure = line.measures.find(measure => measure.measure.number === activeMeasure);
    let left = container.scrollLeft;
    if (layoutMode === 'time') {
      const targetX = isPlayback ? activeNote?.x : (targetMeasure?.notes[0]?.x ?? targetMeasure?.x);
      if (targetX !== undefined) {
        const position = targetX + scoreOffset;
        const padding = Math.min(container.clientWidth * 0.2, noteFontSize * 3);
        if (position < left + padding || position > left + container.clientWidth - padding) {
          left = Math.max(0, position - container.clientWidth / 2);
        }
      }
    }
    const jump = isPlayback && previous !== null && isPlaybackJump(previous.measure, activeMeasure, previous.line, lineIndex);
    if (isPlayback) {
      previousScroll.current = { layout, line: lineIndex, measure: activeMeasure, height: viewportHeight };
      if (!jump && previous?.layout === layout && previous.line === lineIndex && previous.height === viewportHeight && left === container.scrollLeft) return;
    }
    const top = isPlayback
      ? playbackScrollTop(line.y, container.clientHeight, container.scrollHeight)
      : Math.max(0, line.y - 20);
    const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = jump || reducedMotion ? 'auto' : 'smooth';
    if (typeof container.scrollTo === 'function') container.scrollTo({ top, left, behavior });
    else { container.scrollTop = top; container.scrollLeft = left; }
  }, [scrollToMeasure, layout, currentNoteIndex, playbackMeasure, followPlayback, viewportHeight, layoutMode, scoreOffset, noteFontSize, latestActive, readPlaybackPosition]);

  return (
    <div className="score-frame">
      {currentNoteIndex >= 0 && !followPlayback && (
        <button type="button" onClick={() => setFollowPlayback(true)} className="score-follow">
          恢复播放跟随
        </button>
      )}
      <div ref={containerRef} className="score-view" onWheel={() => setFollowPlayback(false)} onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }} onTouchMove={(event) => {
        const touch = event.touches[0];
        const start = touchStart.current;
        if (touch && start && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 8) {
          setFollowPlayback(false);
          touchStart.current = null;
        }
      }} onTouchEnd={() => { touchStart.current = null; }} onTouchCancel={() => { touchStart.current = null; }} onKeyDown={(event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) setFollowPlayback(false);
      }} tabIndex={0} aria-label="曲谱预览">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="score-svg"
      >
        {/* 标题 */}
        {!compactHeader && score.metadata.title && (
          <text
            x={layout.width / 2}
            y={40}
            textAnchor="middle"
            fontSize={22}
            fontWeight={600}
            fill="#1C1917"
          >
            {score.metadata.title}
          </text>
        )}

        {/* 元信息行（基础信息） */}
        <text
          x={layout.width / 2}
          y={compactHeader ? 20 : 65}
          textAnchor="middle"
          fontSize={13}
          fill="#94A3B8"
          fontFamily="'JetBrains Mono', monospace"
        >
          1={score.metadata.key}  {score.metadata.timeSignature.beats}/{score.metadata.timeSignature.beatValue}{!compactHeader && `  ♩=${score.metadata.tempo}`}
        </text>

        {/* 扩展元信息行（作曲、作词等） */}
        {!compactHeader && renderExtendedMetadata(score, layout.width)}

        <g transform={`translate(${scoreOffset}, 0)`}>
        {/* 小节 */}
        {layout.lines.map((line, lineIdx) => (
          <g
            key={lineIdx}
          >
            {currentNoteIndex >= 0 && playbackMeasure !== undefined && line.measures.some(item => item.measure.number === playbackMeasure) && (
              <rect x={Math.max(0, (line.measures[0]?.x ?? 0) - 12)} y={line.y - 6}
                width={Math.max(0, layout.width - scoreOffset - Math.max(0, (line.measures[0]?.x ?? 0) - 12) - 12)}
                height={Math.max(line.height, ...[...line.measures, ...(line.secondaryMeasures ?? [])].flatMap(measure =>
                  (measure.lyrics ?? []).filter(lyric => !lyric.isPlaceholder).map(lyric => lyric.y - line.y + noteFontSize * 0.5))) + 12} rx={8} fill="#2563EB" opacity={0.07} pointerEvents="none" />
            )}
            {/* 行首小节线 */}
            <line
              x1={line.measures[0]?.x ?? 0}
              y1={line.y + 8}
              x2={line.measures[0]?.x ?? 0}
              y2={line.y + line.height - 8}
              stroke="#D6D3D1"
              strokeWidth={1}
            />
            {line.secondaryMeasures && (() => {
              const x = (line.measures[0]?.x ?? 40) - 12;
              const top = line.y + 8;
              const bottom = line.y + line.height - 8;
              const mid = (top + bottom) / 2;
              return <g aria-label="双声部联谱">
                <path d={`M ${x},${top} C ${x - 12},${top} ${x},${mid - 12} ${x - 12},${mid} C ${x},${mid + 12} ${x - 12},${bottom} ${x},${bottom}`} fill="none" stroke="#57534E" strokeWidth={1.5} />
                {[line.measures, line.secondaryMeasures].map((row, index) => <text key={index} x={row[0]?.x} y={(row[0]?.y ?? top) + noteFontSize * 0.65} fontSize={noteFontSize * 0.55} fill="#78716C">{voices[index].name}</text>)}
                {(layoutMode !== 'time' || !readPlaybackPosition) && latestActive && line.measures.some(item => item.measure.number === latestActive.measureNumber) && <rect x={latestActive.x - 3} y={top} width={6} height={bottom - top} fill="#2563EB" opacity={0.16} pointerEvents="none" />}
              </g>;
            })()}
            {[...line.measures, ...(line.secondaryMeasures ?? [])].map((measureLayout) => (
              <MeasureView
                key={`${measureLayout.voiceId ?? 'upper'}-${measureLayout.measure.number}`}
                layout={measureLayout}
                joinedRepeatStart={Boolean([...line.measures, ...(line.secondaryMeasures ?? [])].some(previous =>
                  previous.voiceId === measureLayout.voiceId && previous.measure.number === measureLayout.measure.number - 1 && previous.measure.combinedRepeat))}
                joinedRepeatEnd={Boolean(measureLayout.measure.combinedRepeat && [...line.measures, ...(line.secondaryMeasures ?? [])].some(next =>
                  next.voiceId === measureLayout.voiceId && next.measure.number === measureLayout.measure.number + 1 && next.measure.repeatStart))}
                currentNoteIndex={voiceIndex(measureLayout.voiceId)}
                noteFontSize={noteFontSize}
                onNoteClick={onNoteClick}
                onMeasureClick={onMeasureClick}
                isLoopSelected={Boolean(loopSelection && measureLayout.measure.number >= loopSelection.startMeasure && measureLayout.measure.number <= (loopSelection.endMeasure ?? loopSelection.startMeasure))}
              />
            ))}
          </g>
        ))}

        {layoutMode === 'time' && readPlaybackPosition && <PlaybackCursor layout={layout} status={playbackStatus}
          readPosition={readPlaybackPosition} onPosition={handleCursorPosition} />}
        {/* 圆滑线（在所有音符之上渲染，支持跨小节） */}
        {slurs.map((segment) => {
          const current = voiceIndex(segment.voiceId);
          const hasActive = segment.notes.some((note) => note.index === current);
          const hasPlayed = segment.notes.some((note) => current >= 0 && note.index < current);
          return <path key={`slur-${segment.voiceId}-${segment.group}-${segment.line}`} d={segment.path} fill="none" stroke={hasActive ? '#2563EB' : hasPlayed ? '#94A3B8' : '#1C1917'} strokeWidth={1.5} opacity={0.8} />;
        })}
        </g>
      </svg>
      </div>
    </div>
  );
};

export default React.memo(ScoreView);

// 辅助函数：渲染扩展元信息（所有 custom 字段）
function renderExtendedMetadata(score: Score, width: number) {
  const { metadata } = score;
  const parts: string[] = [];

  // 渲染所有 custom 字段
  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      parts.push(`${key}：${value}`);
    }
  }

  if (parts.length === 0) return null;

  return (
    <text
      x={width / 2}
      y={85}
      textAnchor="middle"
      fontSize={12}
      fill="#78716C"
      fontFamily="'JetBrains Mono', monospace"
    >
      {parts.join('  ')}
    </text>
  );
}
