/** 英文美式键盘上的物理键位；上层字符需要配合 Shift。 */
export interface ReferenceKey {
  readonly code: string;
  readonly label: string;
  readonly shifted?: string;
  readonly width?: string;
}

export interface KeyStroke {
  readonly code: string;
  readonly shift: boolean;
}

const letterKeys = (letters: string): ReferenceKey[] => [...letters].map(letter => ({ code: `Key${letter}`, label: letter }));

export const KEYBOARD_ROWS: readonly (readonly ReferenceKey[])[] = [
  [
    { code: 'Backquote', label: '`', shifted: '~' },
    ...[...'1234567890'].map((digit, index) => ({ code: `Digit${digit}`, label: digit, shifted: '!@#$%^&*()'[index] })),
    { code: 'Minus', label: '-', shifted: '_' }, { code: 'Equal', label: '=', shifted: '+' },
    { code: 'Backspace', label: '⌫', width: 'col-span-4' },
  ],
  [
    { code: 'Tab', label: 'Tab', width: 'col-span-3' }, ...letterKeys('QWERTYUIOP'),
    { code: 'BracketLeft', label: '[', shifted: '{' }, { code: 'BracketRight', label: ']', shifted: '}' },
    { code: 'Backslash', label: '\\', shifted: '|', width: 'col-span-3' },
  ],
  [
    { code: 'CapsLock', label: 'Caps', width: 'col-span-4' }, ...letterKeys('ASDFGHJKL'),
    { code: 'Semicolon', label: ';', shifted: ':' }, { code: 'Quote', label: "'", shifted: '"' },
    { code: 'Enter', label: '↵', width: 'col-span-4' },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', width: 'col-span-5' }, ...letterKeys('ZXCVBNM'),
    { code: 'Comma', label: ',', shifted: '<' }, { code: 'Period', label: '.', shifted: '>' },
    { code: 'Slash', label: '/', shifted: '?' }, { code: 'ShiftRight', label: 'Shift', width: 'col-span-5' },
  ],
  [
    { code: 'ControlLeft', label: 'Ctrl', width: 'col-span-3' }, { code: 'AltLeft', label: 'Alt', width: 'col-span-3' },
    { code: 'Space', label: '空格', width: 'col-[span_18_/_span_18]' },
    { code: 'AltRight', label: 'Alt', width: 'col-span-3' }, { code: 'ControlRight', label: 'Ctrl', width: 'col-span-3' },
  ],
];

/** 把需要输入的字符换成键位；组合符号保留顺序和重复次数。 */
export const getSymbolKeyStrokes = (input: string): readonly KeyStroke[] => [...input].map(character => {
  if (character === ' ') return { code: 'Space', shift: false };
  if (character === '\n') return { code: 'Enter', shift: false };
  if (character === '\t') return { code: 'Tab', shift: false };
  const key = KEYBOARD_ROWS.flat().find(item => item.code.startsWith('Key')
    ? item.label.toLowerCase() === character.toLowerCase()
    : item.label === character || item.shifted === character);
  if (!key) throw new Error(`未配置符号的键位：${character}`);
  return { code: key.code, shift: key.shifted === character || (key.code.startsWith('Key') && character === character.toUpperCase()) };
});

export interface ReferenceSymbol {
  readonly symbol: string;
  readonly name: string;
  readonly description: string;
  readonly example: string;
  readonly input: string;
  readonly tip?: string;
}

interface SymbolGroup {
  readonly title: string;
  readonly symbols: readonly ReferenceSymbol[];
}

