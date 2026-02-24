import { describe, it, expect } from 'vitest';
import { tokenize } from '../parser/tokenizer';
import type { Token, TokenType } from '../parser/tokenizer';

// ============================================================
// 辅助：过滤掉 NEWLINE / EOF，只看业务 token
// ============================================================
function bodyTokens(tokens: Token[]): Token[] {
  return tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF');
}

function types(tokens: Token[]): TokenType[] {
  return bodyTokens(tokens).map(t => t.type);
}

function values(tokens: Token[]): string[] {
  return bodyTokens(tokens).map(t => t.value);
}

// ============================================================
// 元信息 Token
// ============================================================
describe('Tokenizer — Metadata', () => {
  it('should emit METADATA_KEY + METADATA_VALUE for each meta line', () => {
    const src = `标题: 测试\n调号: C\n拍号: 4/4\n速度: 120\n\n1 |`;
    const ts = tokenize(src);
    const meta = ts.filter(t => t.type === 'METADATA_KEY' || t.type === 'METADATA_VALUE');
    expect(meta.map(t => t.type)).toEqual([
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
    ]);
    expect(meta.filter(t => t.type === 'METADATA_KEY').map(t => t.value)).toEqual(['标题', '调号', '拍号', '速度']);
    expect(meta.filter(t => t.type === 'METADATA_VALUE').map(t => t.value)).toEqual(['测试', 'C', '4/4', '120']);
  });

  it('should support english meta keys', () => {
    const src = `title: My Song\nkey: G\ntime: 3/4\ntempo: 90\n\n1 |`;
    const keys = tokenize(src).filter(t => t.type === 'METADATA_KEY').map(t => t.value);
    expect(keys).toEqual(['title', 'key', 'time', 'tempo']);
  });

  it('should stop body parsing at the correct line after metadata', () => {
    // bodyStartLine 之后才出现音符
    const src = `标题: X\n\n5 |`;
    const notes = tokenize(src).filter(t => t.type === 'NOTE');
    expect(notes).toHaveLength(1);
    expect(notes[0].value).toBe('5');
  });

  it('should parse body correctly when there is no metadata', () => {
    const src = `1 2 3 |`;
    const ts = types(tokenize(src));
    expect(ts).toContain('NOTE');
    expect(ts).not.toContain('METADATA_KEY');
  });
});

