import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { tokenize } from '../parser/tokenizer.js';
import { scoreToSource, transposeScore } from '../parser/transpose.js';
import { createLayout } from '../renderer/layout.js';
import { scheduleNotes, selectMeasureSegment } from '../player/scheduler.js';
import { getScoreVoices } from '../music.js';
import { calculateNoteBoundingBox } from '../renderer/bounding-box.js';

const source = `---
标题：双声部
调号：C
拍号：4/4
速度：120
声部：upper=主旋律, lower=低音
---
Q[upper] 3/5/ 7/1'/ 1' - | 2/4/ 6/1'/ 2' - |
C[upper] 春 风 吹 过 来 春 风 又 吹 来
Q[lower] 1 0 0 1 | 6, 0 0 2 |
C[lower] 低 音 伴 奏
Q[upper] 3 5 7 - |
Q[lower] 1 0 0 1 |`;

function makeScore(text = source) {
  const result = parse(text);
  expect(result.errors).toEqual([]);
  expect(result.score).not.toBeNull();
  return result.score!;
}

const semantic = (text: string) => getScoreVoices(makeScore(text)).map(voice => ({
  id: voice.id, name: voice.name,
  measures: voice.measures.map(measure => ({ notes: measure.notes, lyrics: measure.lyrics, lineBreakBefore: measure.lineBreakBefore })),
}));

