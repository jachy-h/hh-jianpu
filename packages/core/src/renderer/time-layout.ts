import type { Measure, MeasureLayout, NotePosition, Score, ScoreLayout, LineLayout, LyricsSyllable } from '../types/index.js';
import { durationInBeats, getScoreVoices } from '../music.js';
import { calculateNoteBoundingBox } from './bounding-box.js';
import { groupMeasures } from './line-groups.js';
import type { LayoutConfig } from './layout.js';

// 时值排版横向宽度调试参数；除歌词字符宽度外，均为音符字号的倍数。
// 实际每拍宽度取各项避碰约束的最大值，调小某一项不一定改变最终结果。
const TIME_LAYOUT_SPACING = {
  minMargin: 2.2,           // 谱行两侧最小边距
  minAvailableWidth: 2,     // 分行计算的最小可用宽度
  noteGap: 0.4,             // 相邻符号或歌词之间的额外间隙
  graceStep: 1.4,           // 同拍附件的逐个横向偏移
  accidentalLeft: 1.3,      // 升降号左侧预留
  minInset: 1,              // 小节线到起音位置的最小偏移
  insetPadding: 0.25,      // 最宽左侧内容与普通小节线之间的额外留白
  minPixelsPerBeat: 1.4,   // 每拍宽度的基础下限
  measureEndPadding: 0.25, // 末音与普通小节线之间的额外留白
  repeatPadding: 0.8,      // 反复点和双线的避让空间
  narrowLyricWidth: 0.65,  // 单个西文字符的估算宽度（中文为 1）
} as const;

interface TimedNote {
  readonly position: NotePosition;
  readonly beat: number;
  readonly offset: number;
  readonly lyrics: (LyricsSyllable | undefined)[];
}