// ============================================================
// 音符 token
// ============================================================
describe('Tokenizer — NOTE', () => {
  it('should emit NOTE tokens for digits 1-7', () => {
    const ts = tokenize(`1 2 3 4 5 6 7 |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes.map(t => t.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('should emit REST for 0', () => {
    const ts = tokenize(`1 0 5 |`);
    const rest = ts.filter(t => t.type === 'REST');
    expect(rest).toHaveLength(1);
    expect(rest[0].value).toBe('0');
  });

  it('should record correct line and column for NOTE', () => {
    const src = `1 2 |`;
    const notes = tokenize(src).filter(t => t.type === 'NOTE');
    expect(notes[0].line).toBe(1);
    expect(notes[0].column).toBe(1);
    expect(notes[1].column).toBe(3);
  });
});

// ============================================================
// 时值修饰：减时线 / 、 附点 .
// ============================================================
describe('Tokenizer — UNDERLINE / DOT', () => {
  it('should emit UNDERLINE for each /', () => {
    const ts = tokenize(`1/ 2// 3 |`);
    const us = ts.filter(t => t.type === 'UNDERLINE');
    expect(us).toHaveLength(3);
  });

  it('should emit DOT after note', () => {
    const ts = tokenize(`1. 2 |`);
    expect(ts.filter(t => t.type === 'DOT')).toHaveLength(1);
  });

  it('should emit DOT after UNDERLINE (6/.)', () => {
    // 附点在减时线之后：6/.
    const ts = tokenize(`6/. |`);
    const tys = types(ts);
    // 应有 NOTE, UNDERLINE, DOT
    expect(tys).toContain('NOTE');
    expect(tys).toContain('UNDERLINE');
    expect(tys).toContain('DOT');
    // 顺序：NOTE → UNDERLINE → DOT
    const noteIdx = tys.indexOf('NOTE');
    const ulIdx = tys.indexOf('UNDERLINE');
    const dotIdx = tys.indexOf('DOT');
    expect(noteIdx).toBeLessThan(ulIdx);
    expect(ulIdx).toBeLessThan(dotIdx);
  });

  it('should emit DOT before UNDERLINE (6./)', () => {
    const ts = tokenize(`6./ |`);
    const tys = types(ts);
    expect(tys.indexOf('DOT')).toBeLessThan(tys.indexOf('UNDERLINE'));
  });
});

// ============================================================
// 八度标记 ' 和 ,
// ============================================================
describe('Tokenizer — OCTAVE_UP / OCTAVE_DOWN', () => {
  it("should emit OCTAVE_UP after a digit", () => {
    const ts = tokenize(`1' |`);
    expect(ts.filter(t => t.type === 'OCTAVE_UP')).toHaveLength(1);
  });

  it("should emit multiple OCTAVE_UP for ''", () => {
    const ts = tokenize(`1'' |`);
    expect(ts.filter(t => t.type === 'OCTAVE_UP')).toHaveLength(2);
  });

  it("should NOT emit OCTAVE_UP when ' is at line start", () => {
    const ts = tokenize(`' 1 |`);
    expect(ts.filter(t => t.type === 'OCTAVE_UP')).toHaveLength(0);
  });

  it("should emit OCTAVE_UP after UNDERLINE (5'/)", () => {
    const ts = tokenize(`5'/ |`);
    const tys = types(ts);
    expect(tys).toContain('OCTAVE_UP');
  });

  it('should emit OCTAVE_DOWN after a digit', () => {
    const ts = tokenize(`7, |`);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(1);
  });

  it('should emit multiple OCTAVE_DOWN for ,,', () => {
    const ts = tokenize(`1,, |`);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(2);
  });

  it('should NOT emit OCTAVE_DOWN when , is at line start or after non-note', () => {
    const ts = tokenize(`, 1 |`);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(0);
  });

  it('should emit OCTAVE_DOWN after UNDERLINE (5/,)', () => {
    const ts = tokenize(`5/, |`);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(1);
  });
});

// ============================================================
// 升降号 # b
// ============================================================
describe('Tokenizer — SHARP / FLAT', () => {
  it('should emit SHARP before a note', () => {
    const ts = tokenize(`#4 |`);
    expect(ts.filter(t => t.type === 'SHARP')).toHaveLength(1);
  });

  it('should emit FLAT before a note', () => {
    const ts = tokenize(`b7 |`);
    expect(ts.filter(t => t.type === 'FLAT')).toHaveLength(1);
  });

  it('should NOT emit FLAT when b is not followed by 1-7', () => {
    // b 后面是空格，不生成 FLAT（也不报 ERROR）
    const ts = tokenize(`1 b 2 |`);
    expect(ts.filter(t => t.type === 'FLAT')).toHaveLength(0);
  });
});

// ============================================================
// 结构 token：BARLINE / TIE
// ============================================================
describe('Tokenizer — BARLINE / TIE', () => {
  it('should emit BARLINE for |', () => {
    const ts = tokenize(`1 2 | 3 4 |`);
    expect(ts.filter(t => t.type === 'BARLINE')).toHaveLength(2);
  });

  it('should emit TIE for -', () => {
    const ts = tokenize(`1 - - |`);
    expect(ts.filter(t => t.type === 'TIE')).toHaveLength(2);
  });
});

// ============================================================
// 圆滑线 ( )
// ============================================================
describe('Tokenizer — SLUR_START / SLUR_END', () => {
  it('should emit SLUR_START and SLUR_END', () => {
    const ts = tokenize(`(1 2 3) |`);
    expect(ts.filter(t => t.type === 'SLUR_START')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'SLUR_END')).toHaveLength(1);
  });

  it('should handle nested slurs', () => {
    const ts = tokenize(`(1 (2) 3) |`);
    expect(ts.filter(t => t.type === 'SLUR_START')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'SLUR_END')).toHaveLength(2);
  });
});

// ============================================================
// 装饰音：换气 v、倚音前缀 ^、波音 ~
// ============================================================
describe('Tokenizer — BREATH / GRACE_PREFIX / TRILL', () => {
  it('should emit BREATH for v and V', () => {
    const ts = tokenize(`1 v 2 V 3 |`);
    expect(ts.filter(t => t.type === 'BREATH')).toHaveLength(2);
  });

  it('should emit GRACE_PREFIX for ^', () => {
    const ts = tokenize(`^3/ 1 |`);
    expect(ts.filter(t => t.type === 'GRACE_PREFIX')).toHaveLength(1);
  });

  it('should emit TRILL for ~', () => {
    const ts = tokenize(`~1 ~~2 |`);
    expect(ts.filter(t => t.type === 'TRILL')).toHaveLength(3);
  });
});

