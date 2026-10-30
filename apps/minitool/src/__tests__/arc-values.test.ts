import { describe, expect, it } from 'vitest';
import { arcPoint, arcValueIndex, isArcHit, precisePickerValue } from '../components/arc-values';

describe('弧形选择坐标', () => {
  it('连续速度候选与离散预备拍均能往返映射', () => {
    for (const count of [181, 3]) {
      for (const index of [0, Math.floor(count / 2), count - 1]) {
        const point = arcPoint(index, count);
        expect(arcValueIndex(point.x, point.y, count)).toBe(index);
      }
    }
  });
  it('拖出弧线端点仍限制在候选范围内', () => {
    expect(arcValueIndex(0, 150, 181)).toBe(0);
    expect(arcValueIndex(264, 150, 181)).toBe(180);
  });
  it('只允许弧线和端点触摸区启动拖动，数字区与留白不命中', () => {
    for (const index of [0, 90, 180]) {
      const point = arcPoint(index, 181);
      expect(isArcHit(point.x, point.y)).toBe(true);
    }
    expect(isArcHit(132, 100)).toBe(false);
    expect(isArcHit(132, 0)).toBe(false);
    expect(isArcHit(132, 150)).toBe(false);
  });
  it('精确输入限制在速度范围内，空值和非法文本保留原值', () => {
    const values = Array.from({ length: 181 }, (_, index) => 40 + index);
    expect(precisePickerValue('137', values, 120)).toBe(137);
    expect(precisePickerValue('999', values, 120)).toBe(220);
    expect(precisePickerValue('20', values, 120)).toBe(40);
    expect(precisePickerValue('120.5', values, 120)).toBe(121);
    expect(precisePickerValue('', values, 120)).toBe(120);
    expect(precisePickerValue('invalid', values, 120)).toBe(120);
  });
});
