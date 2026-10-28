import { describe, expect, it } from 'vitest';
import { getSymbolKeyStrokes, KEYBOARD_ROWS, SYMBOL_GROUPS } from '../components/Help/symbol-reference-data';

describe('符号速查的英文美式键位', () => {
  it.each([
    ['|', 'Backslash', true], ['#', 'Digit3', true], ['^', 'Digit6', true],
    ['!', 'Digit1', true], ['~', 'Backquote', true], ['_', 'Minus', true],
    [':', 'Semicolon', true], ['(', 'Digit9', true], [')', 'Digit0', true],
    ["'", 'Quote', false], [',', 'Comma', false], ['.', 'Period', false],
    ['/', 'Slash', false], ['b', 'KeyB', false], ['Q', 'KeyQ', true],
    ['v', 'KeyV', false], ['V', 'KeyV', true], ['[', 'BracketLeft', false],
    [']', 'BracketRight', false], [' ', 'Space', false], ['\n', 'Enter', false],
    ['\t', 'Tab', false],
  ] as const)('把 %s 对应到正确物理键，并区分是否需要 Shift', (symbol, code, shift) => {
    expect(getSymbolKeyStrokes(symbol)).toEqual([{ code, shift }]);
  });

  it('保留反复符号的输入顺序、重复次数及各步 Shift 状态', () => {
    expect(getSymbolKeyStrokes(':||:')).toEqual([
      { code: 'Semicolon', shift: true },
      { code: 'Backslash', shift: true },
      { code: 'Backslash', shift: true },
      { code: 'Semicolon', shift: true },
    ]);
    expect(getSymbolKeyStrokes('~.')).toEqual([
      { code: 'Backquote', shift: true }, { code: 'Period', shift: false },
    ]);
  });

  it('输入声部标记时只为大写行标记使用 Shift', () => {
    const strokes = getSymbolKeyStrokes('Q[upper]');
    expect(strokes.map(stroke => stroke.code)).toEqual([
      'KeyQ', 'BracketLeft', 'KeyU', 'KeyP', 'KeyP', 'KeyE', 'KeyR', 'BracketRight',
    ]);
    expect(strokes.filter(stroke => stroke.shift)).toEqual([{ code: 'KeyQ', shift: true }]);
  });

  it('速查表中所有写法都能在虚拟键盘中找到按键', () => {
    const codes = new Set(KEYBOARD_ROWS.flat().map(key => key.code));
    for (const group of SYMBOL_GROUPS) {
      for (const symbol of group.symbols) {
        const strokes = getSymbolKeyStrokes(symbol.input);
        expect(strokes.length).toBeGreaterThan(0);
        for (const stroke of strokes) expect(codes.has(stroke.code)).toBe(true);
      }
    }
  });
});
