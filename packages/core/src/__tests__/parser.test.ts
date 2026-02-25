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

1 2 3' 4' |`;

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

7, 6, 1 2 |`;

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

1,, 1, 1 1' 1'' |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // 1,, = 低两个八度
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].octave).toBe(-2);
    }
    // 1, = 低一个八度
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(1);
      expect(notes[1].octave).toBe(-1);
    }
    // 1 = 标准八度
    if (notes[2].type === 'note') {
      expect(notes[2].pitch).toBe(1);
      expect(notes[2].octave).toBe(0);
    }
    // 1' = 高一个八度
    if (notes[3].type === 'note') {
      expect(notes[3].pitch).toBe(1);
      expect(notes[3].octave).toBe(1);
    }
    // 1'' = 高两个八度
    if (notes[4].type === 'note') {
      expect(notes[4].pitch).toBe(1);
      expect(notes[4].octave).toBe(2);
    }
  });

  it('should parse octave markers after slash underlines', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

5,/ 5/, 5'/ 5/' |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // 5,/ 和 5/, 都应该是低八度的八分音符
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(5);
      expect(notes[0].octave).toBe(-1);
      expect(notes[0].duration.base).toBe(8);
    }
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(5);
      expect(notes[1].octave).toBe(-1);
      expect(notes[1].duration.base).toBe(8);
    }
    // 5'/ 和 5/' 都应该是高八度的八分音符
    if (notes[2].type === 'note') {
      expect(notes[2].pitch).toBe(5);
      expect(notes[2].octave).toBe(1);
      expect(notes[2].duration.base).toBe(8);
    }
    if (notes[3].type === 'note') {
      expect(notes[3].pitch).toBe(5);
      expect(notes[3].octave).toBe(1);
      expect(notes[3].duration.base).toBe(8);
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

  it('should parse breath marks', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 v 3 4 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    expect(notes[0].type).toBe('note');
    expect(notes[1].type).toBe('note');
    expect(notes[2].type).toBe('breath');
    expect(notes[3].type).toBe('note');
    expect(notes[4].type).toBe('note');
  });

  it('should parse grace notes', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

^4 5 ^1' 2 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;
    
    // ^4 是倚音
    expect(notes[0].type).toBe('note');
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(4);
      expect(notes[0].isGrace).toBe(true);
    }
    
    // 5 是主音
    expect(notes[1].type).toBe('note');
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(5);
      expect(notes[1].isGrace).toBeUndefined();
    }
    
    // ^'1 是高音倚音
    expect(notes[2].type).toBe('note');
    if (notes[2].type === 'note') {
      expect(notes[2].pitch).toBe(1);
      expect(notes[2].octave).toBe(1);
      expect(notes[2].isGrace).toBe(true);
    }
    
    // 2 是主音
    expect(notes[3].type).toBe('note');
    if (notes[3].type === 'note') {
      expect(notes[3].pitch).toBe(2);
      expect(notes[3].isGrace).toBeUndefined();
    }
  });

  it('should parse slashes (eighth notes)', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1/ 2/ 3 4 |`;

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

describe('Beat Validation', () => {
  it('should validate correct 4/4 measure', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect too many beats in 4/4', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 5 |`;
    
    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
    expect(result.errors[0].message).toContain('期望 4 拍');
    expect(result.errors[0].message).toContain('实际 5');
  });

  it('should detect too few beats in 4/4', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 |`;
    
    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
    expect(result.errors[0].message).toContain('期望 4 拍');
    expect(result.errors[0].message).toContain('实际 2');
  });

  it('should validate 3/4 measures correctly', () => {
    const source = `调号: C
拍号: 3/4
速度: 120

1 2 3 | 4 5 6 |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle ties correctly in beat calculation', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 - - - |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle eighth notes correctly', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1/ 2/ 3/ 4/ 5/ 6/ 7/ 1'/ |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should ignore grace notes in beat calculation', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

^3/ 1 2 3 4 |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should ignore breath marks in beat calculation', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 v 3 4 |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate multiple measures', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 | 5 6 | 1 2 3 4 |`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(1); // 第2小节错误
    expect(result.errors[0].message).toContain('小节 2');
  });
});

describe('Lyrics Parsing', () => {
  it('should parse basic lyrics', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |
C 一 二 三 四`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    expect(result.score?.measures[0].lyrics).toBeDefined();
    expect(result.score?.measures[0].lyrics?.syllables).toHaveLength(4);
    expect(result.score?.measures[0].lyrics?.syllables[0].text).toBe('一');
    expect(result.score?.measures[0].lyrics?.syllables[0].isPlaceholder).toBe(false);
  });

  it('should parse grouped lyrics', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |
C (我的) 二 三 四`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const lyrics = result.score?.measures[0].lyrics?.syllables;
    expect(lyrics).toHaveLength(4);
    expect(lyrics?.[0].text).toBe('我的');
    expect(lyrics?.[0].isGroup).toBe(true);
    expect(lyrics?.[1].text).toBe('二');
    expect(lyrics?.[1].isGroup).toBe(false);
  });

  it('should parse placeholder lyrics', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |
C 一 _ _ 四`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const lyrics = result.score?.measures[0].lyrics?.syllables;
    expect(lyrics).toHaveLength(4);
    expect(lyrics?.[0].text).toBe('一');
    expect(lyrics?.[0].isPlaceholder).toBe(false);
    expect(lyrics?.[1].text).toBe('');
    expect(lyrics?.[1].isPlaceholder).toBe(true);
    expect(lyrics?.[2].text).toBe('');
    expect(lyrics?.[2].isPlaceholder).toBe(true);
    expect(lyrics?.[3].text).toBe('四');
  });

  it('should associate lyrics with multiple measures', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 | 5 6 7 1' |
C 一 二 三 四 五 六 七 八`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    expect(result.score?.measures[0].lyrics?.syllables).toHaveLength(4);
    expect(result.score?.measures[1].lyrics?.syllables).toHaveLength(4);
    expect(result.score?.measures[0].lyrics?.syllables[0].text).toBe('一');
    expect(result.score?.measures[1].lyrics?.syllables[0].text).toBe('五');
  });

  it('should skip grace notes when associating lyrics', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 ^2/ 3 4 |
C 一 二 三`;
    
    const result = parse(source);
    // 应该有节拍验证错误（3个有效音符 = 3拍，不满足4/4）
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.score?.measures[0].lyrics?.syllables).toHaveLength(3);
  });

  it('should handle multiple lyrics lines', () => {
    const source = `调号: C
拍号: 4/4
速度: 120

1 2 3 4 |
C 一 二
C 三 四`;
    
    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const lyrics = result.score?.measures[0].lyrics?.syllables;
    expect(lyrics).toHaveLength(4);
    expect(lyrics?.[0].text).toBe('一');
    expect(lyrics?.[2].text).toBe('三');
  });
});

