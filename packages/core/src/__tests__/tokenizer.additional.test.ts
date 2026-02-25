// ============================================================
// Tokenizer Tests - Additional Test Cases
// ============================================================

import { describe, it, expect } from 'vitest';
import { tokenize } from '../parser/tokenizer';
import type { Token, TokenType } from '../parser/tokenizer';

// Helper functions
function bodyTokens(tokens: Token[]): Token[] {
  return tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF');
}

function types(tokens: Token[]): TokenType[] {
  return bodyTokens(tokens).map(t => t.type);
}

// ============================================================
// Offset tracking
// ============================================================
describe('Tokenizer — offset tracking', () => {
  it('should track correct offsets for notes', () => {
    const src = `1 2 3 |`;
    const notes = tokenize(src).filter(t => t.type === 'NOTE');
    
    expect(notes[0].offset).toBe(0);
    expect(notes[1].offset).toBe(2);
    expect(notes[2].offset).toBe(4);
  });

  it('should track correct column numbers', () => {
    const src = `1 2 3 |`;
    const notes = tokenize(src).filter(t => t.type === 'NOTE');
    
    expect(notes[0].column).toBe(1);
    expect(notes[1].column).toBe(3);
    expect(notes[2].column).toBe(5);
  });
});

// ============================================================
// Edge cases for specific tokens
// ============================================================
describe('Tokenizer — edge cases', () => {
  it('should handle multiple consecutive barlines', () => {
    const ts = tokenize(`1 ||| 2 |`);
    expect(ts.filter(t => t.type === 'BARLINE')).toHaveLength(4); // ||| = 3 bars, plus final |
  });

  it('should handle multiple consecutive ties', () => {
    const ts = tokenize(`1 - - - |`);
    expect(ts.filter(t => t.type === 'TIE')).toHaveLength(3);
  });

  it('should handle multiple consecutive octave markers', () => {
    const ts = tokenize(`1''' |`);
    expect(ts.filter(t => t.type === 'OCTAVE_UP')).toHaveLength(3);
  });

  it('should handle multiple consecutive flat markers', () => {
    const ts = tokenize(`1,,, |`);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(3);
  });

  it('should handle tabs as whitespace', () => {
    const ts = tokenize(`1\t2\t\t3 |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes).toHaveLength(3);
    expect(notes[1].hasSpaceBefore).toBe(true);
  });

  it('should handle empty source', () => {
    const ts = tokenize('');
    expect(ts.filter(t => t.type === 'EOF')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(0);
  });

  it('should handle source with only whitespace', () => {
    const ts = tokenize('   \n  \n  ');
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(0);
    expect(ts[ts.length - 1].type).toBe('EOF');
  });

  it('should handle leading whitespace', () => {
    const ts = tokenize(`  1 2 |`);
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes).toHaveLength(2);
  });

  it('should handle trailing whitespace', () => {
    const ts = tokenize(`1 2 |  `);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'BARLINE')).toHaveLength(1);
  });
});

// ============================================================
// Metadata edge cases
// ============================================================
describe('Tokenizer — metadata edge cases', () => {
  it('should handle Chinese colon in metadata', () => {
    const src = `标题：测试曲\n调号：C`;
    const metaKeys = tokenize(src).filter(t => t.type === 'METADATA_KEY');
    expect(metaKeys).toHaveLength(2);
    expect(metaKeys[0].value).toBe('标题');
    expect(metaKeys[1].value).toBe('调号');
  });

  it('should handle metadata with extra spaces', () => {
    const src = `标题：  测试  \n调号： C`;
    const metaValues = tokenize(src).filter(t => t.type === 'METADATA_VALUE');
    expect(metaValues).toHaveLength(2);
  });

  it('should handle mixed Chinese and English metadata keys', () => {
    const src = `标题：Test\nkey: C\n拍号：4/4\ntempo: 120`;
    const metaKeys = tokenize(src).filter(t => t.type === 'METADATA_KEY');
    expect(metaKeys).toHaveLength(4);
    expect(metaKeys.map(k => k.value)).toEqual(['标题', 'key', '拍号', 'tempo']);
  });
});

// ============================================================
// Lyrics tokenizer edge cases
// ============================================================
describe('Tokenizer — lyrics edge cases', () => {
  it('should handle C marker without content', () => {
    const src = `1 2 |\nC`;
    const ts = tokenize(src);
    expect(ts.filter(t => t.type === 'LYRICS_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'LYRICS_TEXT')).toHaveLength(0);
  });

  it('should handle multiple C lines', () => {
    const src = `1 2 |\nC 一 二\nC 三 四`;
    const lyricsMarkers = tokenize(src).filter(t => t.type === 'LYRICS_MARKER');
    expect(lyricsMarkers).toHaveLength(2);
  });

  it('should handle Q marker with content', () => {
    const src = `Q 1 2 3 4 |`;
    const ts = tokenize(src);
    expect(ts.filter(t => t.type === 'MELODY_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(4);
  });

  it('should handle Q marker without content', () => {
    const src = `Q\n1 2 |`;
    const ts = tokenize(src);
    expect(ts.filter(t => t.type === 'MELODY_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(2);
  });

  it('should handle mixed Q and C lines', () => {
    const src = `Q 1 2 |\nC 一 二`;
    const ts = tokenize(src);
    expect(ts.filter(t => t.type === 'MELODY_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'LYRICS_MARKER')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(2);
  });
});

// ============================================================
// Complex combined scenarios
// ============================================================
describe('Tokenizer — complex scenarios', () => {
  it('should handle full measure with all modifiers', () => {
    const src = `#1'/ b2,, 3. v ^4// ~5 |`;
    const ts = tokenize(src);
    
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(5);
    expect(ts.filter(t => t.type === 'SHARP')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'FLAT')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'OCTAVE_UP')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'OCTAVE_DOWN')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'BREATH')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'GRACE_PREFIX')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'TRILL')).toHaveLength(1);
  });

  it('should handle measure with slurs and modifiers', () => {
    const src = `(#1'/ 2) 3~ |`;
    const ts = tokenize(src);
    
    expect(ts.filter(t => t.type === 'SLUR_START')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'SLUR_END')).toHaveLength(1);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(3);
    expect(ts.filter(t => t.type === 'TRILL')).toHaveLength(1);
  });

  it('should handle nested slurs', () => {
    const src = `(1 (2 3) 4) |`;
    const ts = tokenize(src);
    
    expect(ts.filter(t => t.type === 'SLUR_START')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'SLUR_END')).toHaveLength(2);
  });

  it('should handle repeated slur patterns', () => {
    const src = `(1 2 3) (4 5 6) |`;
    const ts = tokenize(src);
    
    expect(ts.filter(t => t.type === 'SLUR_START')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'SLUR_END')).toHaveLength(2);
    expect(ts.filter(t => t.type === 'NOTE')).toHaveLength(6);
  });
});

