import { describe, it, expect } from 'vitest';
import { createLayout } from '../renderer/layout.js';
import { Score, Metadata } from '../types/index.js';

describe('Dynamic Layout Integration', () => {
  it('should use dynamic spacing instead of fixed spacing', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    const score: Score = {
      metadata,
      measures: [
        {
          number: 1,
          notes: [
            {
              type: 'note',
              pitch: 5,
              octave: 2, // 高八度
              duration: { base: 4, dots: 0 },
              dot: false,
            },
            {
              type: 'note',
              pitch: 6,
              octave: 0,
              duration: { base: 4, dots: 0 },
              dot: false,
            },
          ],
        },
      ],
    };
    
    const layout = createLayout(score, { width: 800 });
    
    // 检查音符位置是否不重叠
    const notes = layout.allNotes;
    expect(notes.length).toBe(2);
    
    // 计算边界框并检查重叠
    const note1Box = {
      left: notes[0].x - 9,
      right: notes[0].x + 9,
      top: notes[0].y - 9,
      bottom: notes[0].y + 9,
    };
    
    const note2Box = {
      left: notes[1].x - 9,
      right: notes[1].x + 9,
      top: notes[1].y - 9,
      bottom: notes[1].y + 9,
    };
    
    // 确保不重叠
    expect(note1Box.right).toBeLessThan(note2Box.left);
  });

  it('should handle complex notes with multiple symbols', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    const score: Score = {
      metadata,
      measures: [
        {
          number: 1,
          notes: [
            {
              type: 'note',
              pitch: 5,
              octave: 1,
              duration: { base: 8, dots: 0 },
              dot: true,
              trillType: 'single',
            },
            {
              type: 'note',
              pitch: 6,
              octave: 0,
              duration: { base: 4, dots: 0 },
              dot: false,
            },
          ],
        },
      ],
    };
    
    const layout = createLayout(score, { width: 800 });
    
    // 检查音符位置
    const notes = layout.allNotes;
    expect(notes.length).toBe(2);
    
    // 复杂音符应该有足够的间距
    const distance = Math.abs(notes[1].x - notes[0].x);
    expect(distance).toBeGreaterThan(30); // 至少30px间距
  });

  it('should keep ordinary note spacing stable as the font grows', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    const score: Score = {
      metadata,
      measures: [
        {
          number: 1,
          notes: [
            {
              type: 'note',
              pitch: 5,
              octave: 0,
              duration: { base: 4, dots: 0 },
              dot: false,
            },
            {
              type: 'note',
              pitch: 6,
              octave: 0,
              duration: { base: 4, dots: 0 },
              dot: false,
            },
          ],
        },
      ],
    };
    
    const layout1 = createLayout(score, { width: 800, noteFontSize: 18 });
    const layout2 = createLayout(score, { width: 800, noteFontSize: 24 });
    
    // 空间足够时，增大字号不需要扩大音符间距
    const notes1 = layout1.allNotes;
    const notes2 = layout2.allNotes;
    
    const distance1 = Math.abs(notes1[1].x - notes1[0].x);
    const distance2 = Math.abs(notes2[1].x - notes2[0].x);
    
    expect(distance2).toBeCloseTo(distance1);
  });
});