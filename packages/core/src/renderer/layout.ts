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
import { createDuetLayout } from './duet-layout.js';
import { calculateDynamicSpacing } from './dynamic-spacing.js';
import { calculateNoteBoundingBox } from './bounding-box.js';

/** 布局配置 */
export interface LayoutConfig {
  /** 总宽度（px） */
  width: number;
  /** 可选的每行小节数上限；省略时遵循源码换行，仅在宽度不足时拆行。 */
  measuresPerLine?: number;
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
  if (score.secondaryVoice) return createDuetLayout(score, cfg);
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
        const syllable = measure.lyrics?.syllables[syllableIndex++];
        if (syllable && !syllable.isPlaceholder) {
          // CJK 全角字占一格，ASCII 使用保守的 0.65 格估计。
          const units = Array.from(syllable.text).reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 1 : 0.65), 0);
          lyricWidth = units * cfg.noteFontSize * cfg.lyricsFontSizeRatio;
        }
      }
      return Math.max(spacing, 2 * Math.max(-box.left, box.right), note.type === 'note' && note.accidental ? cfg.noteFontSize * 1.5 : 0, lyricWidth + cfg.noteFontSize * 0.4);
    });
    const leftPadding = padding + (measure.repeatStart ? cfg.noteFontSize : 0);
    const rightPadding = padding + (measure.repeatEnd ? cfg.noteFontSize : 0);
    return { measure, slots, leftPadding, rightPadding, width: Math.max(baseWidth, leftPadding + rightPadding + slots.reduce((sum, slot) => sum + slot, 0)) };
  });

  const groups: (typeof metrics)[] = [];
  let group: typeof metrics = [];
  let groupWidth = 0;
  for (const metric of metrics) {
    if (group.length > 0 && (metric.measure.lineBreakBefore || group.length >= maxMeasures || groupWidth + metric.width > availableWidth + 0.01)) {
      groups.push(group);
      group = [];
      groupWidth = 0;
    }
    group.push(metric);
    groupWidth += metric.width;
  }
  if (group.length > 0) groups.push(group);

  const lines: LineLayout[] = [];
  const allNotes: NotePosition[] = [];
  let layoutWidth = cfg.width;
  for (const [lineIndex, lineGroup] of groups.entries()) {
    const lineY = cfg.marginTop + lineIndex * (cfg.lineHeight + cfg.lineGap);
    let currentX = cfg.marginLeft;
    const measures: MeasureLayout[] = [];
    // 自动排版按内容决定能容纳的小节数，再均分余白，避免固定小节宽度挤掉源码分行。
    const extraWidth = cfg.measuresPerLine === undefined
      ? Math.max(0, availableWidth - lineGroup.reduce((sum, metric) => sum + metric.width, 0)) / lineGroup.length : 0;
    for (const metric of lineGroup) {
      const { measure, slots, leftPadding, rightPadding } = metric;
      const width = metric.width + extraWidth;
      const spare = Math.max(0, width - leftPadding - rightPadding - slots.reduce((sum, slot) => sum + slot, 0));
      let cursor = currentX + leftPadding + spare / 2;
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
    lines.push({ measures, y: lineY, height: cfg.lineHeight });
  }
  return {
    width: layoutWidth,
    height: lines.length > 0 ? lines[lines.length - 1].y + cfg.lineHeight + cfg.lineGap : cfg.marginTop,
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
