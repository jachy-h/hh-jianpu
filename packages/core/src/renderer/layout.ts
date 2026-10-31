// ============================================================
// Layout Engine — 将 Score AST 计算为可渲染的布局信息
// ============================================================

import type {
  Score,
  ScoreLayout,
  LineLayout,
  MeasureLayout,
  NotePosition,
  LyricsPosition,
  Measure,
} from '../types/index.js';
import { alignScoreLayout } from './aligned-layout.js';
import { groupMeasures } from './line-groups.js';
import { durationInBeats } from '../music.js';
import { createTimeLayout } from './time-layout.js';
import { createDuetLayout } from './duet-layout.js';
import { calculateDynamicSpacing } from './dynamic-spacing.js';
import { calculateNoteBoundingBox } from './bounding-box.js';

/** 布局配置 */
export interface LayoutConfig {
  /** 总宽度（px） */
  width: number;
  /** 可选的每行小节数上限；省略时遵循源码换行，仅在宽度不足时拆行。 */
  measuresPerLine?: number;
  /** 是否遵循源码中的显式换行，默认 true。 */
  respectSourceLineBreaks: boolean;
  /** 排版模式：自然间距或按小节列和拍点对齐。 */
  layoutMode: 'natural' | 'aligned' | 'time';
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
  layoutMode: 'natural',
  respectSourceLineBreaks: true,
  noteSpacing: 40,
  noteFontSize: 18,
  lineHeight: 60,
  lineGap: 30,
  marginLeft: 40,
  marginTop: 100,  // 增加顶部边距以容纳扩展元信息
  lyricsOffset: 16,
  lyricsFontSizeRatio: 0.85,
};

/**
 * 计算曲谱布局
 */
