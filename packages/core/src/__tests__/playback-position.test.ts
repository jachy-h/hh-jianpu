import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createPlaybackMeasures, resolvePlaybackPosition } from '../player/position.js';
import { createLayout } from '../renderer/layout.js';
import { resolveTimeCursor } from '../renderer/time-cursor.js';

describe('连续播放位置', () => {
  it('反复的第二遍映射到原谱，边界进入下一小节', () => {
    const score = parse('Q ||: 1 0 | 2 - :|| 3 |').score!;
    const measures = createPlaybackMeasures(score, null);
    expect(measures.map(item => item.measureNumber)).toEqual([1, 2, 1, 2, 3]);
    expect(resolvePlaybackPosition(measures, 4.5, 7)).toMatchObject({ measureNumber: 1, writtenBeat: 0.5, occurrence: 2, session: 7 });
    expect(resolvePlaybackPosition(measures, 2, 7)).toMatchObject({ measureNumber: 2, writtenBeat: 2 });
    expect(resolvePlaybackPosition(measures, 8, 7)).toMatchObject({ measureNumber: 3, writtenBeat: 4 });
  });
  it('选段归一化后保留原谱位置及起始延迟', () => {
    const score = parse('Q 1 2 | 3 4 | 5 6 |').score!;
    const measures = createPlaybackMeasures(score, { startMeasure: 2, endMeasure: 3 }, 1.75);
    expect(resolvePlaybackPosition(measures, 0, 1)).toMatchObject({ measureNumber: 2, writtenBeat: 2 });
    expect(resolvePlaybackPosition(measures, 0.75, 1)).toMatchObject({ measureNumber: 2, writtenBeat: 2.5 });
    expect(resolvePlaybackPosition(measures, 2.25, 1)).toMatchObject({ measureNumber: 3, writtenBeat: 4 });
  });
  it('长音和休止中连续移动，换行使用下一行坐标', () => {
    const score = parse('Q 1 - 0 | 2 3 |').score!;
    const layout = createLayout(score, { width: 300, measuresPerLine: 1, layoutMode: 'time' });
    const geometry = layout.lines[0].measures[0].timeGeometry!;
    const start = resolveTimeCursor(layout, 1, 0)!;
    const middle = resolveTimeCursor(layout, 1, 1.5)!;
    expect(middle.x - start.x).toBeCloseTo(geometry.pixelsPerBeat * 1.5);
    expect(resolveTimeCursor(layout, 2, 3)?.lineIndex).toBe(1);
    expect(resolveTimeCursor(layout, 1, NaN)).toBeNull();
    expect(resolveTimeCursor(createLayout(score), 1, 0)).toBeNull();
  });
  it('弱起、倚音、附点与双声部使用相同的拍点和布局原点', () => {
    const score = parse('Q[upper] 1/ | (2) 3/. 4// 0/ 5 6 |\nQ[lower] 0/ | 1 0 0 1 |').score!;
    const measures = createPlaybackMeasures(score, null);
    const layout = createLayout(score, { width: 1600, layoutMode: 'time' });
    const first = layout.lines[0].measures[0];
    const second = layout.lines[0].measures[1];
    const secondary = layout.lines[0].secondaryMeasures![1];
    expect(second.timeGeometry?.startBeat).toBeCloseTo(0.5);
    expect(secondary.timeGeometry).toEqual(second.timeGeometry);
    const position = resolvePlaybackPosition(measures, 0.75, 1)!;
    expect(position).toMatchObject({ measureNumber: 2, writtenBeat: 0.75 });
    const cursor = resolveTimeCursor(layout, position.measureNumber, position.writtenBeat)!;
    expect(cursor.x).toBeCloseTo(second.timeGeometry!.originX + 0.25 * second.timeGeometry!.pixelsPerBeat);
    expect(resolveTimeCursor(layout, 1, 0)?.x).toBeCloseTo(first.timeGeometry!.originX);
  });
  it('空谱和零拍小节无位置，曲末保留最后有效区间', () => {
    const score = parse('Q 1 |').score!;
    const empty = { ...score, measures: [] };
    expect(resolvePlaybackPosition(createPlaybackMeasures(empty, null), 0, 1)).toBeNull();
    expect(resolveTimeCursor(createLayout(empty, { layoutMode: 'time' }), 1, 0)).toBeNull();
    const entries = [{ startBeat: 0, endBeat: 1, writtenBeat: 0, measureNumber: 1, occurrence: 0 },
      { startBeat: 1, endBeat: 1, writtenBeat: 1, measureNumber: 2, occurrence: 1 }];
    expect(resolvePlaybackPosition(entries, 1, 1)).toMatchObject({ measureNumber: 1, writtenBeat: 1 });
  });
});
