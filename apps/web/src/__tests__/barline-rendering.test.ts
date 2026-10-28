import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLayout, parse } from '@hh-jianpu/core';
import MeasureView from '../components/ScoreView/MeasureView';

const renderMeasure = (source: string, joinedRepeatEnd = false, joinedRepeatStart = false, index = 0): string => {
  const score = parse(source).score!;
  const layout = createLayout(score).lines[0].measures[index];
  return renderToStaticMarkup(createElement(MeasureView, { layout, currentNoteIndex: -1, joinedRepeatEnd, joinedRepeatStart }));
};

describe('结束线与组合反复 SVG', () => {
  it('将结束线绘制为一条黑色粗线', () => {
    const svg = renderMeasure('1 2 3 4 ||');
    expect(svg).toMatch(/<line[^>]*stroke="#1C1917"[^>]*stroke-width="3"/);
    expect(svg).not.toContain('反复记号');
    expect(renderMeasure('1 2 3 4 |')).toMatch(/<line[^>]*stroke="#D6D3D1"[^>]*stroke-width="1"/);
  });

  it('将同一行组合反复绘制为一条黑线和左右四个点', () => {
    const source = '||: 1 2 3 4 :||: 5 6 7 1 :||';
    const svg = renderMeasure(source, true);
    const combined = svg.match(/<g aria-label="前后反复记号"[^>]*>(.*?)<\/g>/)![1];
    expect(combined.match(/<line /g)).toHaveLength(1);
    expect(combined.match(/<circle /g)).toHaveLength(4);
    expect(svg).not.toContain('aria-label="后反复记号"');
    expect(renderMeasure(source, false, true, 1)).not.toContain('aria-label="前反复记号"');
  });

  it('跨行时保留行尾后反复和下一行前反复', () => {
    const source = '||: 1 2 3 4 :||: 5 6 7 1 :||';
    expect(renderMeasure(source)).toContain('aria-label="后反复记号"');
    expect(renderMeasure(source, false, false, 1)).toContain('aria-label="前反复记号"');
  });
});
