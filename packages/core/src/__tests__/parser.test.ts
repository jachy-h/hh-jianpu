import { describe, it, expect } from 'vitest';
import { parse } from '../parser/index';

describe('Parser', () => {
  it('should parse basic metadata', () => {
    const source = `标题：测试曲
调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

7, 6, 1 2 |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(7);
      expect(notes[0].octave).toBe(-1);
    }
  });

  it('should parse multiple octave markers', () => {
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

1 0 5 - |`;

    const result = parse(source);
    const notes = result.score!.measures[0].notes;

    expect(notes[0].type).toBe('note');
    expect(notes[1].type).toBe('rest');
    expect(notes[2].type).toBe('note');
    expect(notes[3].type).toBe('tie');
  });

  it('should parse breath marks', () => {
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 | 5 6 7 '1 |`;

    const result = parse(source);
    expect(result.score?.measures).toHaveLength(2);
    expect(result.score?.measures[0].number).toBe(1);
    expect(result.score?.measures[1].number).toBe(2);
  });

  it('should parse slur groups within single measure', () => {
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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

  it('should parse dot after underline (6/.) and beam mixed durations (6/.5//)', () => {
    // 6/. → 附点八分音符（base=8, dot=true）
    // 5// → 十六分音符（base=16, dot=false）
    // 两者无空格，应连入同一 beamGroup
    const source = `调号：C
拍号：2/4
速度：120

6/.5// 1 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);

    const notes = result.score!.measures[0].notes;

    // 第一个音符：6，附点八分音符
    expect(notes[0].type).toBe('note');
    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(6);
      expect(notes[0].duration.base).toBe(8);
      expect(notes[0].dot).toBe(true);
    }

    // 第二个音符：5，十六分音符
    expect(notes[1].type).toBe('note');
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(5);
      expect(notes[1].duration.base).toBe(16);
      expect(notes[1].dot).toBe(false);
    }

    // 两者应属于同一 beamGroup（无空格相邻且均有减时线）
    if (notes[0].type === 'note' && notes[1].type === 'note') {
      expect(notes[0].beamGroup).toBeDefined();
      expect(notes[1].beamGroup).toBe(notes[0].beamGroup);
    }

    // 第三个音符（1）不在 beamGroup 中
    if (notes[2].type === 'note') {
      expect(notes[2].beamGroup).toBeUndefined();
    }
  });


describe('Beat Validation', () => {
  it('should validate correct 4/4 measure', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect too many beats in 4/4', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 5 |`;

    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
    expect(result.errors[0].message).toContain('期望 4 拍');
    expect(result.errors[0].message).toContain('实际 5');
  });

  it('should detect too few beats in 4/4', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 |`;

    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
    expect(result.errors[0].message).toContain('期望 4 拍');
    expect(result.errors[0].message).toContain('实际 2');
  });

  it('should validate 3/4 measures correctly', () => {
    const source = `调号：C
拍号：3/4
速度：120

1 2 3 | 4 5 6 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle ties correctly in beat calculation', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle eighth notes correctly', () => {
    const source = `调号：C
拍号：4/4
速度：120

1/ 2/ 3/ 4/ 5/ 6/ 7/ 1'/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should ignore grace notes in beat calculation', () => {
    const source = `调号：C
拍号：4/4
速度：120

^3/ 1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should ignore breath marks in beat calculation', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 v 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate multiple measures', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 | 5 6 | 1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(1); // 第 2 小节错误
    expect(result.errors[0].message).toContain('小节 2');
  });
});

describe('Lyrics Parsing', () => {
  it('should parse basic lyrics', () => {
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

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
    const source = `调号：C
拍号：4/4
速度：120

1 ^2/ 3 4 |
C 一 二 三`;

    const result = parse(source);
    // 应该有节拍验证错误（3 个有效音符 = 3 拍，不满足 4/4）
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.score?.measures[0].lyrics?.syllables).toHaveLength(3);
  });

  it('should handle multiple lyrics lines', () => {
    const source = `调号：C
拍号：4/4
速度：120

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

  it('should handle empty lyrics line', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 |
C`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    // 空歌词行不应添加歌词
    expect(result.score?.measures[0].lyrics).toBeUndefined();
  });
});

// ============================================================
// Accidentals (Sharps and Flats)
// ============================================================

describe('Accidentals', () => {
  it('should parse sharp notes', () => {
    const source = `调号：C
拍号：4/4
速度：120

#1 #2 #3 #4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].accidental).toBe('sharp');
    }
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(2);
      expect(notes[1].accidental).toBe('sharp');
    }
  });

  it('should parse flat notes', () => {
    const source = `调号：C
拍号：4/4
速度：120

b7 b6 b3 - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(7);
      expect(notes[0].accidental).toBe('flat');
    }
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(6);
      expect(notes[1].accidental).toBe('flat');
    }
  });

  it('should parse sharp with octave markers', () => {
    const source = `调号：C
拍号：4/4
速度：120

#1' - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].accidental).toBe('sharp');
      expect(notes[0].octave).toBe(1);
    }
  });

  it('should parse sharp with underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

#1/ #2/ #3/ #4/ |`;

    const result = parse(source);
    // 8 个八分音符 = 4 拍
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].accidental).toBe('sharp');
      expect(notes[0].duration.base).toBe(8);
    }
    if (notes[1].type === 'note') {
      expect(notes[1].pitch).toBe(2);
      expect(notes[1].accidental).toBe('sharp');
      expect(notes[1].duration.base).toBe(8);
    }
    if (notes[2].type === 'note') {
      expect(notes[2].pitch).toBe(3);
      expect(notes[2].accidental).toBe('sharp');
      expect(notes[2].duration.base).toBe(8);
    }
    if (notes[3].type === 'note') {
      expect(notes[3].pitch).toBe(4);
      expect(notes[3].accidental).toBe('sharp');
      expect(notes[3].duration.base).toBe(8);
    }
  });

  it('should parse combined sharp with octave and underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

#4'/ #4'/ #4'/ #4'/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.pitch).toBe(4);
      expect(note.accidental).toBe('sharp');
      expect(note.octave).toBe(1);
      expect(note.duration.base).toBe(8);
    }
  });

  it('should parse combined flat with octave and underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

b3,// b3,// b3,// b3,// |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.pitch).toBe(3);
      expect(note.accidental).toBe('flat');
      expect(note.octave).toBe(-1);
      expect(note.duration.base).toBe(16);
    }
  });
});

