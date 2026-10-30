import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createLayout } from '../renderer/layout.js';

describe('行内间距', () => {
  it('将余宽分配到音符间，短末行保持正常尺度', () => {
    const score = parse('Q 1 2 3 | 4 5 6 | 1 2 3 | 4 5 6 |\nQ 1 2 3 | 4 5 6 |').score;
    expect(score).not.toBeNull();
    const layout = createLayout(score!, { width: 800 });
    expect(layout.lines).toHaveLength(2);
    const first = layout.lines[0].measures[0];
    expect(first.notes[1].x - first.notes[0].x).toBeGreaterThan(30);
    const last = layout.lines[1].measures;
    expect(last[last.length - 1].x + last[last.length - 1].width).toBeLessThan(600);
  });
});

describe('自动拆行', () => {
  it('优先均衡拆分并保留源码换行', () => {
    const score = parse('Q 1 2 3 | 1 2 3 | 1 2 3 | 1 2 3 | 1 2 3 |\nQ 1 2 3 | 1 2 3 |').score!;
    const layout = createLayout(score, { width: 650, noteFontSize: 24 });
    expect(layout.lines.map(line => line.measures.length)).toEqual([2, 3, 2]);
    const last = layout.lines[1].measures;
    expect(last[last.length - 1].x + last[last.length - 1].width).toBeLessThanOrEqual(610.01);
  });
});