/** 以全谱统一的时间比例排列单声部或双声部。 */
export function createTimeLayout(score: Score, cfg: LayoutConfig): ScoreLayout {
  const voices = getScoreVoices(score);
  const font = cfg.noteFontSize;
  const margin = Math.max(cfg.marginLeft, font * TIME_LAYOUT_SPACING.minMargin);
  const available = Math.max(font * TIME_LAYOUT_SPACING.minAvailableWidth, cfg.width - margin * 2);
  const maxMeasures = cfg.measuresPerLine === undefined ? Infinity : Math.max(1, Math.floor(cfg.measuresPerLine));
  const gap = font * TIME_LAYOUT_SPACING.noteGap;
  const indices = voices.map(voice => voice.indexOffset);
  const count = Math.max(...voices.map(voice => voice.measures.length));
  let measureBeat = 0;
  const metrics = Array.from({ length: count }, (_, measureIndex) => {
    const rows = voices.map((voice, voiceIndex) => {
      const measure: Measure = voice.measures[measureIndex] ?? { number: measureIndex + 1, notes: [] };
      let beat = 0;
      let syllableIndex = 0;
      const notes: TimedNote[] = measure.notes.map(note => {
        const duration = durationInBeats(note);
        const lyrics = note.type === 'note' && !note.isGrace
          ? (measure.lyricLines ?? (measure.lyrics ? [measure.lyrics] : [])).map(row => row.syllables[syllableIndex]) : [];
        if (note.type === 'note' && !note.isGrace) syllableIndex++;
        const position: NotePosition = { index: indices[voiceIndex]++, x: 0, y: 0, note,
          measureNumber: measure.number, voiceId: voice.id, startBeat: measureBeat + beat, durationBeats: duration,
          beamGroup: note.type === 'note' || note.type === 'rest' ? note.beamGroup : undefined,
          slurGroup: note.type === 'note' ? note.slurGroup : undefined };
        const result = { position, beat, offset: 0, lyrics };
        beat += duration;
        return result;
      });
      // 不占拍的装饰音/换气排列在同一拍主音左侧，主音仍保持纵向对齐。
      const timed = notes.map((entry, index) => {
        let remaining = 0;
        for (let next = index + 1; next < notes.length && notes[next].beat === entry.beat; next++) {
          const nextNote = notes[next].position.note;
          if (nextNote.type !== 'breath' || !nextNote.barlineSide) remaining++;
        }
        return { ...entry, offset: -remaining * font * TIME_LAYOUT_SPACING.graceStep };
      });
      return { measure, notes: timed, duration: beat };
    });
    const duration = Math.max(...rows.map(row => row.duration));
    measureBeat += duration;
    return { rows, duration, startBeat: measureBeat - duration, width: 0 };
  });

  // 同拍的倚音和换气符作为一组计算边界，不能漏掉主音或附件。
  const groupsByVoice = voices.map((_, voiceIndex) => {
    let measureStart = 0;
    return metrics.map(metric => {
      const groups: { beat: number; left: number; right: number }[] = [];
      for (const entry of metric.rows[voiceIndex].notes) {
        if (entry.position.note.type === 'breath' && entry.position.note.barlineSide) continue;
        const box = calculateNoteBoundingBox(entry.position.note, font, entry.offset, 0).horizontal;
        const lyricWidth = Math.max(0, ...entry.lyrics.map(lyric => lyric && !lyric.isPlaceholder
          ? Array.from(lyric.text).reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 1 : TIME_LAYOUT_SPACING.narrowLyricWidth), 0) * font * cfg.lyricsFontSizeRatio : 0));
        const left = Math.max(-box.left, lyricWidth / 2 - entry.offset,
          entry.position.note.type === 'note' && entry.position.note.accidental ? font * TIME_LAYOUT_SPACING.accidentalLeft - entry.offset : 0);
        const right = Math.max(box.right, lyricWidth / 2 + entry.offset);
        const beat = measureStart + entry.beat;
        const previous = groups[groups.length - 1];
        if (previous && previous.beat === beat) {
          previous.left = Math.max(previous.left, left);
          previous.right = Math.max(previous.right, right);
        } else groups.push({ beat, left, right });
      }
      measureStart += metric.duration;
      return groups;
    });
  });
  const allGroups = groupsByVoice.flat(2);
  // 小节线固定放在起音左侧，给反复记号和最宽附件留空间。
  const repeatInsets = groupsByVoice.flatMap((voiceGroups, voiceIndex) => voiceGroups.flatMap((groups, index) => {
    const first = groups[0];
    const measure = metrics[index].rows[voiceIndex].measure;
    return measure.repeatStart && first && first.beat === metrics[index].startBeat
      ? [first.left + font * TIME_LAYOUT_SPACING.repeatPadding] : [];
  }));
  const inset = Math.max(font * TIME_LAYOUT_SPACING.minInset, ...allGroups.map(group => group.left + font * TIME_LAYOUT_SPACING.insetPadding), ...repeatInsets);
  const edgeSpace = Math.max(inset, ...allGroups.map(group => group.right + gap));
  let pixelsPerBeat = font * TIME_LAYOUT_SPACING.minPixelsPerBeat;
  for (const [voiceIndex, voiceGroups] of groupsByVoice.entries()) {
    let previous: { beat: number; right: number } | undefined;
    let endBeat = 0;
    for (const [index, groups] of voiceGroups.entries()) {
      for (const group of groups) {
        if (previous && group.beat > previous.beat) {
          pixelsPerBeat = Math.max(pixelsPerBeat, (previous.right + group.left + gap) / (group.beat - previous.beat));
        }
        previous = group;
      }
      endBeat += metrics[index].duration;
      // 反复记号只在实际存在时占用额外空间，普通小节线使用较小留白。
      if (previous && endBeat > previous.beat) {
        const measure = metrics[index].rows[voiceIndex].measure;
        const endPadding = measure.repeatEnd || measure.combinedRepeat ? TIME_LAYOUT_SPACING.repeatPadding : TIME_LAYOUT_SPACING.measureEndPadding;
        pixelsPerBeat = Math.max(pixelsPerBeat, (inset + previous.right + font * endPadding) / (endBeat - previous.beat));
      }
    }
  }
  for (const metric of metrics) metric.width = metric.duration * pixelsPerBeat;

  const groups = groupMeasures(metrics, Math.max(font * TIME_LAYOUT_SPACING.minAvailableWidth, available - edgeSpace * 2), maxMeasures, metric => metric.width,
    metric => cfg.respectSourceLineBreaks && metric.rows.some(row => Boolean(row.measure.lineBreakBefore)));

  const allNotes: NotePosition[] = [];
  const lines: LineLayout[] = [];
  let y = cfg.marginTop;
  let width = cfg.width;
  for (const lineGroup of groups) {
    const geometry = voices.map((_, voiceIndex) => {
      let top = font * 1.7;
      let bottom = font * 1.5;
      let hasLyrics = false;
      let lyricRows = 1;
      for (const metric of lineGroup) for (const entry of metric.rows[voiceIndex].notes) {
        const box = calculateNoteBoundingBox(entry.position.note, font, 0, 0).vertical;
        top = Math.max(top, -box.top + (entry.position.slurGroup !== undefined ? font * 1.6 : font * 0.5));
        bottom = Math.max(bottom, box.bottom + font * 0.5);
        hasLyrics ||= entry.lyrics.some(lyric => lyric && !lyric.isPlaceholder);
        lyricRows = Math.max(lyricRows, entry.lyrics.length);
      }
      const lyricY = top + bottom + font * cfg.lyricsFontSizeRatio;
      return { top, lyricY, height: lyricY + (hasLyrics ? font * 0.6 : 0) + (lyricRows - 1) * font * cfg.lyricsFontSizeRatio * 1.6 };
    });
    const rowY = [y, y + geometry[0].height + gap];
    const measures: MeasureLayout[][] = voices.map(() => []);
    let x = margin + edgeSpace;
    for (const metric of lineGroup) {
      const measureWidth = metric.width;
      metric.rows.forEach((row, voiceIndex) => {
        const geo = geometry[voiceIndex];
        const notes = row.notes.map(entry => {
          const position = { ...entry.position,
            x: x + inset + entry.beat * pixelsPerBeat + entry.offset,
            y: rowY[voiceIndex] + geo.top };
          const note = position.note;
          if (note.type === 'breath' && note.barlineSide) {
            position.x = note.barlineSide === 'start' ? x : x + measureWidth;
            position.y = rowY[voiceIndex] + 16 - font * 0.65;
          }
          allNotes.push(position);
          return position;
        });
        const lyrics = row.notes.flatMap((entry, index) => entry.lyrics.flatMap((lyric, verse) => lyric ? [{ ...lyric, x: notes[index].x,
          y: rowY[voiceIndex] + geo.lyricY + verse * font * cfg.lyricsFontSizeRatio * 1.6, noteIndex: notes[index].index }] : []));
        measures[voiceIndex].push({ measure: row.measure, voiceId: voices[voiceIndex].id, x, y: rowY[voiceIndex],
          width: measureWidth, height: geo.height, notes, lyrics,
          timeGeometry: { startBeat: metric.startBeat, endBeat: metric.startBeat + metric.duration, originX: x + inset, pixelsPerBeat } });
      });
      x += measureWidth;
    }
    const height = geometry[0].height + (geometry[1] ? gap + geometry[1].height : 0);
    lines.push({ measures: measures[0], secondaryMeasures: measures[1], y, height });
    width = Math.max(width, x + edgeSpace + margin);
    y += height + Math.max(cfg.lineGap, font * 2);
  }
  // 全曲索引按声部连续排列，和调度、编辑器源码映射共享同一规则。
  allNotes.sort((a, b) => a.index - b.index);
  return { width, height: y, lines, allNotes };
}
