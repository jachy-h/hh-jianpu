import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { tokenize } from '../parser/tokenizer.js';
import { scoreToSource, transposeScore } from '../parser/transpose.js';

const semantic = (source: string) => {
  const result = parse(source);
  expect(result.errors).toEqual([]);
  return result.score!.measures.map(measure => ({
    start: Boolean(measure.repeatStart), end: Boolean(measure.repeatEnd), notes: measure.notes,
  }));
};

describe('repeat notation parsing', () => {
  it('recognizes complete repeat tokens before ordinary single and double barlines', () => {
    const tokens = tokenize('  ||:1 2 3 4:|| ||');
    expect(tokens[0]).toMatchObject({ type: 'REPEAT_START', value: '||:', offset: 2, column: 3 });
    expect(tokens.find(token => token.type === 'REPEAT_END')).toMatchObject({ offset: 12, column: 13 });
    expect(tokens.filter(token => token.type === 'BARLINE')).toHaveLength(1);
  });

  it('owns repeat boundaries without adding empty measures or changing measure numbers', () => {
    const source = '||: 1 2 3 4 | 5 6 7 1 :|| ||: 2 - - - :|| 3 - - - ||';
    const result = parse(source);
    expect(result.errors).toEqual([]);
    expect(result.score!.measures.map(measure => [measure.number, Boolean(measure.repeatStart), Boolean(measure.repeatEnd)]))
      .toEqual([[1, true, false], [2, false, true], [3, true, true], [4, false, false]]);
    const first = result.score!.measures[0];
    expect(source.slice(first.repeatStartRange!.from, first.repeatStartRange!.to)).toBe('||:');
    const second = result.score!.measures[1];
    expect(source.slice(second.repeatEndRange!.from, second.repeatEndRange!.to)).toBe(':||');
  });

  it('accepts an implicit start at the beginning and a closing marker after an ordinary barline', () => {
    expect(parse('1 2 3 4 | 5 6 7 1 :||').errors).toEqual([]);
    expect(parse('||: 1 2 3 4 | :||').errors).toEqual([]);
    expect(parse('1 2 3 4 ||').score!.measures[0].repeatEnd).toBeUndefined();
  });

  it.each([' ', '\n'])('starts a new measure at a repeat start after notes separated by %j', separator => {
    const source = `1 2 3 4${separator}||: 5 6 7 1 :||`;
    const result = parse(source);
    expect(result.errors).toEqual([]);
    expect(result.score!.measures).toMatchObject([
      { number: 1, notes: [{ pitch: 1 }, { pitch: 2 }, { pitch: 3 }, { pitch: 4 }],
        sourceLine: 1, sourceRange: { from: 0, to: source.indexOf('||:') } },
      { number: 2, repeatStart: true, repeatEnd: true,
        notes: [{ pitch: 5 }, { pitch: 6 }, { pitch: 7 }, { pitch: 1 }],
        sourceLine: separator === '\n' ? 2 : 1, lineBreakBefore: separator === '\n',
        sourceRange: { from: source.indexOf('||:'), to: source.indexOf(':||') } },
    ]);
    expect(result.score!.measures[0].repeatStart).toBeUndefined();
    expect(semantic(scoreToSource(result.score!))).toEqual(semantic(source));
  });

  it.each([
    ['||: 1 2 3 4 |', '缺少对应'],
    ['||: 1 2 3 4 | ||: 5 6 7 1 :||', '嵌套'],
    ['||: :||', '非空'],
    [':||', '非空'],
    ['1 2 3 4 :|| :||', '非空'],
  ])('reports invalid repeat syntax with source coordinates: %s', (source, message) => {
    const error = parse(source).errors.find(item => item.message.includes(message));
    expect(error).toBeDefined();
    expect(error!.position.line).toBe(1);
    expect(error!.position.offset).toBeGreaterThanOrEqual(0);
    expect(error!.length).toBe(3);
  });

  it('preserves repeats, grouping, lyrics and notation through serialization and transposition', () => {
    const source = '||: (1/2/ 3 4 5 | 6 7 1 2) :||\nC 春 风 吹 来 春 风 又 吹 来 春 风';
    const score = parse(source).score!;
    expect(semantic(scoreToSource(score))).toEqual(semantic(source));
    const transposed = transposeScore(score, 2);
    expect(semantic(scoreToSource(transposed)).map(measure => [measure.start, measure.end]))
      .toEqual([[true, false], [false, true]]);
    expect(JSON.parse(JSON.stringify(score)).measures[0].repeatStart).toBe(true);
  });

  it('requires matching boundaries in both voices with a source-located diagnostic', () => {
    const valid = 'Q[upper] ||: 1 2 3 4 :||\nQ[lower] ||: 5 6 7 1 :||';
    expect(parse(valid).errors).toEqual([]);
    const score = parse(valid).score!;
    expect(parse(scoreToSource(transposeScore(score, 2))).errors).toEqual([]);
    const result = parse('Q[upper] ||: 1 2 3 4 :||\nQ[lower] 5 6 7 1 |');
    expect(result.errors.find(error => error.message.includes('反复记号必须一致'))?.position.line).toBe(2);
  });
});
