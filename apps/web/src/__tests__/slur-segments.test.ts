import { describe, expect, it } from 'vitest';
import { createLayout, parse } from '@hh-jianpu/core';
import type { Score } from '@hh-jianpu/core';
import { createSlurSegments } from '../components/ScoreView/slur-segments';

const score: Score = {
  metadata: { key: 'C', timeSignature: { beats: 4, beatValue: 4 }, tempo: 120 },
  measures: Array.from({ length: 3 }, (_, index) => ({
    number: index + 1,
    notes: [{ type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false, slurGroup: 1 }],
  })),
};

describe('跨行圆滑线', () => {
  it('每一行独立画弧，包括只有一个圆滑音符的中间行', () => {
    const layout = createLayout(score, { width: 320, measuresPerLine: 1 });
    const segments = createSlurSegments(layout, 18);
    expect(segments).toHaveLength(3);
    expect(segments.map((segment) => segment.line)).toEqual([0, 1, 2]);
    for (const segment of segments) {
      const coordinates = segment.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(coordinates[1]).toBe(coordinates[5]);
      expect(coordinates[4]).toBeGreaterThan(coordinates[0]);
      expect(segment.notes).toHaveLength(1);
    }
  });

  it('同一行只画一条弧，并保留各音符索引用于高亮', () => {
    const layout = createLayout(score, { width: 800, measuresPerLine: 4 });
    const segments = createSlurSegments(layout, 18);
    expect(segments).toHaveLength(1);
    expect(segments[0].notes.map((note) => note.index)).toEqual([0, 1, 2]);
  });
});


it('isolates identical slur group numbers in upper and lower staves', () => {
  const score = parse('Q[upper] (1 2 3 4 | 5 6 7 1) |\nQ[lower] (3 4 5 6 | 7 1 2 3) |').score!;
  const layout = createLayout(score, { width: 400, measuresPerLine: 1 });
  const segments = createSlurSegments(layout, 24);
  expect(segments).toHaveLength(4);
  for (const segment of segments) {
    expect(new Set(segment.notes.map(note => note.voiceId))).toEqual(new Set([segment.voiceId]));
  }
});
