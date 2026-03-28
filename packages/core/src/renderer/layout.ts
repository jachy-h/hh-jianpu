// ============================================================
// Layout Engine — 将 Score AST 计算为可渲染的布局信息
// ============================================================

import type {
  Score,
  ScoreLayout,
  LineLayout,
  MeasureLayout,
  NotePosition,
  NoteElement,
  LyricsPosition,
  Measure,
} from '../types/index.js';
import { calculateDynamicSpacing, calculateNotePositions } from './dynamic-spacing.js';

/** 布局配置 */
export interface LayoutConfig {
  /** 总宽度（px） */
  width: number;
  /** 每行小节数 */
  measuresPerLine: number;
  /** 音符间距（px） */
  noteSpacing: number;
  /** 音符字号（px） */
  noteFontSize: number;
  /** 行高（px） */
  lineHeight: number;
  /** 行间距（px） */
  lineGap: number;
  /** 左边距（px） */
  marginLeft: number;
  /** 顶部边距（px），用于标题和元信息 */
  marginTop: number;
  /** 歌词 Y 偏移（相对行底）（px） */
  lyricsOffset: number;
  /** 歌词字号比例（相对音符） */
  lyricsFontSizeRatio: number;
}

/** 默认布局配置 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  width: 800,
  measuresPerLine: 4,
  noteSpacing: 40,
  noteFontSize: 18,
  lineHeight: 60,
  lineGap: 30,
  marginLeft: 40,
  marginTop: 100,  // 增加顶部边距以容纳扩展元信息
  lyricsOffset: 10,
  lyricsFontSizeRatio: 0.85,
};

/**
 * 计算曲谱布局
 */
export function createLayout(score: Score, config: Partial<LayoutConfig> = {}): ScoreLayout {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const lines: LineLayout[] = [];
  const allNotes: NotePosition[] = [];
  let globalNoteIndex = 0;

  // 按行分组小节：优先使用源文本换行，同时受 measuresPerLine 上限约束
  const lineGroups: Measure[][] = [];
  let currentGroup: Measure[] = [];

  for (let i = 0; i < score.measures.length; i++) {
    const measure = score.measures[i];
    const shouldBreak =
      (measure.lineBreakBefore && currentGroup.length > 0) ||
      currentGroup.length >= cfg.measuresPerLine;

    if (shouldBreak) {
      lineGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(measure);
  }
  if (currentGroup.length > 0) {
    lineGroups.push(currentGroup);
  }

  for (let lineIdx = 0; lineIdx < lineGroups.length; lineIdx++) {
    const lineMeasures = lineGroups[lineIdx];

    const lineY = cfg.marginTop + lineIdx * (cfg.lineHeight + cfg.lineGap);
    const measureWidth = (cfg.width - cfg.marginLeft * 2) / cfg.measuresPerLine;

    const measureLayouts: MeasureLayout[] = [];
    let currentX = cfg.marginLeft;

    for (let mIdx = 0; mIdx < lineMeasures.length; mIdx++) {
      const measure = lineMeasures[mIdx];
      const notePositions: NotePosition[] = [];

      // 使用动态间距计算
      const noteSpacing = calculateDynamicSpacing(measure.notes, cfg.noteFontSize, measureWidth * 0.8);
      const positions = calculateNotePositions(measure.notes, cfg.noteFontSize, currentX + noteSpacing / 2, noteSpacing);

      for (let nIdx = 0; nIdx < measure.notes.length; nIdx++) {
        const note = measure.notes[nIdx];
        const { x, y } = positions[nIdx];
        const noteY = lineY + cfg.lineHeight / 2;
        
        const notePos: NotePosition = {
          index: globalNoteIndex,
          x: x,
          y: noteY,
          note,
          measureNumber: measure.number,
          // 直接从 AST 中读取 beamGroup 和 slurGroup
          beamGroup: (note.type === 'note' || note.type === 'rest') ? note.beamGroup : undefined,
          slurGroup: note.type === 'note' ? note.slurGroup : undefined,
        };

        notePositions.push(notePos);
        allNotes.push(notePos);
        globalNoteIndex++;
      }

      // 计算小节的实际宽度（基于音符位置）
      let actualMeasureWidth = measureWidth;
      if (notePositions.length > 0) {
        const lastNote = notePositions[notePositions.length - 1];
        // 实际宽度 = 最后一个音符到起始位置的距离 + 音符间距
        actualMeasureWidth = lastNote.x - currentX + noteSpacing;
      }

      measureLayouts.push({
        measure,
        x: currentX,
        y: lineY,
        width: actualMeasureWidth,
        notes: notePositions,
        lyrics: calculateLyricsPositions(measure, notePositions, lineY, cfg),
      });

      // 更新下一个小节的起始位置
      currentX += actualMeasureWidth;
    }

    lines.push({
      measures: measureLayouts,
      y: lineY,
      height: cfg.lineHeight,
    });
  }

  const totalHeight = lines.length > 0
    ? lines[lines.length - 1].y + cfg.lineHeight + cfg.lineGap
    : cfg.marginTop;

  return {
    width: cfg.width,
    height: totalHeight,
    lines,
    allNotes,
  };
}

/**
 * 计算歌词位置
 * 
 * @param measure 小节 AST
 * @param notePositions 音符位置数组
 * @param lineY 行 Y 坐标
 * @param config 布局配置
 * @returns 歌词位置数组
 */
function calculateLyricsPositions(
  measure: Measure,
  notePositions: NotePosition[],
  lineY: number,
  config: LayoutConfig
): LyricsPosition[] | undefined {
  if (!measure.lyrics || measure.lyrics.syllables.length === 0) {
    return undefined;
  }

  const positions: LyricsPosition[] = [];
  let syllableIndex = 0;

  // 遍历音符位置，为每个有效音符分配歌词
  for (let i = 0; i < notePositions.length; i++) {
    const notePos = notePositions[i];
    const note = notePos.note;

    // 只为非倚音的音符分配歌词
    if (note.type === 'note' && !note.isGrace) {
      if (syllableIndex < measure.lyrics.syllables.length) {
        const syllable = measure.lyrics.syllables[syllableIndex];
        
        positions.push({
          text: syllable.text,
          x: notePos.x,
          y: lineY + config.lineHeight + config.lyricsOffset,
          isPlaceholder: syllable.isPlaceholder,
          isGroup: syllable.isGroup,
          noteIndex: notePos.index,
        });
        
        syllableIndex++;
      }
    }
  }

  return positions.length > 0 ? positions : undefined;
}
