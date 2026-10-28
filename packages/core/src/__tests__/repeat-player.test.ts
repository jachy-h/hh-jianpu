import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { createPlaybackOrder, scheduleNotes, selectMeasureSegment } from '../player/scheduler.js';
import type { Score } from '../types/index.js';

function repeatedScore(source = '1 2 3 4 | 5 6 7 1 | 1 - - - |'): Score {
  const score = parse(source).score!;
  return { ...score, measures: score.measures.map((measure, index) => ({ ...measure,
    repeatStart: index === 0, repeatEnd: index === 1 })) };
}

describe('repeat playback scheduling', () => {
  it('plays two written measures twice then continues, preserving original note indices', () => {
    const score = repeatedScore();
    const events = scheduleNotes(score, 120);
    expect(createPlaybackOrder(score.measures)).toEqual([0, 1, 0, 1, 2]);
    expect(events.filter(event => event.startBeat === event.measureStartBeat).map(event => event.measureNumber)).toEqual([1, 2, 1, 2, 3]);
    expect(events.map(event => event.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(Math.max(...events.map(event => event.startTime + event.duration))).toBe(10);
    expect(score.measures).toHaveLength(3);
  });

  it('supports an implicit beginning, single measure repeats and sequential repeat sections', () => {
    const score = repeatedScore();
    expect(createPlaybackOrder(score.measures.map((measure, index) => ({ ...measure,
      repeatStart: false, repeatEnd: index === 0 })))).toEqual([0, 0, 1, 2]);
    expect(createPlaybackOrder(score.measures.map((measure, index) => ({ ...measure,
      repeatStart: false, repeatEnd: index === 0 || index === 1 })))).toEqual([0, 0, 1, 0, 1, 2]);
    expect(createPlaybackOrder(score.measures.map((measure, index) => ({ ...measure,
      repeatStart: index === 0 || index === 1, repeatEnd: index === 0 || index === 2 })))).toEqual([0, 0, 1, 2, 1, 2]);
  });

  it('rejects unsupported structures without constructing an unbounded timeline', () => {
    const measures = repeatedScore().measures;
    expect(() => createPlaybackOrder(measures.map(measure => ({ ...measure, repeatStart: true })))).toThrow('嵌套');
    expect(() => createPlaybackOrder(measures.map(measure => ({ ...measure, repeatEnd: false })))).toThrow('缺少');
  });

  it('plays A/B in written order even when a range spans a repeat boundary', () => {
    const events = scheduleNotes(repeatedScore(), 120);
    const segment = selectMeasureSegment(events, { startMeasure: 2, endMeasure: 3 })!;
    expect(segment.durationBeats).toBe(8);
    expect(segment.events.map(event => event.index)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
    expect(segment.events.map(event => event.startBeat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(scheduleNotes(repeatedScore(), 120, { expandRepeats: false })).toHaveLength(12);
  });

  it('re-establishes a same-note slur onset at the repeated entrance', () => {
    const score = repeatedScore('(1 1 1 1 | 1 1 1 1) | 0 0 0 0 |');
    const events = scheduleNotes(score);
    expect(events.filter(event => event.frequency !== null)).toHaveLength(2);
    expect(events[0].durationBeats).toBe(8);
    expect(events[8].durationBeats).toBe(8);
    expect(events[8].frequency).toBe(events[0].frequency);
  });

  it('does not attach an entrance prolongation to the sound of the previous pass', () => {
    const score = repeatedScore('- 0 0 1 | 2 3 4 5 | 0 0 0 0 |');
    const events = scheduleNotes(score);
    expect(events[7].durationBeats).toBe(1);
    expect(events[8].frequency).toBeNull();
  });

  it('shares the expanded measure order and original indices across both voices', () => {
    const score = parse('Q[upper] 1 2 3 4 | 5 6 7 1 |\nQ[lower] 1 - - - | 3 - - - |').score!;
    const measures = score.measures.map((measure, index) => ({ ...measure, repeatStart: index === 0, repeatEnd: index === 1 }));
    const secondaryVoice = { ...score.secondaryVoice!, measures: score.secondaryVoice!.measures.map((measure, index) => ({ ...measure,
      repeatStart: index === 0, repeatEnd: index === 1 })) };
    const events = scheduleNotes({ ...score, measures, secondaryVoice }, 120);
    expect(events.filter(event => event.startBeat === 8).map(event => [event.voiceId, event.index])).toEqual([['upper', 0], ['lower', 8]]);
    expect(Math.max(...events.map(event => event.startTime + event.duration))).toBe(8);
  });
});
