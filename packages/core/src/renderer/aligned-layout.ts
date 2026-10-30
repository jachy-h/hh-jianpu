import type { LineLayout, MeasureLayout, NotePosition, ScoreLayout } from '../types/index.js';
import { durationInBeats } from '../music.js';
import { calculateNoteBoundingBox } from './bounding-box.js';

interface Entry { note: NotePosition; beat: number; offset: number; left: number; right: number }
interface Column { width: number; centers: Map<number, number> }

/** 按行内序号共享小节列和起拍点，宽度不足时继续拆行。 */
export function alignScoreLayout(layout: ScoreLayout, font: number, margin: number, lineGap: number): ScoreLayout {
  const available = Math.max(font * 2, layout.width - margin * 2);
  const entries = (measure: MeasureLayout): Entry[] => {
    let beat = 0;
    const result: Entry[] = [];
    for (const [i, note] of measure.notes.entries()) {
      const duration = durationInBeats(note.note);
      if (note.note.type === 'breath' && note.note.barlineSide) continue;
      let remaining = 0;
      if (duration === 0) {
        for (let j = i + 1; j < measure.notes.length; j++) {
          const next = measure.notes[j];
          if (next.note.type === 'breath' && next.note.barlineSide) continue;
          remaining++;
          if (durationInBeats(next.note) > 0) break;
        }
      }
      const offset = -remaining * font * 1.4;
      const box = calculateNoteBoundingBox(note.note, font, offset, 0).horizontal;
      const lyric = measure.lyrics?.filter(item => item.noteIndex === note.index && !item.isPlaceholder) ?? [];
      const lyricWidth = Math.max(0, ...lyric.map(item => Array.from(item.text).reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 1 : 0.65), 0) * font * 0.85));
      result.push({ note, beat, offset, left: Math.max(-box.left, lyricWidth / 2 - offset, font * 0.4), right: Math.max(box.right, lyricWidth / 2 + offset, font * 0.4) });
      beat += duration;
    }
    return result;
  };
  const rows = layout.lines.map(line => ({ ...line, measures: [...line.measures], secondaryMeasures: line.secondaryMeasures ? [...line.secondaryMeasures] : undefined }));
  const columnsFor = (): Column[] => {
    const count = Math.max(0, ...rows.map(row => row.measures.length));
    return Array.from({ length: count }, (_, column) => {
      const measures = rows.flatMap(row => [row.measures[column], row.secondaryMeasures?.[column]].filter((item): item is MeasureLayout => Boolean(item)));
      const all = measures.flatMap(entries);
      const beats = [...new Set(all.map(item => item.beat))].sort((a, b) => a - b);
      const centers = new Map<number, number>();
      let cursor = font * 0.8;
      let right = 0;
      let prev = 0;
      for (const beat of beats) {
        const atBeat = all.filter(item => item.beat === beat);
        const left = Math.max(...atBeat.map(item => item.left));
        cursor += centers.size ? Math.max(right + left + font * 0.4, Math.sqrt(beat - prev) * font * 1.8) : left;
        centers.set(beat, cursor);
        right = Math.max(...atBeat.map(item => item.right));
        prev = beat;
      }
      const repeatPadding = measures.some(item => item.measure.repeatStart || item.measure.repeatEnd) ? font * 2 : 0;
      if (repeatPadding && centers.size) for (const [beat, x] of centers) centers.set(beat, x + font);
      return { centers, width: Math.max(font * 2, cursor + right + font * 0.8 + repeatPadding) };
    });
  };
  let columns = columnsFor();
  // 每次拆分都会减少某一行的小节数，因而必然结束。
  for (;;) {
    const index = rows.findIndex(row => row.measures.length > 1 && columns.slice(0, row.measures.length).reduce((sum, col) => sum + col.width, 0) > available + 0.01);
    if (index < 0) break;
    const row = rows[index];
    const split = Math.max(1, Math.ceil(row.measures.length / 2));
    rows.splice(index, 1, { ...row, measures: row.measures.slice(0, split), secondaryMeasures: row.secondaryMeasures?.slice(0, split) },
      { ...row, measures: row.measures.slice(split), secondaryMeasures: row.secondaryMeasures?.slice(split) });
    columns = columnsFor();
  }
  let y = layout.lines[0]?.y ?? 0;
  const allNotes: NotePosition[] = [];
  const lines: LineLayout[] = rows.map(row => {
    const dy = y - row.y;
    let x = margin;
    const remap = (measure: MeasureLayout, col: Column, start: number): MeasureLayout => {
      const positions = entries(measure);
      const notes = measure.notes.map(note => {
        const entry = positions.find(item => item.note.index === note.index);
        const position = { ...note, x: entry ? start + (col.centers.get(entry.beat) ?? 0) + entry.offset : start + (note.note.type === 'breath' && note.note.barlineSide === 'end' ? col.width : 0), y: note.y + dy };
        allNotes.push(position);
        return position;
      });
      return { ...measure, x: start, y: measure.y + dy, width: col.width, notes,
        lyrics: measure.lyrics?.map(lyric => ({ ...lyric, x: notes.find(note => note.index === lyric.noteIndex)?.x ?? lyric.x, y: lyric.y + dy })) };
    };
    const primary: MeasureLayout[] = [];
    const secondary: MeasureLayout[] = [];
    row.measures.forEach((measure, index) => {
      primary.push(remap(measure, columns[index], x));
      if (row.secondaryMeasures?.[index]) secondary.push(remap(row.secondaryMeasures[index], columns[index], x));
      x += columns[index].width;
    });
    const line = { ...row, y, measures: primary, secondaryMeasures: row.secondaryMeasures ? secondary : undefined };
    y += row.height + lineGap;
    return line;
  });
  allNotes.sort((a, b) => a.index - b.index);
  return { ...layout, width: Math.max(layout.width, margin * 2 + Math.max(0, ...columns.map(col => col.width))), height: y, lines, allNotes };
}
