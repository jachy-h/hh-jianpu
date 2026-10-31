import { describe, expect, it } from 'vitest';
import { isPlaybackJump, playbackScrollTop, shouldRepositionCursor } from './playback-scroll.js';

describe('播放行滚动定位', () => {
  it('同一谱行的字号或视口改变时重新跟随', () => {
    const layout = {};
    const previous = { layout, line: 3, height: 500 };
    expect(shouldRepositionCursor(previous, layout, 3, 500)).toBe(false);
    expect(shouldRepositionCursor(previous, {}, 3, 500)).toBe(true);
    expect(shouldRepositionCursor(previous, layout, 3, 400)).toBe(true);
  });
  it('播放行仍可见时也将新行提前移到上方三分之一处', () => {
    // 600px 视口内的第 500px 行已可见，仍需主动向前滚动。
    expect(playbackScrollTop(500, 600, 2400)).toBe(300);
  });

  it('谱首与谱尾受实际可滚动范围限制，短谱保持原位', () => {
    expect(playbackScrollTop(100, 600, 2400)).toBe(0);
    expect(playbackScrollTop(2300, 600, 2400)).toBe(1800);
    expect(playbackScrollTop(100, 600, 300)).toBe(0);
  });

  it('使用旋转后的逻辑高度重新定位，不依赖屏幕纵坐标', () => {
    expect(playbackScrollTop(500, 300, 2400)).toBe(400);
  });

  it('顺序播放平滑跟随，反复回跳和跨段跳转立即定位', () => {
    expect(isPlaybackJump(4, 5, 0, 1)).toBe(false);
    expect(isPlaybackJump(8, 3, 2, 0)).toBe(true);
    expect(isPlaybackJump(2, 8, 0, 2)).toBe(true);
    expect(isPlaybackJump(4, 2, 0, 0)).toBe(true);
  });
});