// ============================================================
// Grace Notes (Decorative Notes)
// ============================================================

describe('Grace Notes', () => {
  it('should parse long grace note (single underline)', () => {
    const source = `调号：C
拍号：4/4
速度：120

^3/ 5 - - - |`;

    const result = parse(source);
    // 倚音不占拍，5 - - - = 4 拍
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].isGrace).toBe(true);
      expect(notes[0].graceType).toBe('long');
      expect(notes[0].duration.base).toBe(8);
    }
  });

  it('should parse short grace note (double underline)', () => {
    const source = `调号：C
拍号：4/4
速度：120

^3// 5 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].isGrace).toBe(true);
      expect(notes[0].graceType).toBe('short');
      expect(notes[0].duration.base).toBe(16);
    }
  });

  it('should parse grace note with octave marker', () => {
    const source = `调号：C
拍号：4/4
速度：120

^1'/ 2 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].isGrace).toBe(true);
      expect(notes[0].pitch).toBe(1);
      expect(notes[0].octave).toBe(1);
      expect(notes[0].graceType).toBe('long');
    }
  });

  it('should parse grace note with sharp', () => {
    const source = `调号：C
拍号：4/4
速度：120

^#4/ 5 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].isGrace).toBe(true);
      expect(notes[0].pitch).toBe(4);
      expect(notes[0].accidental).toBe('sharp');
      expect(notes[0].graceType).toBe('long');
    }
  });

  it('should parse multiple grace notes in sequence', () => {
    const source = `调号：C
拍号：4/4
速度：120

^1/ ^2/ 3 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    if (notes[0].type === 'note') {
      expect(notes[0].isGrace).toBe(true);
      expect(notes[0].pitch).toBe(1);
    }
    if (notes[1].type === 'note') {
      expect(notes[1].isGrace).toBe(true);
      expect(notes[1].pitch).toBe(2);
    }
    if (notes[2].type === 'note') {
      expect(notes[2].isGrace).toBeUndefined();
    }
  });

  it('should report error for grace note without underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

^3 5 - - - |`;

    const result = parse(source);
    // 倚音必须有减时线，否则会报错
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('倚音必须有减时线');
  });
});

// ============================================================
// Trills (Ornamental Notes)
// ============================================================

describe('Trills', () => {
  it('should parse single trill (~)', () => {
    const source = `调号：C
拍号：4/4
速度：120

~5 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.trillType).toBe('single');
    }
  });

  it('should parse double trill (~~)', () => {
    const source = `调号：C
拍号：4/4
速度：120

~~5 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.trillType).toBe('double');
    }
  });

  it('should parse lower trill (~.)', () => {
    const source = `调号：C
拍号：4/4
速度：120

~.5 - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.trillType).toBe('lower');
    }
  });

  it('should parse trill with octave marker', () => {
    const source = `调号：C
拍号：4/4
速度：120

~5' - - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.trillType).toBe('single');
      expect(note.octave).toBe(1);
    }
  });

  it('should parse trill with underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

~5/ 5/ - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.trillType).toBe('single');
      expect(note.duration.base).toBe(8);
    }
  });
});

// ============================================================
// Dotted Notes
// ============================================================

describe('Dotted Notes', () => {
  it('should parse dotted quarter note', () => {
    const source = `调号：C
拍号：4/4
速度：120

1. 2 - - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.dot).toBe(true);
      expect(note.duration.dots).toBe(1);
    }
  });

  it('should parse dotted eighth note', () => {
    const source = `调号：C
拍号：4/4
速度：120

1/. 2/. 3/ 4/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.dot).toBe(true);
      expect(note.duration.base).toBe(8);
      expect(note.duration.dots).toBe(1);
    }
  });

  it('should parse dotted note before underline (6./)', () => {
    const source = `调号：C
拍号：4/4
速度：120

6./ 5// 1 2 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.dot).toBe(true);
      expect(note.duration.base).toBe(8);
    }
  });

  it('should parse dotted note after underline (6/.)', () => {
    const source = `调号：C
拍号：4/4
速度：120

6/. 5// 1 2 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const note = result.score!.measures[0].notes[0];

    if (note.type === 'note') {
      expect(note.dot).toBe(true);
      expect(note.duration.base).toBe(8);
    }
  });
});

// ============================================================
// Beam Groups (连音组)
// ============================================================

describe('Beam Groups', () => {
  it('should group consecutive eighth notes without space', () => {
    const source = `调号：C
拍号：4/4
速度：120

1/2/3/4/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    // 所有八分音符应该在同一连音组
    if (notes[0].type === 'note' && notes[1].type === 'note' &&
        notes[2].type === 'note' && notes[3].type === 'note') {
      expect(notes[0].beamGroup).toBeDefined();
      expect(notes[1].beamGroup).toBe(notes[0].beamGroup);
      expect(notes[2].beamGroup).toBe(notes[0].beamGroup);
      expect(notes[3].beamGroup).toBe(notes[0].beamGroup);
    }
  });

  it('should not group notes separated by space', () => {
    const source = `调号：C
拍号：4/4
速度：120

1/ 2/  3/ 4/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    // 1/ 和 2/ 一组，3/ 和 4/ 另一组
    if (notes[0].type === 'note' && notes[1].type === 'note' &&
        notes[2].type === 'note' && notes[3].type === 'note') {
      expect(notes[0].beamGroup).toBeDefined();
      expect(notes[1].beamGroup).toBe(notes[0].beamGroup);
      // 2/ 和 3/ 之间有空格，应该不同组
      expect(notes[2].beamGroup).toBeDefined();
      expect(notes[2].beamGroup).not.toBe(notes[0].beamGroup);
      expect(notes[3].beamGroup).toBe(notes[2].beamGroup);
    }
  });

  it('should not group quarter notes (no underline)', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    // 四分音符不应该有连音组
    notes.forEach(note => {
      if (note.type === 'note') {
        expect(note.beamGroup).toBeUndefined();
      }
    });
  });

  it('should group mixed duration eighth notes', () => {
    const source = `调号：C
拍号：2/4
速度：120

6/.5// |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    // 附点八分和十六分音符应该在同一连音组
    if (notes[0].type === 'note' && notes[1].type === 'note') {
      expect(notes[0].beamGroup).toBeDefined();
      expect(notes[1].beamGroup).toBe(notes[0].beamGroup);
    }
  });
});

