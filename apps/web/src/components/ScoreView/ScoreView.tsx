import React, { useMemo, useEffect, useState, useRef } from 'react';
import { createLayout, getScoreVoices } from '@hh-jianpu/core';
import type { Score } from '@hh-jianpu/core';
import { createSlurSegments } from './slur-segments';
import MeasureView from './MeasureView';

interface ScoreViewProps {
  score: Score;
  currentNoteIndex: number;
  activeNoteIndices?: number[];
  width?: number;
  measuresPerLine?: number;
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
  // 存储每行的引用，用于滚动到指定行
  const lineRefs = useRef<Map<number, SVGElement>>(new Map());

  useEffect(() => {
    if (width !== undefined) return;
    const container = containerRef.current;
    if (!container) return;
    const updateDimensions = () => {
      const availableWidth = container.clientWidth;
      setContainerWidth(Math.max(160, Math.min(availableWidth - 16, 1100)));
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  const finalWidth = width || containerWidth;

  const layout = useMemo(
    () => createLayout(score, {
      width: finalWidth,
      measuresPerLine,
      noteFontSize,
      lineHeight: Math.max(60, noteFontSize * 3.3),
    }),
    [score, finalWidth, measuresPerLine, noteFontSize]
  );

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

  // 源码定位以及演奏跟随共用行坐标；手动浏览后暂停自动跟随。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || (currentNoteIndex >= 0 && !followPlayback)) return;
    const activeMeasure = currentNoteIndex >= 0 && followPlayback
      ? layout.allNotes[currentNoteIndex]?.measureNumber
      : scrollToMeasure;
    if (activeMeasure === undefined) return;
    const line = layout.lines.find((item) => item.measures.some((measure) => measure.measure.number === activeMeasure));
    if (!line) return;
    const element = lineRefs.current.get(line.y);
    if (!element) return;
    const containerRect = container.getBoundingClientRect();
    const lineRect = element.getBoundingClientRect();
    const isPlayback = currentNoteIndex >= 0 && followPlayback;
    if (isPlayback && lineRect.top >= containerRect.top + 16 && lineRect.bottom <= containerRect.bottom - 16) return;
    container.scrollTo({ top: lineRect.top - containerRect.top + container.scrollTop - 20, behavior: 'smooth' });
  }, [scrollToMeasure, layout, currentNoteIndex, followPlayback]);

  return (
    <div className="relative h-full min-h-0">
      {currentNoteIndex >= 0 && !followPlayback && (
        <button type="button" onClick={() => setFollowPlayback(true)} className="absolute right-3 top-3 z-10 rounded-full border border-barline bg-paper px-3 py-1.5 text-xs text-ink shadow-sm">
          恢复播放跟随
        </button>
      )}
      <div ref={containerRef} className="score-view h-full overflow-auto" onWheel={() => setFollowPlayback(false)} onTouchStart={() => setFollowPlayback(false)} onKeyDown={(event) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) setFollowPlayback(false);
      }} tabIndex={0} aria-label="曲谱预览">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="mx-auto"
      >
        {/* 标题 */}
        {score.metadata.title && (
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
          y={65}
          textAnchor="middle"
          fontSize={13}
          fill="#94A3B8"
          fontFamily="'JetBrains Mono', monospace"
        >
          1={score.metadata.key}  {score.metadata.timeSignature.beats}/{score.metadata.timeSignature.beatValue}  ♩={score.metadata.tempo}
        </text>

        {/* 扩展元信息行（作曲、作词等） */}
        {renderExtendedMetadata(score, layout.width)}

        {/* 小节 */}
        {layout.lines.map((line, lineIdx) => (
          <g
            key={lineIdx}
            ref={(el) => {
              if (el) {
                lineRefs.current.set(line.y, el);
              }
            }}
          >
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
                {latestActive && line.measures.some(item => item.measure.number === latestActive.measureNumber) && <rect x={latestActive.x - 3} y={top} width={6} height={bottom - top} fill="#2563EB" opacity={0.16} pointerEvents="none" />}
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

        {/* 圆滑线（在所有音符之上渲染，支持跨小节） */}
        {slurs.map((segment) => {
          const current = voiceIndex(segment.voiceId);
          const hasActive = segment.notes.some((note) => note.index === current);
          const hasPlayed = segment.notes.some((note) => current >= 0 && note.index < current);
          return <path key={`slur-${segment.voiceId}-${segment.group}-${segment.line}`} d={segment.path} fill="none" stroke={hasActive ? '#2563EB' : hasPlayed ? '#94A3B8' : '#1C1917'} strokeWidth={1.5} opacity={0.8} />;
        })}
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