describe('显式上下双声部', () => {
  it('keeps voice ownership, lyrics, names and original source offsets', () => {
    const score = makeScore();
    expect(getScoreVoices(score).map(voice => voice.name)).toEqual(['主旋律', '低音']);
    expect(score.measures).toHaveLength(3);
    expect(score.secondaryVoice!.measures).toHaveLength(3);
    const lower = score.secondaryVoice!.measures[2];
    expect(lower.sourceLine).toBe(13);
    expect(source.slice(lower.sourceRange!.from, lower.sourceRange!.to)).toContain('1 0 0 1');
    expect(source.slice(lower.sourceRange!.from, lower.sourceRange!.to)).not.toContain('Q[upper]');
    expect(score.measures[0].lyrics!.syllables[0].text).toBe('春');
    expect(score.secondaryVoice!.measures[0].lyrics!.syllables[0].text).toBe('低');
    expect(tokenize('  Q[lower] 1 2 3 4 |')[0]).toMatchObject({ type: 'MELODY_MARKER', value: 'lower', column: 3, offset: 2 });
  });

  it('leaves old Q and P lines sequential and requires explicit voice ownership in duets', () => {
    const old = makeScore('Q 1 2 3 4 |\nP 5 6 7 1 |');
    expect(old.secondaryVoice).toBeUndefined();
    expect(scheduleNotes(old)[4].startBeat).toBe(4);
    for (const text of ['Q[upper] 1 2 3 4 |\nQ 1 2 3 4 |', 'Q[tenor] 1 2 3 4 |', 'Q[] 1 2 3 4 |']) {
      expect(parse(text).errors.some(error => error.message.includes('声部'))).toBe(true);
    }
  });

  it('reports missing or short lower measures with the voice and source line', () => {
    const short = parse('Q[upper] 1 2 3 4 |\nQ[lower] 1 2 3 |');
    expect(short.errors).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('[lower] 小节 1 时值不符'), position: expect.objectContaining({ line: 2 }) })]));
    expect(parse('Q[upper] 1 2 3 4 | 1 2 3 4 |\nQ[lower] 1 2 3 4 |').errors.some(error => error.message.includes('[lower] 缺少第 2 小节'))).toBe(true);
    expect(parse('Q[upper] 1 2 3 4 |\nQ[lower] [1 3 5] 0 |').errors.length).toBeGreaterThan(0);
  });

  it('schedules both voices on one 6-second timeline with distinct note indices', () => {
    const events = scheduleNotes(makeScore());
    const voices = getScoreVoices(makeScore());
    expect(events.filter(event => event.startBeat === 0).map(event => event.voiceId)).toEqual(['upper', 'lower']);
    expect(Math.max(...events.map(event => event.startTime + event.duration))).toBe(6);
    expect(new Set(events.map(event => event.index)).size).toBe(events.length);
    const lower = events.find(event => event.voiceId === 'lower')!;
    expect(lower.index).toBe(voices[1].indexOffset);
    const segment = selectMeasureSegment(events, { startMeasure: 2, endMeasure: 2 })!;
    expect(segment.durationBeats).toBe(4);
    expect(segment.events.filter(event => event.startBeat === 0)).toHaveLength(2);
  });

  it('isolates same-pitch slur continuations across voices when entering a loop', () => {
    const score = makeScore('Q[upper] (1 - - - | 1 - - -) |\nQ[lower] (1 - - - | 1 - - -) |');
    const selected = selectMeasureSegment(scheduleNotes(score), { startMeasure: 2, endMeasure: 2 })!;
    expect(selected.events.filter(event => event.frequency !== null).map(event => event.voiceId)).toEqual(['upper', 'lower']);
    expect(Math.max(...selected.events.map(event => event.startBeat + event.durationBeats))).toBe(4);
  });

  it.each([18, 24, 30])('aligns shared beat positions and keeps complete systems at font size %i', font => {
    const score = makeScore();
    const layout = createLayout(score, { width: 420, noteFontSize: font, measuresPerLine: 2 });
    expect(layout.allNotes.map(note => note.index)).toEqual(layout.allNotes.map((_, index) => index));
    for (const line of layout.lines) {
      expect(line.measures.length).toBe(line.secondaryMeasures!.length);
      for (const [index, measure] of line.measures.entries()) {
        const lower = line.secondaryMeasures![index];
        expect([lower.x, lower.width]).toEqual([measure.x, measure.width]);
        for (const note of measure.notes) {
          const matching = lower.notes.find(other => other.startBeat === note.startBeat);
          if (matching) expect(matching.x).toBe(note.x);
        }
      }
      const upperBottom = Math.max(...line.measures.flatMap(measure => measure.notes.map(note => calculateNoteBoundingBox(note.note, font, note.x, note.y).vertical.bottom)));
      const lowerTop = Math.min(...line.secondaryMeasures!.flatMap(measure => measure.notes.map(note => calculateNoteBoundingBox(note.note, font, note.x, note.y).vertical.top)));
      expect(lowerTop).toBeGreaterThan(upperBottom);
    }
  });

  it('preserves each voice through source round trips, transposition and backup JSON', () => {
    const score = makeScore();
    expect(semantic(scoreToSource(score))).toEqual(semantic(source));
    const shifted = transposeScore(score, -2);
    const oldEvents = scheduleNotes(score);
    const events = scheduleNotes(makeScore(scoreToSource(shifted)));
    expect(events.map(event => event.voiceId)).toEqual(oldEvents.map(event => event.voiceId));
    for (const [index, event] of events.entries()) if (event.frequency && oldEvents[index].frequency) {
      expect(event.frequency / oldEvents[index].frequency!).toBeCloseTo(2 ** (-2 / 12));
    }
    expect(semantic(JSON.parse(JSON.stringify({ source: scoreToSource(shifted) })).source)).toEqual(semantic(scoreToSource(shifted)));
  });

  it('does not reuse the preceding beamed note octave suffix as a prefix', () => {
    const score = makeScore('Q 3,/5,/ 6 7 1 |');
    expect(score.measures[0].notes.filter(note => note.type === 'note').map(note => note.octave)).toEqual([-1, -1, 0, 0, 0]);
  });

  it('preserves voice-local beams, slurs and grace notes through serialization', () => {
    const text = 'Q[upper] (^4// 1/2/ 3 4 5 | 6 - - -) |\nQ[lower] (1/2/ 3 4 5 | 6 - - -) |';
    expect(semantic(scoreToSource(makeScore(text)))).toEqual(semantic(text));
    const layout = createLayout(makeScore(text));
    const upper = layout.allNotes.find(note => note.voiceId === 'upper' && note.note.type === 'note' && !note.note.isGrace)!;
    const lower = layout.allNotes.find(note => note.voiceId === 'lower')!;
    expect(upper.x).toBe(lower.x);
  });
});
