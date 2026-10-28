import { describe, expect, it } from 'vitest';
import { createLayout } from '../renderer/layout';
import { parse } from '../parser/parser';
import type { Measure, Score } from '../types';

function measure(number: number, count = 4): Measure {
  return { number, notes: Array.from({ length: count }, () => ({ type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false })) };
}
function score(measures: Measure[]): Score {
  return { metadata: { key: 'C', timeSignature: { beats: 4, beatValue: 4 }, tempo: 120 }, measures };
}

describe('容器自适应排版', () => {
  it.each([false, true])('%s 双声部模式按源码保留超过四小节的行，窄屏仅追加拆行', duet => {
    const first = Array(5).fill('1 - - - |v').join(' ');
    const second = Array(6).fill('2 - - - |v').join(' ');
    const source = duet
      ? `Q[upper] ${first}\nQ[upper] ${second}\nQ[lower] ${first}\nQ[lower] ${second}`
      : `${first}\n${second}`;
    const result = parse(source);
    expect(result.errors).toEqual([]);
    const wide = createLayout(result.score!, { width: 1600 });
    expect(wide.lines.map(line => line.measures.map(item => item.measure.number)))
      .toEqual([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]]);
    const narrow = createLayout(result.score!, { width: 360 });
    expect(narrow.lines.length).toBeGreaterThan(2);
    expect(narrow.lines.some(line => line.measures[0].measure.number === 6)).toBe(true);
    expect(narrow.lines.flatMap(line => line.measures.map(item => item.measure.number)))
      .toEqual(Array.from({ length: 11 }, (_, index) => index + 1));
    for (const layout of [wide, narrow]) {
      expect(layout.width).toBe(layout === wide ? 1600 : 360);
      for (const line of layout.lines) {
        if (duet) expect(line.secondaryMeasures!.map(item => [item.x, item.width]))
          .toEqual(line.measures.map(item => [item.x, item.width]));
        for (const item of [...line.measures, ...(line.secondaryMeasures ?? [])]) {
          expect(item.x + item.width).toBeLessThanOrEqual(layout.width - 40 + 0.01);
          for (const note of item.notes) {
            if (note.note.type === 'breath') expect(note.x).toBe(item.x + item.width);
            else expect(note.x > item.x && note.x < item.x + item.width).toBe(true);
          }
        }
      }
    }
  });

  it('自动排版根据字号和歌词宽度拆行，并保留源码边界', () => {
    const a = measure(1);
    const b = measure(2);
    const c = { ...measure(3), lineBreakBefore: true };
    const original = score([a, b, c]);
    expect(createLayout(original, { width: 400 }).lines.map(line => line.measures.length)).toEqual([2, 1]);
    expect(createLayout(original, { width: 400, noteFontSize: 36 }).lines.map(line => line.measures.length)).toEqual([1, 1, 1]);
    a.lyrics = { syllables: [{ text: '需要预留宽度的一组长歌词', isGroup: true, isPlaceholder: false }] };
    expect(createLayout(original, { width: 400 }).lines.map(line => line.measures.length)).toEqual([1, 1, 1]);
  });

  it('密集小节在可用宽度内自动换行，音符保持位于小节内部', () => {
    const layout = createLayout(score([measure(1, 8), measure(2, 8), measure(3, 8)]), { width: 440, measuresPerLine: 4 });
    expect(layout.lines).toHaveLength(3);
    expect(layout.width).toBe(440);
    for (const line of layout.lines) {
      for (const item of line.measures) {
        expect(item.x + item.width).toBeLessThanOrEqual(400);
        expect(item.notes.every((note) => note.x > item.x && note.x < item.x + item.width)).toBe(true);
      }
    }
  });

  it('单小节比容器宽时扩展 SVG 宽度以保留间距供横向滚动', () => {
    const layout = createLayout(score([measure(1, 32)]), { width: 320, measuresPerLine: 2 });
    expect(layout.width).toBeGreaterThan(320);
    const item = layout.lines[0].measures[0];
    expect(item.notes[item.notes.length - 1].x).toBeLessThan(layout.width - 40);
    expect(item.notes[1].x - item.notes[0].x).toBeGreaterThan(18);
  });

  it('长歌词组预留左右空间，跨小节的歌词也不重叠', () => {
    const a = measure(1, 2);
    a.lyrics = { syllables: [{ text: '相邻的长歌词组', isGroup: true, isPlaceholder: false }, { text: '第二组长歌词', isGroup: true, isPlaceholder: false }] };
    const b = measure(2, 1);
    b.lyrics = { syllables: [{ text: '下一小节歌词', isGroup: true, isPlaceholder: false }] };
    const layout = createLayout(score([a, b]), { width: 1000, measuresPerLine: 2 });
    const lyrics = layout.lines[0].measures.flatMap((item) => item.lyrics ?? []);
    const font = 18 * 0.85;
    for (let i = 1; i < lyrics.length; i++) {
      expect(lyrics[i].x - lyrics[i - 1].x).toBeGreaterThan((lyrics[i].text.length + lyrics[i - 1].text.length) * font / 2);
    }
  });

  it('放大字号会增加音符间距、歌词位置、行高和溢出宽度', () => {
    const a = measure(1, 12);
    a.lyrics = { syllables: [{ text: '歌词', isGroup: true, isPlaceholder: false }] };
    const small = createLayout(score([a, measure(2)]), { width: 320, noteFontSize: 18 });
    const large = createLayout(score([a, measure(2)]), { width: 320, noteFontSize: 32 });
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.lines[0].height).toBeGreaterThan(small.lines[0].height);
    expect(large.lines[0].measures[0].lyrics![0].y).toBeGreaterThan(small.lines[0].measures[0].lyrics![0].y);
    expect(large.allNotes[1].x - large.allNotes[0].x).toBeGreaterThan(small.allNotes[1].x - small.allNotes[0].x);
  });
});
