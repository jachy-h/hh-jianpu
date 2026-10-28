import { describe, expect, it } from 'vitest';
import { tokenize } from '../parser/tokenizer.js';
import { parse } from '../parser/parser.js';
import { scoreToSource, transposeScore } from '../parser/transpose.js';
import { createPlaybackOrder } from '../player/scheduler.js';

const melody = '||: 1 2 3 4 :||: 5 6 7 1 :|| 2 3 4 5 ||';

describe('结束线与组合反复记号', () => {
  it('按最长匹配消费完整符号并保留源码范围', () => {
    expect(tokenize(':||: ||').filter(token => token.type !== 'EOF' && token.type !== 'NEWLINE')).toMatchObject([
      { type: 'REPEAT_BOTH', value: ':||:', offset: 0, column: 1 },
      { type: 'BARLINE', value: '||', offset: 5, column: 6 },
    ]);
  });

  for (const duet of [false, true]) {
    it(`保留${duet ? '双' : '单'}声部结束线和相邻反复段，移调后语义一致`, () => {
      const source = duet ? `Q[upper] ${melody}\nQ[lower] ${melody}` : melody;
      const result = parse(source);
      expect(result.errors).toEqual([]);
      const score = result.score!;
      expect(score.measures.map(measure => [Boolean(measure.repeatStart), Boolean(measure.repeatEnd), Boolean(measure.combinedRepeat), Boolean(measure.finalBarline)]))
        .toEqual([[true, true, true, false], [true, true, false, false], [false, false, false, true]]);
      const range = score.measures[0].repeatEndRange!;
      expect(source.slice(range.from, range.to)).toBe(':||:');
      expect(score.measures[1].repeatStartRange).toEqual(range);
      expect(createPlaybackOrder(score.measures)).toEqual([0, 0, 1, 1, 2]);
      const serialized = scoreToSource(transposeScore(score, 2));
      expect(serialized).toContain(':||:');
      const restored = parse(serialized);
      expect(restored.errors).toEqual([]);
      for (const measures of [restored.score!.measures, ...(duet ? [restored.score!.secondaryVoice!.measures] : [])]) {
        expect(measures[0].combinedRepeat).toBe(true);
        expect(measures[1].repeatStart).toBe(true);
        expect(measures[2].finalBarline).toBe(true);
      }
    });
  }

  it('组合反复之后缺少结束反复时给出诊断', () => {
    expect(parse('1 2 3 4 :||: 5 6 7 1 ||').errors.some(error => error.message.includes('缺少对应'))).toBe(true);
  });
});
