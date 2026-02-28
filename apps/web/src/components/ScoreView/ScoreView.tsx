import React, { useMemo, useEffect, useState } from 'react';
import { createLayout } from '@hh-jianpu/core';
import type { Score, NotePosition } from '@hh-jianpu/core';
import MeasureView from './MeasureView';

interface ScoreViewProps {
  score: Score;
  currentNoteIndex: number;
  width?: number;
  measuresPerLine?: number;
  onNoteClick?: (index: number) => void;
}

const ScoreView: React.FC<ScoreViewProps> = ({
  score,
  currentNoteIndex,
  width,
  measuresPerLine,
  onNoteClick,
}) => {
  // 响应式：根据窗口宽度自动调整
  const [containerWidth, setContainerWidth] = useState(width || 800);
  const [autoMeasuresPerLine, setAutoMeasuresPerLine] = useState(measuresPerLine || 4);

  useEffect(() => {
    if (width !== undefined && measuresPerLine !== undefined) return;

    const updateDimensions = () => {
      const w = window.innerWidth;
      if (w < 640) {
        // 移动端
        setContainerWidth(w - 32);
        setAutoMeasuresPerLine(2);
      } else if (w < 1024) {
        // 平板
        setContainerWidth(Math.min(w - 64, 700));
        setAutoMeasuresPerLine(3);
      } else {
        // 桌面
        setContainerWidth(Math.min(w - 128, 900));
        setAutoMeasuresPerLine(4);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, measuresPerLine]);

  const finalWidth = width || containerWidth;
  const finalMeasuresPerLine = measuresPerLine || autoMeasuresPerLine;

  const layout = useMemo(
    () => createLayout(score, { width: finalWidth, measuresPerLine: finalMeasuresPerLine }),
    [score, finalWidth, finalMeasuresPerLine]
  );

  return (
    <div className="score-view overflow-auto">
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
          <g key={lineIdx}>
            {/* 行首小节线 */}
            <line
              x1={line.measures[0]?.x ?? 0}
              y1={line.y + 8}
              x2={line.measures[0]?.x ?? 0}
              y2={line.y + 52}
              stroke="#D6D3D1"
              strokeWidth={1}
            />
            {line.measures.map((measureLayout) => (
              <MeasureView
                key={measureLayout.measure.number}
                layout={measureLayout}
                currentNoteIndex={currentNoteIndex}
                onNoteClick={onNoteClick}
              />
            ))}
          </g>
        ))}

        {/* 圆滑线（在所有音符之上渲染，支持跨小节） */}
        {renderSlurs(layout.allNotes, currentNoteIndex)}
      </svg>
    </div>
  );
};

// 辅助函数：渲染圆滑线
function renderSlurs(allNotes: NotePosition[], currentNoteIndex: number) {
  const slurGroups = new Map<number, NotePosition[]>();
  
  // 收集所有圆滑线组
  allNotes.forEach(note => {
    if (note.slurGroup !== undefined) {
      if (!slurGroups.has(note.slurGroup)) {
        slurGroups.set(note.slurGroup, []);
      }
      slurGroups.get(note.slurGroup)!.push(note);
    }
  });

  return Array.from(slurGroups.entries()).map(([groupId, notes]) => {
    if (notes.length < 2) return null;

    const firstNote = notes[0];
    const lastNote = notes[notes.length - 1];

    // 检查是否有高亮/已播放状态
    const hasActive = notes.some(n => n.index === currentNoteIndex);
    const hasPlayed = notes.some(n => currentNoteIndex >= 0 && n.index < currentNoteIndex);
    
    let strokeColor = '#1C1917'; // ink
    if (hasActive) strokeColor = '#2563EB'; // highlight
    else if (hasPlayed) strokeColor = '#94A3B8'; // played

    // 计算贝塞尔曲线控制点
    const startX = firstNote.x;
    const startY = firstNote.y - 24; // 音符上方
    const endX = lastNote.x;
    const endY = lastNote.y - 24;
    
    // 控制点：弧线中点向上弯曲
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 15; // 向上弯曲15px
    
    // 使用二次贝塞尔曲线
    const pathD = `M ${startX},${startY} Q ${midX},${midY} ${endX},${endY}`;

    return (
      <path
        key={`slur-${groupId}`}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        opacity={0.8}
      />
    );
  });
}

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