// ============================================================
// Token order and sequence
// ============================================================
describe('Tokenizer — token order', () => {
  it('should emit tokens in correct order for sharp note with modifiers', () => {
    const ts = tokenize(`#4'/ |`);
    const tokenTypes = ts.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    
    expect(tokenTypes).toEqual(['SHARP', 'NOTE', 'OCTAVE_UP', 'UNDERLINE', 'BARLINE']);
  });

  it('should emit tokens in correct order for flat note with modifiers', () => {
    const ts = tokenize(`b3,// |`);
    const tokenTypes = ts.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    
    expect(tokenTypes).toEqual(['FLAT', 'NOTE', 'OCTAVE_DOWN', 'UNDERLINE', 'UNDERLINE', 'BARLINE']);
  });

  it('should emit tokens in correct order for dotted note', () => {
    const ts = tokenize(`6/. |`);
    const tokenTypes = ts.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    
    expect(tokenTypes).toEqual(['NOTE', 'UNDERLINE', 'DOT', 'BARLINE']);
  });

  it('should emit tokens in correct order for grace note', () => {
    const ts = tokenize(`^3/ 1 |`);
    const tokenTypes = ts.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    
    expect(tokenTypes).toEqual(['GRACE_PREFIX', 'NOTE', 'UNDERLINE', 'NOTE', 'BARLINE']);
  });

  it('should emit tokens in correct order for trill note', () => {
    const ts = tokenize(`~5 |`);
    const tokenTypes = ts.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF').map(t => t.type);
    
    expect(tokenTypes).toEqual(['TRILL', 'NOTE', 'BARLINE']);
  });
});
