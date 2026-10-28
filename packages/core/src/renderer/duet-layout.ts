import type { Measure, MeasureLayout, NotePosition, Score, ScoreLayout, LineLayout, LyricsSyllable } from '../types/index.js';
import { durationInBeats, getScoreVoices } from '../music.js';
import { calculateNoteBoundingBox } from './bounding-box.js';
import type { LayoutConfig } from './layout.js';

interface TimedNote {
  readonly position: NotePosition;
  readonly beat: number;
  readonly offset: number;
  readonly lyrics: (LyricsSyllable | undefined)[];
}

/** 合并上下声部起拍点，按两行符号的共同最小间距生成整组联谱。 */
export function createDuetLayout(score: Score, cfg: LayoutConfig): ScoreLayout {
  const voices = getScoreVoices(score);
  const font = cfg.noteFontSize;
  const margin = Math.max(cfg.marginLeft, font * 2.2);
  const available = Math.max(font * 2, cfg.width - margin * 2);
  const maxMeasures = cfg.measuresPerLine === undefined ? Infinity : Math.max(1, Math.floor(cfg.measuresPerLine));
  const gap = font * 0.7;
  const padding = font;
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
        return { ...entry, offset: -remaining * font * 1.4 };
      });
      return { measure, notes: timed, duration: beat };
    });
    const duration = Math.max(...rows.map(row => row.duration));
    const isAnchored = (entry: TimedNote): boolean => entry.position.note.type === 'breath' && Boolean(entry.position.note.barlineSide);
    const beats = [...new Set(rows.flatMap(row => row.notes.filter(entry => !isAnchored(entry)).map(note => note.beat)))].sort((a, b) => a - b);
    const leftPadding = padding + (rows.some(row => row.measure.repeatStart) ? font : 0);
    const rightPadding = padding + (rows.some(row => row.measure.repeatEnd) ? font : 0);
    let cursor = leftPadding;
    let previousRight = 0;
    let previousBeat = 0;
    const centers = new Map<number, number>();
    for (const beat of beats) {
      let left = font * 0.4;
      let right = font * 0.4;
      for (const row of rows) for (const entry of row.notes.filter(note => note.beat === beat && !isAnchored(note))) {
        const box = calculateNoteBoundingBox(entry.position.note, font, entry.offset, 0).horizontal;
        const lyricWidth = Math.max(0, ...entry.lyrics.map(lyric => lyric && !lyric.isPlaceholder
          ? Array.from(lyric.text).reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 1 : 0.65), 0) * font * cfg.lyricsFontSizeRatio : 0));
        left = Math.max(left, -box.left, lyricWidth / 2 - entry.offset, entry.position.note.type === 'note' && entry.position.note.accidental ? font * 1.3 - entry.offset : 0);
        right = Math.max(right, box.right, lyricWidth / 2 + entry.offset);
      }
      cursor += centers.size ? Math.max(previousRight + gap + left, (beat - previousBeat) * font * 2) : left;
      centers.set(beat, cursor);
      previousRight = right;
      previousBeat = beat;
    }
    const minimumWidth = cursor + previousRight + rightPadding;
    const width = Math.max(available / maxMeasures, minimumWidth);
    measureBeat += duration;
    return { rows, centers, duration, minimumWidth, width };
  });

  const groups: (typeof metrics)[] = [];
  let group: typeof metrics = [];
  let groupWidth = 0;
  for (const metric of metrics) {
    if (group.length && (metric.rows.some(row => row.measure.lineBreakBefore) || group.length >= maxMeasures || groupWidth + metric.width > available + 0.01)) {
      groups.push(group); group = []; groupWidth = 0;
    }
    group.push(metric); groupWidth += metric.width;
  }
  if (group.length) groups.push(group);

  const allNotes: NotePosition[] = [];
  const lines: LineLayout[] = [];
  let y = cfg.marginTop;
  let width = cfg.width;
  for (const lineGroup of groups) {
    const extraWidth = cfg.measuresPerLine === undefined
      ? Math.max(0, available - lineGroup.reduce((sum, metric) => sum + metric.width, 0)) / lineGroup.length : 0;
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
    const measures: MeasureLayout[][] = [[], []];
    let x = margin;
    for (const metric of lineGroup) {
      const measureWidth = metric.width + extraWidth;
      metric.rows.forEach((row, voiceIndex) => {
        const geo = geometry[voiceIndex];
        const notes = row.notes.map(entry => {
          const extra = measureWidth - metric.minimumWidth;
          const position = { ...entry.position,
            x: x + (metric.centers.get(entry.beat) ?? padding) + entry.offset + extra * (metric.duration ? entry.beat / metric.duration : 0),
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
          width: measureWidth, height: geo.height, notes, lyrics });
      });
      x += measureWidth;
    }
    const height = geometry[0].height + gap + geometry[1].height;
    lines.push({ measures: measures[0], secondaryMeasures: measures[1], y, height });
    width = Math.max(width, x + margin);
    y += height + Math.max(cfg.lineGap, font * 2);
  }
  // 全曲索引按声部连续排列，和调度、编辑器源码映射共享同一规则。
  allNotes.sort((a, b) => a.index - b.index);
  return { width, height: y, lines, allNotes };
}
