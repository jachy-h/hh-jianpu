import type { ScoreLayout, NotePosition } from '@hh-jianpu/core';

export interface SlurSegment {
  readonly voiceId?: 'upper' | 'lower';
  readonly group: number;
  readonly line: number;
  readonly notes: readonly NotePosition[];
  readonly path: string;
}

/** 跨行圆滑线在行尾/行首延伸，避免从一行末尾斜穿到下一行。 */
export function createSlurSegments(layout: ScoreLayout, fontSize: number): SlurSegment[] {
  const groups = new Map<string, NotePosition[]>();
  for (const note of layout.allNotes) {
    if (note.slurGroup === undefined) continue;
    const key = `${note.voiceId ?? 'upper'}:${note.slurGroup}`;
    const notes = groups.get(key) ?? [];
    notes.push(note);
    groups.set(key, notes);
  }
  const segments: SlurSegment[] = [];
  for (const notes of groups.values()) {
    if (notes.length < 2) continue;
    for (const [lineIndex, line] of layout.lines.entries()) {
      const row = notes[0].voiceId === 'lower' ? line.secondaryMeasures ?? [] : line.measures;
      const lineNotes = notes.filter((note) => row.some((measure) => measure.measure.number === note.measureNumber));
      if (lineNotes.length === 0) continue;
      const first = lineNotes[0];
      const last = lineNotes[lineNotes.length - 1];
      const firstMeasure = row[0];
      const lastMeasure = row[row.length - 1];
      const startX = first === notes[0] ? first.x : firstMeasure.x + fontSize * 0.2;
      const endX = last === notes[notes.length - 1] ? last.x : lastMeasure.x + lastMeasure.width - fontSize * 0.2;
      const symbolClearance = lineNotes.reduce((clearance, position) => {
        const note = position.note;
        if (note.type !== 'note') return clearance;
        return Math.max(clearance, note.trillType ? 34 : 0, note.articulation ? 40 : 0, note.octave > 0 ? fontSize * 0.7 + (note.octave - 1) * 4 + 12 : 0);
      }, 0);
      const y = first.y - Math.max(24, fontSize * 1.4, symbolClearance);
      segments.push({ group: first.slurGroup!, voiceId: first.voiceId, line: lineIndex, notes: lineNotes, path: `M ${startX},${y} Q ${(startX + endX) / 2},${y - fontSize} ${endX},${y}` });
    }
  }
  return segments;
}
