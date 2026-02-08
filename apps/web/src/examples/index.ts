/** 示例曲谱 */
export const EXAMPLES = {
  twinkle: {
    name: '小星星',
    source: `标题: 小星星
调号: C
拍号: 4/4
速度: 120

1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |
5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 - |
1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |`,
  },

  happyBirthday: {
    name: '生日快乐',
    source: `标题: 生日快乐
调号: C
拍号: 3/4
速度: 100

5_ 5_ 6 5 | '1 7 - | 5_ 5_ 6 5 | '2 '1 - |
5_ 5_ '5 '3 | '1 7 6 | '4_ '4_ '3 '1 | '2 '1 - |`,
  },

  odeToJoy: {
    name: '欢乐颂',
    source: `标题: 欢乐颂
调号: C
拍号: 4/4
速度: 108

3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 - |
3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1 - |`,
  },

  slurDemo: {
    name: '圆滑线示例',
    source: `标题: 圆滑线示例
调号: C
拍号: 4/4
速度: 120

(1 2 3) 4 | (5 6 | 7 '1) '2 | ('3_ '3_ '2 '1) 7 | '1 - - - |`,
  },

  octaveDemo: {
    name: '八度示例',
    source: `标题: 八度示例
调号: C
拍号: 4/4
速度: 100

..1 ..2 ..3 ..4 | .5 .6 .7 .1 | 1 2 3 4 | 5 6 7 '1 | '2 '3 '4 '5 | ''1 ''2 ''3 ''4 |`,
  },
} as const;

export type ExampleKey = keyof typeof EXAMPLES;
export const EXAMPLE_KEYS = Object.keys(EXAMPLES) as ExampleKey[];
