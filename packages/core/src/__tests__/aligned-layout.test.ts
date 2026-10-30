import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createLayout } from '../renderer/layout.js';

describe('小节对齐排版', () => {
  it('对齐同列小节与相同拍点，歌词跟随音符', () => {
    const score = parse('Q 3 3 3 | 1 2 3 |\nC 高高的青山上\nQ 5/ 1/ 5 - | 1 2 3 |\nC 送给我青山上').score!;
    const layout = createLayout(score, { width: 900, layoutMode: 'aligned' });
    const a = layout.lines[0].measures[0];
    const b = layout.lines[1].measures[0];
    expect(a.x).toBe(b.x);
    expect(a.width).toBe(b.width);
    expect(a.notes[0].x).toBe(b.notes[0].x);
    expect(a.notes[1].x).toBe(b.notes[2].x);
    expect(b.notes[1].x).toBeGreaterThan(b.notes[0].x);
    expect(b.notes[1].x).toBeLessThan(b.notes[2].x);
    expect(b.lyrics?.[1].x).toBe(b.notes[1].x);
  });
  it('窄屏拆行后小节均不丢失且保留音符索引', () => {
    const score = parse('Q 1 2 3 | 4 5 6 | 1 2 3 |\nQ 5/ 1/ 5 - | 1 2 3 | 4 5 6 |').score!;
    const layout = createLayout(score, { width: 320, noteFontSize: 24, layoutMode: 'aligned' });
    expect(layout.lines.flatMap(line => line.measures).map(m => m.measure.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(layout.allNotes.map(note => note.index)).toEqual(layout.allNotes.map((_, index) => index));
    expect(layout.lines.every(line => line.measures.at(-1)!.x + line.measures.at(-1)!.width <= layout.width - 40 + 0.01)).toBe(true);
  });
});
