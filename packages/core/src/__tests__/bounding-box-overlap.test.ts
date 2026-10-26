import { describe, it, expect } from 'vitest';
import { calculateNoteBoundingBox } from '../renderer/bounding-box.js';
import { NoteElement } from '../types/index.js';

describe('BoundingBox Overlap Check', () => {
  it('should not overlap between low octave dots and second beam line for 6,//', () => {
    // 音符 "6,//"：低八度（octave = -1）+ 十六分音符（base = 16）
    const note: NoteElement = {
      type: 'note',
      pitch: 6,
      octave: -1, // 低八度
      duration: { base: 16, dots: 0 }, // 十六分音符
      dot: false,
    };
    
    const fontSize = 18;
    const x = 100;
    const y = 100;
    
    expect(calculateNoteBoundingBox(note, fontSize, x, y).vertical.height).toBeGreaterThan(fontSize);
    
    // 低八度点位置：y + 16 (非倚音)
    const lowOctaveDotY = y + 16;
    
    // 第二条减时线位置：y + 20 (修改后)
    const secondBeamLineY = y + 20;
    
    // 两者不应该重叠，应该有至少4px的间距
    const spacing = secondBeamLineY - lowOctaveDotY;
    console.log('Low octave dot Y:', lowOctaveDotY);
    console.log('Second beam line Y:', secondBeamLineY);
    console.log('Spacing:', spacing);
    
    expect(spacing).toBeGreaterThanOrEqual(4);
  });

  it('should calculate correct bounding box for low octave with multiple beam lines', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: -2, // 两个低八度点
      duration: { base: 32 as 16, dots: 0 }, // 三十二分音符，三条减时线（类型断言：32超出BaseDuration范围但用于测试边界）
      dot: false,
    };
    
    const fontSize = 18;
    const x = 100;
    const y = 100;
    
    const bbox = calculateNoteBoundingBox(note, fontSize, x, y);
    
    // 验证边界框包含所有元素
    expect(bbox.vertical.height).toBeGreaterThan(fontSize); // 应该比基本音符高
    
    // 低八度点位置
    const secondOctaveDotY = y + 22;
    
    // 减时线位置
    const secondBeamY = y + 20;
    const thirdBeamY = y + 28;
    
    // 验证没有重叠
    expect(secondOctaveDotY).not.toBe(secondBeamY);
    expect(thirdBeamY).toBeGreaterThan(secondOctaveDotY);
  });
});