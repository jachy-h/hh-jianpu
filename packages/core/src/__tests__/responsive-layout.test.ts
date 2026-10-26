import { describe, expect, it } from 'vitest';
import { createLayout } from '../renderer/layout';
import type { Measure, Score } from '../types';

function measure(number: number, count = 4): Measure {
  return { number, notes: Array.from({ length: count }, () => ({ type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false })) };
}
function score(measures: Measure[]): Score {
  return { metadata: { key: 'C', timeSignature: { beats: 4, beatValue: 4 }, tempo: 120 }, measures };
}

describe('容器自适应排版', () => {
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
