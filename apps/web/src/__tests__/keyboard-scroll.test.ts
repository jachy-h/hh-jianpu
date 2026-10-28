import { describe, expect, it } from 'vitest';
import { calculateKeyboardScrollTransform } from '../components/Help/keyboard-scroll';

const DESKTOP = { keyboardWidth: 700, availableRightWidth: 160, isDesktop: true };

describe('符号键盘从贴顶位置连续移动到正文右侧', () => {
  it('进入速查和刚刚贴顶时仍保持原大小与原位置', () => {
    for (const distancePastTop of [-400, 0, 48]) {
      expect(calculateKeyboardScrollTransform({ ...DESKTOP, distancePastTop })).toEqual({ progress: 0, scale: 1, translateX: 0 });
    }
  });

  it('继续向06之后浏览时逐渐右移和缩小，反向回滚沿同一路径恢复', () => {
    const positions = [48, 128, 208, 288, 368].map(distancePastTop => calculateKeyboardScrollTransform({ ...DESKTOP, distancePastTop }));
    for (let index = 1; index < positions.length; index++) {
      expect(positions[index].translateX).toBeGreaterThan(positions[index - 1].translateX);
      expect(positions[index].scale).toBeLessThan(positions[index - 1].scale);
    }
    expect(positions[2].progress).toBeCloseTo(0.5);
    expect(calculateKeyboardScrollTransform({ ...DESKTOP, distancePastTop: 208 })).toEqual(positions[2]);
    expect(calculateKeyboardScrollTransform({ ...DESKTOP, distancePastTop: 48 })).toEqual(positions[0]);
  });

  it('停靠后完全让出正文，并且缩放后的宽度正好适应右侧空白', () => {
    const layout = calculateKeyboardScrollTransform({ ...DESKTOP, distancePastTop: 900 });
    expect(layout.progress).toBe(1);
    expect(layout.translateX).toBeGreaterThan(DESKTOP.keyboardWidth);
    expect(layout.scale * DESKTOP.keyboardWidth).toBeCloseTo(DESKTOP.availableRightWidth);
  });

  it('移动设备无论滚多远都不横移、不缩小', () => {
    for (const distancePastTop of [0, 208, 900, 5000]) {
      expect(calculateKeyboardScrollTransform({ ...DESKTOP, isDesktop: false, distancePastTop })).toEqual({ progress: 0, scale: 1, translateX: 0 });
    }
  });

  it('宽屏空白充足时只平移，不把键盘放大', () => {
    const layout = calculateKeyboardScrollTransform({ ...DESKTOP, availableRightWidth: 1000, distancePastTop: 900 });
    expect(layout.scale).toBe(1);
    expect(layout.translateX).toBeGreaterThan(0);
  });
});