// ============================================================
// Edge Cases and Error Handling
// ============================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle empty source', () => {
    const source = '';
    const result = parse(source);
    expect(result.score).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle source with only metadata', () => {
    const source = `标题：测试
调号：C`;
    const result = parse(source);
    expect(result.score).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('未找到任何音符');
  });

  it('should handle tie at the beginning of measure', () => {
    const source = `调号：C
拍号：4/4
速度：120

- 1 2 3 |`;

    const result = parse(source);
    // 延音线在开头是合法的（虽然音乐上不合理）
    expect(result.errors).toHaveLength(0);
  });

  it('should handle multiple consecutive barlines', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 || 3 4 |`;

    const result = parse(source);
    // 空小节是允许的
    expect(result.score?.measures.length).toBeGreaterThan(1);
  });

  it('should handle rest with underline', () => {
    const source = `调号：C
拍号：4/4
速度：120

0/ 0// 0 0 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    expect(notes[0].type).toBe('rest');
    if (notes[0].type === 'rest') {
      expect(notes[0].duration.base).toBe(8);
    }
    expect(notes[1].type).toBe('rest');
    if (notes[1].type === 'rest') {
      expect(notes[1].duration.base).toBe(16);
    }
  });

  it('should handle breath marks in measure', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 v 2 V 3 - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const notes = result.score!.measures[0].notes;

    expect(notes[0].type).toBe('note');
    expect(notes[1].type).toBe('breath');
    expect(notes[2].type).toBe('note');
    expect(notes[3].type).toBe('breath');
    expect(notes[4].type).toBe('note');
  });

  it('should handle grace notes not affecting beat count', () => {
    const source = `调号：C
拍号：4/4
速度：120

^3/ 1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle breath marks not affecting beat count', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 v 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle melisma (multiple characters for one note)', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 |
C (我的) 二 三 四`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const lyrics = result.score?.measures[0].lyrics?.syllables;
    expect(lyrics?.[0].text).toBe('我的');
    expect(lyrics?.[0].isGroup).toBe(true);
  });

  it('should handle placeholder in lyrics', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 |
C 一 _ _ 四`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    const lyrics = result.score?.measures[0].lyrics?.syllables;
    expect(lyrics?.[1].isPlaceholder).toBe(true);
    expect(lyrics?.[2].isPlaceholder).toBe(true);
  });

  it('should handle different time signatures', () => {
    const source = `调号：C
拍号：3/4
速度：120

1 2 3 | 4 5 6 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    expect(result.score?.metadata.timeSignature.beats).toBe(3);
    expect(result.score?.metadata.timeSignature.beatValue).toBe(4);
  });

  it('should handle 6/8 time signature', () => {
    const source = `调号：C
拍号：6/8
速度：120

1/ 2/ 3/ 4/ 5/ 6/ |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle 2/2 time signature', () => {
    const source = `调号：C
拍号：2/2
速度：120

1 - 2 - |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error for too many beats', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 3 4 5 |`;

    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
  });

  it('should report error for too few beats', () => {
    const source = `调号：C
拍号：4/4
速度：120

1 2 |`;

    const result = parse(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('时值不符');
  });

  it('should handle Q melody marker', () => {
    const source = `调号：C
拍号：4/4
速度：120

Q 1 2 3 4 |`;

    const result = parse(source);
    expect(result.errors).toHaveLength(0);
    expect(result.score?.measures[0].notes).toHaveLength(4);
  });

  it('should handle empty Q line', () => {
    const source = `调号：C
拍号：4/4
速度：120

Q
1 2 3 4 |`;

    const result = parse(source);
    // Q 空行后仍有音符，应该正常解析
    expect(result.score?.measures[0].notes).toHaveLength(4);
  });
});
