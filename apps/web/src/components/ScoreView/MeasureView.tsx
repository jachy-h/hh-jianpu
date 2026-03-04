import React from 'react';
import type { MeasureLayout } from '@hh-jianpu/core';
import NoteView from './NoteView';

interface MeasureViewProps {
  layout: MeasureLayout;
  currentNoteIndex: number;
  noteFontSize?: number;
  onNoteClick?: (index: number) => void;
}

const MeasureView: React.FC<MeasureViewProps> = ({ layout, currentNoteIndex, noteFontSize = 18, onNoteClick }) => {
  const { measure, x, y, width, notes } = layout;

  // 收集连音组（beamGroup）并渲染连音线
  const beamGroups = new Map<number, typeof notes>();
  notes.forEach((note) => {
    if (note.beamGroup !== undefined) {
      if (!beamGroups.has(note.beamGroup)) {
        beamGroups.set(note.beamGroup, []);
      }
      beamGroups.get(note.beamGroup)!.push(note);
    }
  });

  return (
    <g>
      {/* 小节线（右侧） */}
      <line
        x1={x + width}
        y1={y + 8}
        x2={x + width}
        y2={y + 52}
        stroke="#D6D3D1"
        strokeWidth={1}
      />

      {/* 小节编号（调试用，生产环境可隐藏） */}
      {/* <text x={x + 4} y={y + 12} fontSize={9} fill="#D6D3D1">{measure.number}</text> */}

      {/* 连音线（beam） */}
      {Array.from(beamGroups.values()).map((group, idx) => {
        if (group.length < 2) return null;
        const firstNote = group[0];
        const lastNote = group[group.length - 1];
        const beamY = firstNote.y + 12; // 使用音符的 Y 坐标 + 偏移量
        
        // 判断是否有高亮/已播放状态
        const hasActive = group.some((n) => n.index === currentNoteIndex);
        const hasPlayed = group.some((n) => currentNoteIndex >= 0 && n.index < currentNoteIndex);
        
        let strokeColor = '#1C1917'; // ink
        if (hasActive) strokeColor = '#2563EB'; // highlight
        else if (hasPlayed) strokeColor = '#94A3B8'; // played

        // 找出需要绘制次级 beam（第二条减时线）的连续段
        // base >= 16 的音符需要次级 beam
        const secondaryRuns: (typeof notes)[] = [];
        let currentRun: typeof notes = [];
        for (const notePos of group) {
          if (notePos.note.type === 'note' && notePos.note.duration.base >= 16) {
            currentRun.push(notePos);
          } else {
            if (currentRun.length > 0) {
              secondaryRuns.push([...currentRun]);
              currentRun = [];
            }
          }
        }
        if (currentRun.length > 0) secondaryRuns.push(currentRun);

        // 找出需要绘制三级 beam（第三条减时线）的连续段
        // base >= 32 的音符需要三级 beam
        const tertiaryRuns: (typeof notes)[] = [];
        let currentTertiaryRun: typeof notes = [];
        for (const notePos of group) {
          if (notePos.note.type === 'note' && notePos.note.duration.base >= 32) {
            currentTertiaryRun.push(notePos);
          } else {
            if (currentTertiaryRun.length > 0) {
              tertiaryRuns.push([...currentTertiaryRun]);
              currentTertiaryRun = [];
            }
          }
        }
        if (currentTertiaryRun.length > 0) tertiaryRuns.push(currentTertiaryRun);
        
        return (
          <g key={`beam-group-${idx}`}>
            {/* 主 beam：连接所有音符 */}
            <line
              x1={firstNote.x - 8}
              y1={beamY}
              x2={lastNote.x + 8}
              y2={beamY}
              stroke={strokeColor}
              strokeWidth={1.5}
            />
            {/* 次级 beam（十六分音符段） */}
            {secondaryRuns.map((run, runIdx) => {
              const rx1 = run[0].x - 8;
              const rx2 = run[run.length - 1].x + 8;
              return (
                <line
                  key={`beam2-${runIdx}`}
                  x1={rx1}
                  y1={beamY + 4}
                  x2={rx2}
                  y2={beamY + 4}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                />
              );
            })}
            {/* 三级 beam（三十二分音符段） */}
            {tertiaryRuns.map((run, runIdx) => {
              const rx1 = run[0].x - 8;
              const rx2 = run[run.length - 1].x + 8;
              return (
                <line
                  key={`beam3-${runIdx}`}
                  x1={rx1}
                  y1={beamY + 8}
                  x2={rx2}
                  y2={beamY + 8}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        );
      })}

      {/* 音符 */}
      {notes.map((notePos) => (
        <NoteView
          key={notePos.index}
          note={notePos.note}
          x={notePos.x}
          y={notePos.y}
          index={notePos.index}
          isActive={notePos.index === currentNoteIndex}
          isPlayed={currentNoteIndex >= 0 && notePos.index < currentNoteIndex}
          beamGroup={notePos.beamGroup}
          noteFontSize={noteFontSize}
          onClick={onNoteClick}
        />
      ))}

      {/* 歌词 */}
      {layout.lyrics?.map((lyricsPos, idx) => {
        if (lyricsPos.isPlaceholder) {
          return null; // 占位符不显示
        }
        
        const isHighlight = lyricsPos.noteIndex === currentNoteIndex;
        const isPlayed = currentNoteIndex >= 0 && lyricsPos.noteIndex < currentNoteIndex;
        
        return (
          <text
            key={idx}
            x={lyricsPos.x}
            y={lyricsPos.y}
            textAnchor="middle"
            fontSize={lyricsPos.isGroup ? 13 : 16}
            fill={isHighlight ? '#2563EB' : isPlayed ? '#78716C' : '#57534E'}
            className="transition-colors duration-150"
          >
            {lyricsPos.text}
          </text>
        );
      })}
    </g>
  );
};

export default React.memo(MeasureView);