export const SYMBOL_GROUPS: readonly SymbolGroup[] = [
  { title: '音符与音高', symbols: [
    { symbol: '1–7', name: '音符', description: '依次是哆来咪发嗦啦西。', example: '1 2 3 4 5 6 7', input: '1234567', tip: '按数字 1 到 7 中的任意一个，不需要 Shift。' },
    { symbol: '0', name: '休止符', description: '停顿，不发声。', example: '1 0 3 4', input: '0' },
    { symbol: "'", name: '高八度', description: '写在音符后；两个单引号再高一个八度。', example: "1' 1''", input: "'" },
    { symbol: ',', name: '低八度', description: '写在音符后；两个逗号再低一个八度。', example: '5, 5,,', input: ',' },
    { symbol: '#', name: '升半音', description: '写在音符前。', example: '#4', input: '#' },
    { symbol: 'b', name: '降半音', description: '小写英文字母 b，写在音符前。', example: 'b7', input: 'b' },
  ] },
  { title: '节奏与连线', symbols: [
    { symbol: '-', name: '延长线', description: '把前一个音延长 1 拍。', example: '1 - -', input: '-' },
    { symbol: '/', name: '减时线', description: '音符时长减半，4/4 拍中是半拍。', example: '1/ 2/', input: '/' },
    { symbol: '//', name: '两条减时线', description: '音符时长减为四分之一，4/4 拍中是四分之一拍。', example: '1//', input: '//' },
    { symbol: '.', name: '附点', description: '写在音符后，时长增加一半。', example: '1. 1/.', input: '.' },
    { symbol: '( )', name: '圆滑线', description: '把连贯演奏的音符括起来，括号要成对。', example: '(1 2 3) 4', input: '()', tip: '左括号：Shift + 9；右括号：Shift + 0。分别写在这组音符两端。' },
    { symbol: '空格', name: '分开音符', description: '有空格时减时线各自独立，无空格时相连。', example: '1/ 2/ 与 1/2/', input: ' ' },
    { symbol: 'Tab', name: '分隔音符组', description: '与空格一样，可以断开减时线分组。', example: '1/2/ → Tab → 3/4/', input: '\t' },
    { symbol: '回车', name: '换行', description: '在小节之间换行，预览会尽量跟随。', example: '在小节线后按 Enter', input: '\n' },
  ] },
  { title: '小节与反复', symbols: [
    { symbol: '|', name: '小节线', description: '分隔小节。', example: '1 2 3 4 |', input: '|' },
    { symbol: '||', name: '结束线', description: '表示结束，谱面显示为一条黑线。', example: '1 - - - ||', input: '||' },
    { symbol: '||:', name: '前反复', description: '从这里开始的段落总共演奏两遍，须配后反复。', example: '||: 1 2 3 4 :||', input: '||:' },
    { symbol: ':||', name: '后反复', description: '回到前反复再演奏一次；没有前反复时回曲首。', example: '1 2 3 4 :||', input: ':||' },
    { symbol: ':||:', name: '连接两段反复', description: '结束上一反复段，同时开始下一反复段。', example: ':||: 5 6 7 1 :||', input: ':||:' },
  ] },
  { title: '演奏与装饰', symbols: [
    { symbol: 'v', name: '换气', description: '小写 v，不占拍，也可写在小节线旁。', example: '1 2 v 3 4', input: 'v' },
    { symbol: 'V', name: '换气（另一写法）', description: '大写 V，与小写 v 含义相同。', example: '1 2 V 3 4', input: 'V' },
    { symbol: '!', name: '短顿音', description: '占拍不变，只发声原时长的四分之一。', example: '5!', input: '!' },
    { symbol: '^', name: '倚音', description: '写在倚音前，必须带 / 或 //，从主音借时。', example: '^3/ 5', input: '^' },
    { symbol: '~', name: '单波音', description: '写在主音前，占拍不变。', example: '~1', input: '~' },
    { symbol: '~~', name: '复波音', description: '连续写两个 ~，占拍不变。', example: '~~2', input: '~~' },
    { symbol: '~.', name: '下波音', description: '先写波浪号，再写句号。', example: '~.3', input: '~.' },
  ] },
  { title: '旋律与歌词', symbols: [
    { symbol: 'Q', name: '旋律行', description: '写在行首，后面留空格；单声部可省略。', example: 'Q 1 2 3 4 |', input: 'Q' },
    { symbol: 'P', name: '旋律行（兼容写法）', description: '与 Q 相同，推荐新谱使用 Q。', example: 'P 1 2 3 4 |', input: 'P' },
    { symbol: 'C', name: '歌词行', description: '写在行首，后面留空格，一字对一个音。', example: 'C 我 的 歌 声', input: 'C' },
    { symbol: '(多字)', name: '一音多字', description: '歌词中用括号包住同一个音要唱的字。', example: 'C (我们) 的 歌 声', input: '()', tip: '括号用 Shift + 9 和 Shift + 0；括号内切换中文输入歌词。' },
    { symbol: '_', name: '歌词占位', description: '跳过一个无歌词的发声音符，休止和延长不用占位。', example: 'C 星 _ 光', input: '_' },
    { symbol: 'Q[upper]', name: '上声部旋律', description: '上声部默认叫“旋律”。', example: 'Q[upper] 1 2 3 4 |', input: 'Q[upper]' },
    { symbol: 'Q[lower]', name: '下声部旋律', description: '下声部默认叫“伴奏”，与上声部同时播放。', example: 'Q[lower] 1 0 0 1 |', input: 'Q[lower]' },
    { symbol: 'C[upper]', name: '上声部歌词', description: '按上声部音符的顺序配词。', example: 'C[upper] 我 的 歌 声', input: 'C[upper]' },
    { symbol: 'C[lower]', name: '下声部歌词', description: '按下声部音符的顺序配词。', example: 'C[lower] 低 音 伴 奏', input: 'C[lower]' },
    { symbol: '[ ]', name: '声部标记括号', description: '括住 upper 或 lower；兼容 P[upper]、P[lower]。', example: 'Q[upper]', input: '[]', tip: '依次按 P 右侧的 [ 和 ] 键，不需要 Shift。' },
  ] },
  { title: '曲谱设置', symbols: [
    { symbol: '---', name: '设置区域', description: '在谱文开头单独写一行，设置结束后再写一行。', example: '---\n标题: 我的曲谱\n---', input: '---' },
    { symbol: ':', name: '字段与内容分隔', description: '用于标题、调号、拍号、速度等设置，也接受中文冒号。', example: '速度: 80', input: ':' },
    { symbol: '# 或 //', name: '注释', description: '仅在设置区域中，以 # 或 // 开头单独写一行。', example: '// 这里写备注', input: '#//', tip: '二选一：Shift + 3 输入 #；或连续按两次 /。只能写在 --- 设置区域内。' },
  ] },
];