// ============================================================
// 旋律行 Q / 歌词行 C
// ============================================================
describe('Tokenizer — MELODY_MARKER / LYRICS_MARKER', () => {
  it('should emit MELODY_MARKER for Q-prefixed lines', () => {
    const ts = tokenize(`Q 1 2 3 4 |`);
    expect(ts.filter(t => t.type === 'MELODY_MARKER')).toHaveLength(1);
    // Q 后的内容仍正常 tokenize
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(4);
  });

  it('should emit LYRICS_MARKER + LYRICS_TEXT for C-prefixed lines', () => {
    const ts = tokenize(`1 2 |\nC 一 二`);
    expect(ts.filter(t => t.type === 'LYRICS_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'LYRICS_TEXT')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'LYRICS_TEXT')[0].value).toBe('一 二');
  });

  it('should emit LYRICS_MARKER with empty text when C has no content', () => {
    const ts = tokenize(`1 2 |\nC`);
    expect(ts.filter(t => t.type === 'LYRICS_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'LYRICS_TEXT')).toHaveLength(0);
  });
});

// ============================================================
// hasSpaceBefore 标记
// ============================================================
describe('Tokenizer — hasSpaceBefore', () => {
  it('should mark hasSpaceBefore=false for first token in group', () => {
    const ts = tokenize(`1/ 2/ |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes[0].hasSpaceBefore).toBe(false);
    expect(notes[1].hasSpaceBefore).toBe(true);
  });

  it('should mark hasSpaceBefore=false for tokens immediately after another', () => {
    // 6/.5// — 6 和 5 之间没有空格
    const ts = tokenize(`6/.5// |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes[0].hasSpaceBefore).toBe(false); // 6
    expect(notes[1].hasSpaceBefore).toBe(false); // 5（紧跟 DOT 之后，无空格）
  });

  it('should reset hasSpaceBefore after a space', () => {
    const ts = tokenize(`1 2 |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes[1].hasSpaceBefore).toBe(true);
  });
});

// ============================================================
// NEWLINE / EOF
// ============================================================
describe('Tokenizer — NEWLINE / EOF', () => {
  it('should emit NEWLINE at end of each body line', () => {
    const ts = tokenize(`1 |\n2 |`);
    expect(ts.filter(t => t.type === 'NEWLINE')).toHaveLength(2);
  });

  it('should always end with EOF', () => {
    const ts = tokenize(`1 |`);
    expect(ts[ts.length - 1].type).toBe('EOF');
  });
});

// ============================================================
// ERROR token
// ============================================================
describe('Tokenizer — ERROR', () => {
  it('should emit ERROR for unrecognized characters', () => {
    const ts = tokenize(`1 @ 2 |`);
    expect(ts.filter(t => t.type === 'ERROR')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'ERROR')[0].value).toBe('@');
  });

  it('should continue tokenizing after an ERROR token', () => {
    const ts = tokenize(`1 @ 2 |`);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(2);
  });
});

// ============================================================
// 复合修饰连写（混合场景）
// ============================================================
describe('Tokenizer — combined modifiers', () => {
  it('should tokenize #4\'/  (sharp + note + octave_up + underline)', () => {
    const ts = tokenize(`#4'/ |`);
    const tys = types(ts);
    expect(tys).toContain('SHARP');
    expect(tys).toContain('NOTE');
    expect(tys).toContain('OCTAVE_UP');
    expect(tys).toContain('UNDERLINE');
  });

  it('should tokenize b3,// (flat + note + octave_down + 2×underline)', () => {
    const ts = tokenize(`b3,// |`);
    const tys = types(ts);
    expect(tys).toContain('FLAT');
    expect(tys).toContain('NOTE');
    expect(tys).toContain('OCTAVE_DOWN');
    expect(tys.filter(t => t === 'UNDERLINE')).toHaveLength(2);
  });

  it('should tokenize 5,/ (note + octave_down + underline)', () => {
    const ts = tokenize(`5,/ |`);
    const tys = types(ts);
    expect(tys).toContain('OCTAVE_DOWN');
    expect(tys).toContain('UNDERLINE');
  });

  it('should tokenize full measure with mixed notation', () => {
    // 源自 bug 场景：6/. 5// 连写
    const ts = tokenize(`6/.5// 1 |`);
    const noteVals = ts.filter(t => t.type === 'NOTE').map(t => t.value);
    expect(noteVals).toEqual(['6', '5', '1']);
    expect(ts.filter(t => t.type === 'UNDERLINE')).toHaveLength(3); // 1 + 2
    expect(ts.filter(t => t.type === 'DOT')).toHaveLength(1);
  });
});

// ============================================================
// 多行处理
// ============================================================
describe('Tokenizer — multi-line', () => {
  it('should correctly assign line numbers across multiple lines', () => {
    const src = `标题: X\n\n1 2 |\n3 4 |`;
    const notes = tokenize(src).filter(t => t.type === 'NOTE');
    // 第一行 body 是 "1 2 |"，第二行是 "3 4 |"
    expect(notes[0].line).toBe(notes[1].line); // 1 和 2 同行
    expect(notes[2].line).toBe(notes[3].line); // 3 和 4 同行
    expect(notes[0].line).toBeLessThan(notes[2].line); // 第一行编号小于第二行
  });

  it('should handle empty lines between body lines', () => {
    const ts = tokenize(`1 |\n\n2 |`);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(2);
  });
});