export function createLayout(score: Score, config: Partial<LayoutConfig> = {}): ScoreLayout {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  if (cfg.layoutMode === 'time') return createTimeLayout(score, cfg);
  if (score.secondaryVoice) {
    const layout = createDuetLayout(score, cfg);
    return cfg.layoutMode === 'aligned' ? alignScoreLayout(layout, cfg.noteFontSize, Math.max(cfg.marginLeft, cfg.noteFontSize * 2.2), Math.max(cfg.lineGap, cfg.noteFontSize * 2)) : layout;
  }
  cfg.lineHeight = Math.max(cfg.lineHeight, cfg.noteFontSize * 3.3);
  cfg.lineGap = Math.max(cfg.lineGap, cfg.noteFontSize * 1.6);
  cfg.lyricsOffset = config.lyricsOffset ?? cfg.noteFontSize * DEFAULT_LAYOUT_CONFIG.lyricsOffset / 18;
  const availableWidth = Math.max(cfg.noteFontSize * 2, cfg.width - cfg.marginLeft * 2);
  const maxMeasures = cfg.measuresPerLine === undefined ? Infinity : Math.max(1, Math.floor(cfg.measuresPerLine));
  const baseWidth = availableWidth / maxMeasures;
  const padding = cfg.noteFontSize * 0.8;
  // 每个音符拥有独立的空间；长歌词组会扩展该音符的空间，避免与相邻歌词重叠。
  const metrics = score.measures.map((measure) => {
    const spacing = calculateDynamicSpacing(measure.notes.filter(note => note.type !== 'breath' || !note.barlineSide), cfg.noteFontSize);
    let syllableIndex = 0;
    const slots = measure.notes.map((note) => {
      if (note.type === 'breath' && note.barlineSide) return 0;
      const box = calculateNoteBoundingBox(note, cfg.noteFontSize, 0, 0).horizontal;
      let lyricWidth = 0;
      if (note.type === 'note' && !note.isGrace) {
        const syllables = (measure.lyricLines ?? (measure.lyrics ? [measure.lyrics] : [])).map(row => row.syllables[syllableIndex]);
        syllableIndex++;
        for (const syllable of syllables) if (syllable && !syllable.isPlaceholder) {
          // CJK 全角字占一格，ASCII 使用保守的 0.65 格估计。
          const units = Array.from(syllable.text).reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 1 : 0.65), 0);
          lyricWidth = Math.max(lyricWidth, units * cfg.noteFontSize * cfg.lyricsFontSizeRatio);
        }
      }
      return Math.max(spacing, 2 * Math.max(-box.left, box.right), note.type === 'note' && note.accidental ? cfg.noteFontSize * 1.5 : 0, lyricWidth + cfg.noteFontSize * 0.4);
    });
    const leftPadding = padding + (measure.repeatStart ? cfg.noteFontSize : 0);
    const rightPadding = padding + (measure.repeatEnd ? cfg.noteFontSize : 0);
    const weights = measure.notes.map((note, index) => slots[index] === 0 ? 0 : Math.sqrt(Math.max(0.25, durationInBeats(note))) * cfg.noteFontSize * 1.8);
    return { measure, slots, weights, leftPadding, rightPadding, width: Math.max(baseWidth, leftPadding + rightPadding + slots.reduce((sum, slot) => sum + slot, 0)) };
  });

  const groups = groupMeasures(metrics, availableWidth, maxMeasures, metric => metric.width,
    metric => cfg.respectSourceLineBreaks && Boolean(metric.measure.lineBreakBefore));

  const lines: LineLayout[] = [];
  const allNotes: NotePosition[] = [];
  let layoutWidth = cfg.width;
  let lineY = cfg.marginTop;
  const scales: number[] = [];
  for (const [lineIndex, lineGroup] of groups.entries()) {
    const rowCount = Math.max(1, ...lineGroup.map(({ measure }) => measure.lyricLines?.length ?? 1));
    const lineHeight = cfg.lineHeight + (rowCount - 1) * cfg.noteFontSize * cfg.lyricsFontSizeRatio * 1.6;
    let currentX = cfg.marginLeft;
    const measures: MeasureLayout[] = [];
    const rowWidth = (scale: number): number => lineGroup.reduce((sum, metric) => sum + Math.max(metric.width,
      metric.leftPadding + metric.rightPadding + metric.slots.reduce((total, slot, i) => total + Math.max(slot, metric.weights[i] * scale), 0)), 0);
    let low = 0;
    let high = 1;
    while (rowWidth(high) < availableWidth && high < 1024) high *= 2;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      if (rowWidth(mid) <= availableWidth) low = mid; else high = mid;
    }
    let scale = Math.min(low, 1.5);
    if (lineIndex === groups.length - 1 || lineGroup.length === 1) {
      const sorted = [...scales].sort((a, b) => a - b);
      const reference = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;
      if (rowWidth(reference) < availableWidth * 0.75) scale = Math.min(scale, reference);
    }
    scales.push(scale);
    for (const metric of lineGroup) {
      const { measure, leftPadding, rightPadding } = metric;
      const slots = metric.slots.map((slot, i) => Math.max(slot, metric.weights[i] * scale));
      const width = Math.max(metric.width, leftPadding + rightPadding + slots.reduce((sum, slot) => sum + slot, 0));
      let cursor = currentX + leftPadding;
      const notes = measure.notes.map((note, index): NotePosition => {
        const slot = slots[index];
        const position: NotePosition = {
          index: allNotes.length,
          x: cursor + slot / 2,
          y: lineY + cfg.lineHeight / 2,
          note,
          measureNumber: measure.number,
          beamGroup: note.type === 'note' || note.type === 'rest' ? note.beamGroup : undefined,
          slurGroup: note.type === 'note' ? note.slurGroup : undefined,
        };
        if (note.type === 'breath' && note.barlineSide) {
          position.x = note.barlineSide === 'start' ? currentX : currentX + width;
          position.y = lineY + 16 - cfg.noteFontSize * 0.65;
        }
        cursor += slot;
        allNotes.push(position);
        return position;
      });
      measures.push({ measure, x: currentX, y: lineY, width, notes, lyrics: calculateLyricsPositions(measure, notes, lineY, cfg) });
      currentX += width;
    }
    layoutWidth = Math.max(layoutWidth, currentX + cfg.marginLeft);
    lines.push({ measures, y: lineY, height: lineHeight });
    lineY += lineHeight + Math.max(cfg.lineGap, cfg.lyricsOffset + cfg.noteFontSize * 0.6);
  }
  const layout = { width: layoutWidth, height: lineY, lines, allNotes };
  return cfg.layoutMode === 'aligned' ? alignScoreLayout(layout, cfg.noteFontSize, cfg.marginLeft, Math.max(cfg.lineGap, cfg.lyricsOffset + cfg.noteFontSize * 0.6)) : layout;
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
  const rows = measure.lyricLines ?? (measure.lyrics ? [measure.lyrics] : []);
  const positions = rows.flatMap((row, rowIndex) => {
    let syllableIndex = 0;
    return notePositions.flatMap(notePos => {
      if (notePos.note.type !== 'note' || notePos.note.isGrace) return [];
      const syllable = row.syllables[syllableIndex++];
      return syllable ? [{ ...syllable, x: notePos.x,
        y: lineY + config.lineHeight + config.lyricsOffset + rowIndex * config.noteFontSize * config.lyricsFontSizeRatio * 1.6,
        noteIndex: notePos.index }] : [];
    });
  });
  return positions.length ? positions : undefined;
}
