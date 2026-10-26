import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { scoreToSource, transposeScore } from '../parser/transpose.js';
import { scheduleNotes } from '../player/scheduler.js';

describe('v0.7.0 notation baseline', () => {
  it('parses a melody without metadata using documented defaults', () => {
    const result = parse('1 2 3 4 |');
    expect(result.errors).toHaveLength(0);
    expect(result.score?.metadata).toMatchObject({
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    });
  });

  it('accepts the documented prefix octave marker', () => {
    const result = parse("'1 2 3 4 |");
    expect(result.score?.measures[0].notes[0]).toMatchObject({ type: 'note', pitch: 1, octave: 1 });
  });

  it('accepts the documented dot prefix for low octaves', () => {
    const result = parse('.1 2 3 4 |');
    expect(result.score?.measures[0].notes[0]).toMatchObject({ type: 'note', pitch: 1, octave: -1 });
  });

  it('accepts P as a melody marker alias', () => {
    const result = parse('P 1 2 3 4 |');
    expect(result.errors).toHaveLength(0);
    expect(result.score?.measures[0].notes).toHaveLength(4);
  });

  it('preserves dotted rest duration and diagnoses unsupported repeated dots', () => {
    const dotted = parse('---\n拍号: 4/4\n---\n0. 1 2 3 |');
    expect(dotted.score?.measures[0].notes[0]).toMatchObject({
      type: 'rest', duration: { base: 4, dots: 1 },
    });

    const repeated = parse('---\n拍号: 4/4\n---\n1.. 2 3 |');
    expect(repeated.errors.some((error) => error.message.includes('双附点'))).toBe(true);
  });

  it('diagnoses durations that exceed the supported sixteenth note', () => {
    const result = parse('---\n拍号: 4/4\n---\n1/// 2 3 4 |');
    expect(result.errors.some((error) => error.message.includes('三条及以上减时线'))).toBe(true);
  });

  it('transposes the key once and preserves custom metadata and lyrics on serialization', () => {
    const parsed = parse('---\n标题: Test\n调号: C\n拍号: 4/4\n速度: 120\n作曲: Person\n---\nQ 1 2 3 4 |\nC A B C D');
    expect(parsed.score).not.toBeNull();
    const score = parsed.score!;
    const transposed = transposeScore(score, 2);
    expect(transposed.metadata.key).toBe('D');
    expect(scheduleNotes(transposed)[0].frequency).toBeCloseTo(293.66, 1);

    const roundTrip = parse(scoreToSource(transposed));
    expect(roundTrip.score?.metadata.custom?.['作曲']).toBe('Person');
    expect(roundTrip.score?.measures.flatMap((measure) => measure.lyrics?.syllables ?? []).map((syllable) => syllable.text))
      .toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('v0.7.0 semantic round trips', () => {
  it.each([-25, -13, -12, -1, 1, 12, 25])('changes sounding pitch by exactly %i semitones', (semitones) => {
    const score = parse("---\n调号: B\n---\n#1 2, b3 4' |").score!;
    const before = scheduleNotes(score);
    const after = scheduleNotes(transposeScore(score, semitones));
    after.forEach((event, index) => expect(event.frequency! / before[index].frequency!).toBeCloseTo(2 ** (semitones / 12), 8));
    const restored = scheduleNotes(transposeScore(transposeScore(score, semitones), -semitones));
    restored.forEach((event, index) => expect(event.frequency).toBeCloseTo(before[index].frequency!, 8));
  });

  it('preserves ornaments, rests, lyrics, beam groups, slurs across bars and source line breaks', () => {
    const source = "---\n标题: 语义往返\n作曲: Test\n---\nQ (^#4// 1/2/ 0/ 3/ 4 5 | ~6 ~~7 ~.1' 2) |\nQ 1 2 3 4 |\nC 一 (两个字) _ 三 四 五 六 七 八 九 十 十 一";
    const score = parse(source).score!;
    const result = parse(scoreToSource(score));
    expect(result.errors).toHaveLength(0);
    const semantics = (value: typeof score) => ({
      metadata: value.metadata,
      measures: value.measures.map((measure) => ({
        lineBreakBefore: measure.lineBreakBefore,
        lyrics: measure.lyrics,
        notes: measure.notes.map((note) => {
          if (note.type === 'note') {
            const { hasSpaceBefore: _space, ...rest } = note;
            return rest;
          }
          if (note.type === 'rest') {
            const { hasSpaceBefore: _space, ...rest } = note;
            return rest;
          }
          return note;
        }),
      })),
    });
    expect(semantics(result.score!)).toEqual(semantics(score));
  });

  it('does not move a spaced prefix octave onto the preceding note', () => {
    const score = parse("1 '2 .3 4 |").score!;
    expect(score.measures[0].notes.filter((note) => note.type === 'note').map((note) => note.octave)).toEqual([0, 1, -1, 0]);
  });

  it.each(['##1 2 3 4 |', '~~~1 2 3 4 |', 'b 1 2 3 4 |', '1_ 2 3 4 |'])('diagnoses unsupported or unattached modifiers in %s', (source) => {
    expect(parse(source).errors.length).toBeGreaterThan(0);
  });

  it('reports unmatched brackets and unattached modifiers at their actual positions', () => {
    const source = 'Q (1 2 3 4 |\nQ / 1 2 3 4 |';
    const result = parse(source);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ position: { line: 1, column: 3, offset: 2 } }),
      expect.objectContaining({ position: { line: 2, column: 3, offset: source.indexOf('/') } }),
    ]));
  });
});
