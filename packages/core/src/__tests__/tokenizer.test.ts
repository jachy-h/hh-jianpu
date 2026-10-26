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



// ============================================================
// 元信息 Token
// ============================================================
describe('Tokenizer — Metadata', () => {
  it('should emit METADATA_KEY + METADATA_VALUE for each meta line', () => {
    const src = `标题：测试\n调号：C\n拍号：4/4\n速度：120\n\n1 |`;
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
    const src = `标题：X\n\n5 |`;
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

  it('should support YAML frontmatter format with ---', () => {
    const src = `---
标题：小星星
调号：C
拍号：4/4
速度：120
---

1 1 5 5 |`;
    const ts = tokenize(src);
    
    // Check for FRONTMATTER_SEPARATOR tokens
    const separators = ts.filter(t => t.type === 'FRONTMATTER_SEPARATOR');
    expect(separators).toHaveLength(2);
    expect(separators[0].value).toBe('---');
    expect(separators[1].value).toBe('---');
    
    // Check metadata tokens
    const meta = ts.filter(t => t.type === 'METADATA_KEY' || t.type === 'METADATA_VALUE');
    expect(meta.map(t => t.type)).toEqual([
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
      'METADATA_KEY', 'METADATA_VALUE',
    ]);
    expect(meta.filter(t => t.type === 'METADATA_KEY').map(t => t.value)).toEqual(['标题', '调号', '拍号', '速度']);
    expect(meta.filter(t => t.type === 'METADATA_VALUE').map(t => t.value)).toEqual(['小星星', 'C', '4/4', '120']);
    
    // Check音符 tokens
    const notes = ts.filter(t => t.type === 'NOTE');
    expect(notes).toHaveLength(4);
  });

  it('should support YAML frontmatter with additional fields', () => {
    const src = `---
标题：生日快乐
调号：F
拍号：3/4
速度：100
作曲：Mildred Hill
---

5 5 4 5 |`;
    const ts = tokenize(src);
    
    const metaKeys = ts.filter(t => t.type === 'METADATA_KEY').map(t => t.value);
    expect(metaKeys).toEqual(['标题', '调号', '拍号', '速度', '作曲']);
  });
});

// ============================================================
