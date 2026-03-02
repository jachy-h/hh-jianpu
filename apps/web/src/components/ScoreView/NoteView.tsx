import React from 'react';
import type { NoteElement } from '@hh-jianpu/core';

interface NoteViewProps {
  note: NoteElement;
  x: number;
  y: number;
  index: number;
  isActive: boolean;
  isPlayed: boolean;
  beamGroup?: number;
  noteFontSize?: number;
  onClick?: (index: number) => void;
}

/**
 * 将音符数据渲染为 SVG 元素
 */
function getNoteDisplay(note: NoteElement): string {
  switch (note.type) {
    case 'note':
      return `${note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : ''}${note.pitch}`;
    case 'rest':
      return '0';
    case 'tie':
      return '—';
    case 'breath':
      return 'v';
    default:
      return '?';
  }
}

const NoteView: React.FC<NoteViewProps> = ({ note, x, y, index, isActive, isPlayed, beamGroup, noteFontSize = 18, onClick }) => {
  const display = getNoteDisplay(note);

  // 确定样式类
  let fillColor = '#1C1917'; // ink
  if (isActive) fillColor = '#2563EB'; // highlight
  else if (isPlayed) fillColor = '#94A3B8'; // played

  // 换气符号特殊渲染
  if (note.type === 'breath') {
    return (
      <g
        className="score-breath"
        onClick={() => onClick?.(index)}
        style={{ cursor: 'pointer' }}
      >
        <text
          x={x}
          y={y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={noteFontSize + 2}
          fontWeight={600}
          fill={fillColor}
        >
          v
        </text>
      </g>
    );
  }

  // 倚音（装饰音）特殊渲染：小号字体，位置左上（已在 layout 中使用主音符的X坐标）
  const isGrace = note.type === 'note' && note.isGrace;
  const fontSize = isGrace ? Math.max(10, noteFontSize - 6) : noteFontSize;
  const graceOffsetX = isGrace ? -12 : 0; // 左偏更多
  const graceOffsetY = isGrace ? -10 : 0;  // 上偏更多

  // 波音标记
  const hasTrill = note.type === 'note' && note.trillType;

  return (
    <g
      className="score-note"
      onClick={() => onClick?.(index)}
      style={{ cursor: 'pointer' }}
    >
      {/* 高亮背景 */}
      {isActive && (
        <rect
          x={x - 14}
          y={y - 16}
          width={28}
          height={28}
          rx={4}
          fill="#2563EB"
          fillOpacity={0.1}
        />
      )}

      {/* 波音符号（在音符上方） */}
      {hasTrill && note.type === 'note' && (
        <>
          {note.trillType === 'single' && (
            // 单波音：一个波浪
            <path
              d={`M ${x - 10},${y - 22} L ${x - 5},${y - 18} L ${x},${y - 22} L ${x + 5},${y - 18} L ${x + 10},${y - 22}`}
              stroke={fillColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
          {note.trillType === 'double' && (
            // 复波音：两个波浪
            <path
              d={`M ${x - 12},${y - 22} L ${x - 8},${y - 18} L ${x - 4},${y - 22} L ${x},${y - 18} L ${x + 4},${y - 22} L ${x + 8},${y - 18} L ${x + 12},${y - 22}`}
              stroke={fillColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
          {note.trillType === 'lower' && (
            // 下波音：一个波浪加中间垂直线
            <>
              <path
                d={`M ${x - 10},${y - 22} L ${x - 5},${y - 18} L ${x},${y - 22} L ${x + 5},${y - 18} L ${x + 10},${y - 22}`}
                stroke={fillColor}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
              <line
                x1={x}
                y1={y - 26}
                x2={x}
                y2={y - 18}
                stroke={fillColor}
                strokeWidth="1.5"
                opacity={0.8}
              />
            </>
          )}
        </>
      )}

      {/* 音符数字 */}
      <text
        x={x + graceOffsetX}
        y={y + graceOffsetY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace"
        fontSize={fontSize}
        fontWeight={isActive ? 600 : 400}
        fill={fillColor}
        opacity={isGrace ? 0.7 : 1}
      >
        {display}
      </text>

      {/* 高八度点 */}
      {note.type === 'note' && note.octave > 0 && (
        <>
          {Array.from({ length: note.octave }).map((_, i) => (
            <circle
              key={`up-${i}`}
              cx={x + graceOffsetX}
              cy={y + graceOffsetY - (isGrace ? 12 : 18) - i * 6}
              r={isGrace ? 1.5 : 2}
              fill={fillColor}
              opacity={isGrace ? 0.7 : 1}
            />
          ))}
        </>
      )}

      {/* 低八度点 */}
      {note.type === 'note' && note.octave < 0 && (
        <>
          {Array.from({ length: Math.abs(note.octave) }).map((_, i) => (
            <circle
              key={`down-${i}`}
              cx={x + graceOffsetX}
              cy={y + graceOffsetY + (isGrace ? 12 : 16) + i * 6}
              r={isGrace ? 1.5 : 2}
              fill={fillColor}
              opacity={isGrace ? 0.7 : 1}
            />
          ))}
        </>
      )}

      {/* 减时线（八分音符及更短，但不在连音组中的才单独渲染，倚音不显示） */}
      {!isGrace && note.duration.base >= 8 && beamGroup === undefined && (
        <>
          <line
            x1={x - 8}
            y1={y + 12}
            x2={x + 8}
            y2={y + 12}
            stroke={fillColor}
            strokeWidth={1.5}
          />
          {note.duration.base >= 16 && (
            <line
              x1={x - 8}
              y1={y + 16}
              x2={x + 8}
              y2={y + 16}
              stroke={fillColor}
              strokeWidth={1.5}
            />
          )}
        </>
      )}

      {/* 倚音下划线：长倚音单下划线，短倚音双下划线 */}
      {isGrace && (
        <>
          {/* 第一条下划线（所有倚音都有） */}
          <line
            x1={x + graceOffsetX - 6}
            y1={y + graceOffsetY + 8}
            x2={x + graceOffsetX + 6}
            y2={y + graceOffsetY + 8}
            stroke={fillColor}
            strokeWidth={1}
            opacity={0.7}
          />
          {/* 第二条下划线（仅短倚音有） */}
          {note.graceType === 'short' && (
            <line
              x1={x + graceOffsetX - 6}
              y1={y + graceOffsetY + 11}
              x2={x + graceOffsetX + 6}
              y2={y + graceOffsetY + 11}
              stroke={fillColor}
              strokeWidth={1}
              opacity={0.7}
            />
          )}
        </>
      )}

      {/* 附点 */}
      {note.type === 'note' && note.dot && (
        <circle
          cx={x + 12}
          cy={y}
          r={2}
          fill={fillColor}
        />
      )}
    </g>
  );
};

export default React.memo(NoteView);
