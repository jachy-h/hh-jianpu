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
} from '../types/index.js';

/** 布局配置 */
export interface LayoutConfig {
  /** 总宽度（px） */
  width: number;
  /** 每行小节数 */
  measuresPerLine: number;
  /** 音符间距（px） */
  noteSpacing: number;
  /** 行高（px） */
  lineHeight: number;
  /** 行间距（px） */
  lineGap: number;
  /** 左边距（px） */
  marginLeft: number;
  /** 顶部边距（px），用于标题和元信息 */
  marginTop: number;
}

/** 默认布局配置 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  width: 800,
  measuresPerLine: 4,
  noteSpacing: 40,
  lineHeight: 60,
  lineGap: 30,
  marginLeft: 40,
  marginTop: 80,
};

/**
 * 计算曲谱布局
 */
export function createLayout(score: Score, config: Partial<LayoutConfig> = {}): ScoreLayout {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const lines: LineLayout[] = [];
  const allNotes: NotePosition[] = [];
  let globalNoteIndex = 0;

  // 按行分组小节
  const totalMeasures = score.measures.length;
  const lineCount = Math.ceil(totalMeasures / cfg.measuresPerLine);

  for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
    const lineStartMeasure = lineIdx * cfg.measuresPerLine;
    const lineEndMeasure = Math.min(lineStartMeasure + cfg.measuresPerLine, totalMeasures);
    const lineMeasures = score.measures.slice(lineStartMeasure, lineEndMeasure);

    const lineY = cfg.marginTop + lineIdx * (cfg.lineHeight + cfg.lineGap);
    const measureWidth = (cfg.width - cfg.marginLeft * 2) / cfg.measuresPerLine;

    const measureLayouts: MeasureLayout[] = [];

    for (let mIdx = 0; mIdx < lineMeasures.length; mIdx++) {
      const measure = lineMeasures[mIdx];
      const measureX = cfg.marginLeft + mIdx * measureWidth;
      const notePositions: NotePosition[] = [];

      const noteCount = measure.notes.length;
      const spacing = noteCount > 0 ? measureWidth / (noteCount + 1) : measureWidth;

      for (let nIdx = 0; nIdx < measure.notes.length; nIdx++) {
        const note = measure.notes[nIdx];
        const noteX = measureX + spacing * (nIdx + 1);
        const noteY = lineY + cfg.lineHeight / 2;

        const notePos: NotePosition = {
          index: globalNoteIndex,
          x: noteX,
          y: noteY,
          note,
          measureNumber: measure.number,
          // 直接从 AST 中读取 beamGroup（如果音符有的话）
          beamGroup: note.type === 'note' ? note.beamGroup : undefined,
        };

        notePositions.push(notePos);
        allNotes.push(notePos);
        globalNoteIndex++;
      }

      measureLayouts.push({
        measure,
        x: measureX,
        y: lineY,
        width: measureWidth,
        notes: notePositions,
      });
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
