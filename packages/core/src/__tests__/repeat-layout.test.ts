import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser';
import { createLayout } from '../renderer/layout';
import { calculateNoteBoundingBox } from '../renderer/bounding-box';

describe('反复符号布局', () => {
  for (const font of [18, 24, 30]) {
    for (const duet of [false, true]) {
      it(`为 ${font}px ${duet ? '双' : '单'}声部反复预留空间并保持原谱索引`, () => {
        const melody = "||: #1 2 3 4 :|| ||: 5 6 7 1' :||";
        const source = duet ? `Q[upper] ${melody}\nQ[lower] ${melody}` : melody;
        const result = parse(source);
        expect(result.errors).toEqual([]);
        const layout = createLayout(result.score!, { width: 360, measuresPerLine: 1, noteFontSize: font });
        expect(layout.lines).toHaveLength(2);
        expect(layout.allNotes).toHaveLength(duet ? 16 : 8);
        expect(layout.allNotes.map(note => note.index)).toEqual(Array.from({ length: duet ? 16 : 8 }, (_, index) => index));
        for (const line of layout.lines) {
          for (const measure of [...line.measures, ...(line.secondaryMeasures ?? [])]) {
            for (const position of measure.notes) {
              const box = calculateNoteBoundingBox(position.note, font, position.x, position.y).horizontal;
              expect(box.left).toBeGreaterThan(measure.x + font * 0.8);
              expect(box.right).toBeLessThan(measure.x + measure.width - font * 0.8);
            }
          }
          if (line.secondaryMeasures) {
            expect(line.measures[0].notes.map(note => note.x)).toEqual(line.secondaryMeasures[0].notes.map(note => note.x));
          }
        }
      });
    }
  }
});
