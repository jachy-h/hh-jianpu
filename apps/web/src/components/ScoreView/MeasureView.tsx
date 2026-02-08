import React from 'react';
import type { MeasureLayout } from '@as-nmn/core';
import NoteView from './NoteView';

interface MeasureViewProps {
  layout: MeasureLayout;
  currentNoteIndex: number;
  onNoteClick?: (index: number) => void;
}

const MeasureView: React.FC<MeasureViewProps> = ({ layout, currentNoteIndex, onNoteClick }) => {
  const { measure, x, y, width, notes } = layout;

  // 收集连音组（beamGroup）并渲染连音线
  const beamGroups = new Map<number, typeof notes>();
  notes.forEach(note => {
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
        const hasActive = group.some(n => n.index === currentNoteIndex);
        const hasPlayed = group.some(n => currentNoteIndex >= 0 && n.index < currentNoteIndex);
        
        let strokeColor = '#1C1917'; // ink
        if (hasActive) strokeColor = '#2563EB'; // highlight
        else if (hasPlayed) strokeColor = '#94A3B8'; // played
        
        return (
          <line
            key={`beam-${idx}`}
            x1={firstNote.x - 8}
            y1={beamY}
            x2={lastNote.x + 8}
            y2={beamY}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
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
          onClick={onNoteClick}
        />
      ))}
    </g>
  );
};

export default React.memo(MeasureView);
