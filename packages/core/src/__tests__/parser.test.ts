import { describe, it, expect } from 'vitest';
import { parse } from '../parser/index';

describe('Parser', () => {
  it('should parse basic metadata', () => {
    const source = `标题: 测试曲
调号: C
拍号: 4/4
速度: 120

1 2 3 4 |`;

    const result = parse(source);
    expect(result.score).not.toBeNull();
    expect(result.score?.metadata.title).toBe('测试曲');
    expect(result.score?.metadata.key).toBe('C');
    expect(result.score?.metadata.tempo).toBe(120);
    expect(result.score?.metadata.timeSignature.beats).toBe(4);
    expect(result.score?.metadata.timeSignature.beatValue).toBe(4);
  });

  it('should parse notes correctly', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |`;

    const result = parse(source);
    expect(result.score?.measures).toHaveLength(1);
    expect(result.score?.measures[0].notes).toHaveLength(4);
    
    const notes = result.score!.measures[0].notes;
    expect(notes[0].type).toBe('note');
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].octave).toBe(0);
    }
  });

  it('should parse high octave notes', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 '3 '4 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    if (notes[2].type === 'note') {
      expect(notes[2].octave).toBe(1);
    }
    if (notes[3].type === 'note') {
      expect(notes[3].octave).toBe(1);
    }
  });

  it('should parse low octave notes', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

.7 .6 1 2 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(7);
      expect(notes[0].octave).toBe(-1);
    }
  });

  it('should parse multiple octave markers', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

..1 .1 1 '1 ''1 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // ..1 = 低两个八度
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].octave).toBe(-2);
    }
    // .1 = 低一个八度
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(1);
      expect(notes[1].octave).toBe(-1);
    }
    // 1 = 标准八度
    if (notes[2].type === 'note') {
      expect(notes[2].pitch).toBe(1);
      expect(notes[2].octave).toBe(0);
    }
    // '1 = 高一个八度
    if (notes[3].type === 'note') {
      expect(notes[3].pitch).toBe(1);
      expect(notes[3].octave).toBe(1);
    }
    // ''1 = 高两个八度
    if (notes[4].type === 'note') {
      expect(notes[4].pitch).toBe(1);
      expect(notes[4].octave).toBe(2);
    }
  });

  it('should parse rests and ties', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 0 5 - |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    expect(notes[0].type).toBe('note');
    expect(notes[1].type).toBe('rest');
    expect(notes[2].type).toBe('note');
    expect(notes[3].type).toBe('tie');
  });

  it('should parse underlines (eighth notes)', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1_ 2_ 3 4 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    if (notes[0].type === 'note') {
      expect(notes[0].duration.base).toBe(8);
    }
    if (notes[2].type === 'note') {
      expect(notes[2].duration.base).toBe(4);
    }
  });

  it('should parse multiple measures', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 | 5 6 7 '1 |`;

    const result = parse(source);
    expect(result.score?.measures).toHaveLength(2);
    expect(result.score?.measures[0].number).toBe(1);
    expect(result.score?.measures[1].number).toBe(2);
  });

  it('should parse slur groups within single measure', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

(1 2 3) 4 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // 前三个音符应该有相同的 slurGroup
    if (notes[0].type === 'note' && notes[1].type === 'note' && notes[2].type === 'note') {
      expect(notes[0].slurGroup).toBeDefined();
      expect(notes[1].slurGroup).toBe(notes[0].slurGroup);
      expect(notes[2].slurGroup).toBe(notes[0].slurGroup);
    }
    
    // 第四个音符不应该有 slurGroup
    if (notes[3].type === 'note') {
      expect(notes[3].slurGroup).toBeUndefined();
    }
  });

  it('should parse slur groups across measures', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

(1 2 | 3 4) 5 |`;

    const result = parse(source);
    
    // 第一小节的前两个音符
    const measure1Notes = result.score!.measures[0].notes;
    // 第二小节的音符
    const measure2Notes = result.score!.measures[1].notes;
    
    // 前两个音符应该有相同的 slurGroup
    if (measure1Notes[0].type === 'note' && measure1Notes[1].type === 'note') {
      expect(measure1Notes[0].slurGroup).toBeDefined();
      expect(measure1Notes[1].slurGroup).toBe(measure1Notes[0].slurGroup);
    }
    
    // 第二小节的前两个音符应该有相同的 slurGroup（与第一小节相同）
    if (measure2Notes[0].type === 'note' && measure2Notes[1].type === 'note') {
      expect(measure2Notes[0].slurGroup).toBeDefined();
      if (measure1Notes[0].type === 'note') {
        expect(measure2Notes[0].slurGroup).toBe(measure1Notes[0].slurGroup);
        expect(measure2Notes[1].slurGroup).toBe(measure1Notes[0].slurGroup);
      }
    }
    
    // 第五个音符不应该有 slurGroup
    if (measure2Notes[2].type === 'note') {
      expect(measure2Notes[2].slurGroup).toBeUndefined();
    }
  });

  it('should parse multiple slur groups in one line', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

(1 2) (3 4) |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // 前两个音符一组
    if (notes[0].type === 'note' && notes[1].type === 'note') {
      expect(notes[0].slurGroup).toBeDefined();
      expect(notes[1].slurGroup).toBe(notes[0].slurGroup);
    }
    
    // 后两个音符另一组（不同的 slurGroup）
    if (notes[2].type === 'note' && notes[3].type === 'note') {
      expect(notes[2].slurGroup).toBeDefined();
      expect(notes[3].slurGroup).toBe(notes[2].slurGroup);
      
      if (notes[0].type === 'note') {
        expect(notes[2].slurGroup).not.toBe(notes[0].slurGroup);
      }
    }
  });
});
