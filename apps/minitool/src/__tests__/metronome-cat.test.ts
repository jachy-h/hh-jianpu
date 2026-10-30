import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetronomeCat } from '../components/MetronomeCat';

const render = (running: boolean, beat: number, tick = 1, enabled = true) => renderToStaticMarkup(React.createElement(MetronomeCat, {
  enabled, running, beat, tick, tempo: 120, disabled: false, onToggle: () => undefined,
}));

describe('猫咪节拍器', () => {
  it('等待实际拍点及暂停时保持静止', () => {
    expect(render(true, 0)).not.toContain('cat-typing');
    expect(render(false, 2)).not.toContain('cat-typing');
    expect(render(false, 0)).toContain('aria-pressed="true"');
  });
  it('相同拍号也按实际回调序号交替敲击', () => {
    expect(render(true, 1, 1)).toContain('tap-left');
    expect(render(true, 1, 2)).toContain('tap-right');
  });
  it('常规节拍器关闭时仍可显示独立预备拍', () => {
    const svg = render(true, 4, 3, false);
    expect(svg).toContain('aria-pressed="false"');
    expect(svg).toContain('cat-typing');
  });
});
