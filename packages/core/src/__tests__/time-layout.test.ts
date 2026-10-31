import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createLayout } from '../renderer/layout.js';

describe('时值排版', () => {
  it('普通小节的音符中心距约为原来的二分之一，同时保持时值比例', () => {
    for (const [source, oldSpacing] of [
      ['Q 1 2 3 4 |', 63],
      ['Q 1/ 2/ 3/ 4/ 5/ 6/ 7/ 1/ |', 64.8],
      ['Q 1// 2// 3// 4// 5// 6// 7// 1// 1// 2// 3// 4// 5// 6// 7// 1// |', 64.8],
    ] as const) {
      const score = parse(source).score!;
      const measure = createLayout(score, { width: 4000, layoutMode: 'time' }).lines[0].measures[0];
      const spacing = measure.notes[1].x - measure.notes[0].x;
      expect(spacing / oldSpacing).toBeGreaterThan(0.49);
      expect(spacing / oldSpacing).toBeLessThan(0.53);
      expect(measure.width).toBeCloseTo(measure.timeGeometry!.pixelsPerBeat * 4);
    }
  });
  it('前后反复记号与首尾音符保持避让', () => {
    const score = parse('Q ||: 1/ 2/ 3/ 4/ 5/ 6/ 7/ 1/ :||').score!;
    const measure = createLayout(score, { width: 1600, layoutMode: 'time', noteFontSize: 18 }).lines[0].measures[0];
    const leftRepeatExtent = 18 * (0.65 + 0.09);
    const noteHalfWidth = 18 * 0.6;
    expect(measure.notes[0].x - noteHalfWidth).toBeGreaterThan(measure.x + leftRepeatExtent);
    expect(measure.notes.at(-1)!.x + noteHalfWidth).toBeLessThan(measure.x + measure.width - leftRepeatExtent);
  });
  it('按起音时间保持全谱比例，包括跨小节与换行', () => {
    const score = parse('Q 1/ 2/ 3 - | 4 5/ 6/ | 1 2 |').score!;
    const wide = createLayout(score, { width: 2000, layoutMode: 'time' });
    const measures = wide.lines.flatMap(line => line.measures);
    const a = measures[0].notes;
    const beatWidth = (a[1].x - a[0].x) * 2;
    expect(a[2].x - a[0].x).toBeCloseTo(beatWidth);
    expect(measures[1].notes[0].x - a[0].x).toBeCloseTo(3 * beatWidth);
    const narrow = createLayout(score, { width: 300, layoutMode: 'time' });
    expect(narrow.lines.length).toBeGreaterThan(1);
    expect(narrow.lines[0].measures[0].notes[1].x - narrow.lines[0].measures[0].notes[0].x).toBeCloseTo(beatWidth / 2);
  });
  it('双声部相同起音位置对齐', () => {
    const score = parse('Q[upper] 1/ 2/ 3 |\nQ[lower] 1 2 |').score!;
    const line = createLayout(score, { width: 900, layoutMode: 'time' }).lines[0];
    expect(line.measures[0].notes[0].x).toBeCloseTo(line.secondaryMeasures![0].notes[0].x);
    expect(line.measures[0].notes[2].x).toBeCloseTo(line.secondaryMeasures![0].notes[1].x);
  });
  it('首音避开小节线，长歌词参与全曲间距，窄屏保留完整小节', () => {
    const score = parse('Q ||: 1// 2// #4 5/ 6/ :|| 1 - 0 2 |\nC (春天来到这里) 我 们 一 起 唱 歌\nC2 (远方的花儿) 你 我 快 乐 地 唱').score!;
    const layout = createLayout(score, { width: 320, layoutMode: 'time' });
    const measure = layout.lines[0].measures[0];
    expect(measure.notes[0].x - measure.x).toBeGreaterThan(18);
    expect(measure.width).toBeGreaterThan(320);
    expect(layout.width).toBeGreaterThan(320);
    const first = measure.lyrics!.filter(lyric => lyric.noteIndex === measure.notes[0].index);
    expect(first).toHaveLength(2);
    expect(first[0].x).toBe(measure.notes[0].x);
    expect(measure.notes[1].x - measure.notes[0].x).toBeGreaterThan(60);
    expect(measure.notes[measure.notes.length - 1].x).toBeLessThan(measure.x + measure.width);
    expect(layout.allNotes.every(note => Number.isFinite(note.x) && Number.isFinite(note.y))).toBe(true);
  });
  it('空谱不会产生无效坐标', () => {
    const score = { ...parse('Q 1 |').score!, measures: [] };
    const layout = createLayout(score, { width: 320, layoutMode: 'time' });
    expect(Number.isFinite(layout.width)).toBe(true);
    expect(Number.isFinite(layout.height)).toBe(true);
  });
  it('附点、休止、延长线及小节线换气按时间定位，速度变化不影响布局', () => {
    const score = parse('Q 1/. 2// 0/ 3 - | v 4 5 6 7 |').score!;
    const options = { width: 3000, layoutMode: 'time' as const };
    const layout = createLayout(score, options);
    const timed = layout.allNotes.filter(note => (note.durationBeats ?? 0) > 0);
    const reference = timed[1].x - timed[0].x;
    const beatWidth = reference / (timed[1].startBeat! - timed[0].startBeat!);
    for (const note of timed) {
      expect(note.x - timed[0].x).toBeCloseTo((note.startBeat! - timed[0].startBeat!) * beatWidth);
    }
    const changed = createLayout({ ...score, metadata: { ...score.metadata, tempo: 60 } }, options);
    expect(changed.allNotes.map(note => note.x)).toEqual(layout.allNotes.map(note => note.x));
    const breath = layout.allNotes.find(note => note.note.type === 'breath');
    const measure = layout.lines.flatMap(line => line.measures).find(item => item.notes.includes(breath!));
    if (breath?.note.type === 'breath' && breath.note.barlineSide) {
      expect(breath.x).toBe(breath.note.barlineSide === 'start' ? measure!.x : measure!.x + measure!.width);
    }
  });
  it('歌词中的长词组增大统一比例，且不遮挡下一音', () => {
    const basic = parse('Q 1// 2// 3 4 |').score!;
    const lyrics = parse('Q 1// 2// 3 4 |\nC 我 你 (很长的歌词文字) 他').score!;
    const simple = createLayout(basic, { width: 4000, layoutMode: 'time' });
    const spaced = createLayout(lyrics, { width: 4000, layoutMode: 'time' });
    const a = spaced.lines[0].measures[0].notes;
    expect(a[1].x - a[0].x).toBeGreaterThan(simple.allNotes[1].x - simple.allNotes[0].x);
    expect(a[3].x - a[2].x).toBeGreaterThan(6 * 18 * 0.85 / 2);
  });
});
