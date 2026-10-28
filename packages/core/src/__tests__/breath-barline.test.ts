import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { createLayout } from '../renderer/layout.js';
import { scoreToSource } from '../parser/transpose.js';

const examples = [
  '1 v ||', '1 || V',
  '||: 1 v :||: 2 :||', '||: 1 :||: v 2 :||',
  '1 v | 2 |', '1 | v 2 |', '1 | V', '1v|2|',
  'v ||: 1 :||', '||: v 1 :||', '||: 1 v :||', '||: 1 :|| v',
  '1 v |\n2 |', '1 |\nv 2 |',
];

describe('小节线上的换气记号', () => {
  it.each(['|v', '| V', ':|| v'])('行尾 %s 的换气不消耗下一小节的换行和源码起点', boundary => {
    const source = `1 - - - ${boundary}\n(#4 - 2) - | 3 - - - ||`;
    const result = parse(source);
    expect(result.errors).toEqual([]);
    const measures = result.score!.measures;
    expect(measures.map(measure => measure.lineBreakBefore)).toEqual([false, true, false]);
    expect(measures.map(measure => measure.sourceLine)).toEqual([1, 2, 2]);
    expect(source.slice(measures[1].sourceRange!.from, measures[1].sourceRange!.to)).toContain('#4');
    expect(source.slice(measures[1].sourceRange!.from, measures[1].sourceRange!.to)).not.toContain('v');
    expect(measures[0].notes[measures[0].notes.length - 1]).toMatchObject({ type: 'breath', barlineSide: 'end' });
  });

  for (const source of examples) {
    for (const duet of [false, true]) {
      for (const font of [18, 30]) {
        it(`${font}px ${duet ? '双' : '单'}声部正确锚定 ${JSON.stringify(source)}`, () => {
          const wrap = (melody: string): string => 'time: 1/4\n' + (duet
            ? `Q[upper] ${melody.replace(/\n/g, '\nQ[upper] ')}\nQ[lower] ${melody.replace(/\n/g, '\nQ[lower] ')}` : melody);
          const result = parse(wrap(source));
          expect(result.errors).toEqual([]);
          const score = result.score!;
          expect(score.measures.every(measure => measure.notes.some(note => note.type === 'note'))).toBe(true);
          const config = { width: 360, measuresPerLine: 1, noteFontSize: font };
          const layout = createLayout(score, config);
          const plain = createLayout(parse(wrap(source.replace(/[vV]/g, ''))).score!, config);
          expect(layout.allNotes.filter(position => position.note.type === 'note').map(position => position.x))
            .toEqual(plain.allNotes.filter(position => position.note.type === 'note').map(position => position.x));
          expect(layout.allNotes.map(position => position.index)).toEqual(layout.allNotes.map((_, index) => index));
          for (const line of layout.lines) {
            for (const measure of [...line.measures, ...(line.secondaryMeasures ?? [])]) {
              for (const position of measure.notes.filter(position => position.note.type === 'breath')) {
                expect(position.note.type === 'breath' && position.note.barlineSide).toBeTruthy();
                expect(position.x).toBe(position.note.type === 'breath' && position.note.barlineSide === 'start' ? measure.x : measure.x + measure.width);
                expect(position.y - 8 + (font + 2) / 2).toBeLessThan(measure.y + 8);
              }
            }
          }
          const reparsed = parse(scoreToSource(score));
          expect(reparsed.errors).toEqual([]);
          expect(reparsed.score!.measures.map(measure => measure.notes.filter(note => note.type === 'breath'))).toEqual(score.measures.map(measure => measure.notes.filter(note => note.type === 'breath')));
        });
      }
    }
  }

  it('保留小节内部与没有相邻小节线的首尾换气符号', () => {
    const result = parse('v 1 v 2 3 4 v');
    expect(result.errors).toEqual([]);
    const breaths = createLayout(result.score!).allNotes.filter(position => position.note.type === 'breath');
    expect(breaths).toHaveLength(3);
    expect(breaths.every(position => position.note.type === 'breath' && !position.note.barlineSide)).toBe(true);
    expect(new Set(breaths.map(position => position.x)).size).toBe(3);
  });
});
