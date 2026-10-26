import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { scheduleNotes, selectMeasureSegment } from '../player/scheduler.js';

function schedule(source: string) {
  return scheduleNotes(parse(source).score!);
}

describe('scheduler musical boundaries', () => {
  it('restores the sounding onset when a selected measure begins inside a same-note slur', () => {
    const events = schedule('(1 2 3 4 | 4 4 4 5) |');
    const selected = selectMeasureSegment(events, { startMeasure: 2, endMeasure: 2 })!;
    expect(selected.events[0].frequency).toBeCloseTo(349.228, 2);
    expect(selected.events[0].durationBeats).toBe(3);
    expect(selected.events[1].frequency).toBeNull();
    expect(selected.events[2].frequency).toBeNull();
    expect(selected.events[3].frequency).toBeCloseTo(391.995, 2);
  });

  it('preserves the original single onset when both sides of the slur boundary are selected', () => {
    const selected = selectMeasureSegment(schedule('(1 2 3 4 | 4 4 4 5) |'), { startMeasure: 1, endMeasure: 2 })!;
    expect(selected.events.filter((event) => event.frequency !== null)).toHaveLength(5);
    expect(selected.events[3].durationBeats).toBe(4);
  });

  it('does not merge equal slur notes across a rest', () => {
    const events = schedule('(1 0 1 2) |');
    expect(events[0].durationBeats).toBe(1);
    expect(events[2].frequency).toBeCloseTo(261.626, 2);
  });

  it('does not extend an earlier sound through a rest followed by a prolongation', () => {
    const events = schedule('1 0 - 2 |');
    expect(events[0].durationBeats).toBe(1);
    expect(events[2].frequency).toBeNull();
  });

  it('wraps an upper trill neighbor from degree seven into the next octave', () => {
    const events = schedule('~7 1 2 3 |');
    expect(events[1].frequency).toBeCloseTo(523.251, 2);
  });

  it('wraps a lower trill neighbor from degree one into the preceding octave', () => {
    const events = schedule('~.1 2 3 4 |');
    expect(events[1].frequency).toBeCloseTo(246.942, 2);
  });
});
