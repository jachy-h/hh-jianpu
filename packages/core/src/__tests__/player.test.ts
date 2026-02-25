import { describe, it, expect } from 'vitest';
import { scheduleNotes, noteToFrequency } from '../player/index';
import type { Score, Note } from '../types/index';

describe('Player', () => {
  const mockScore: Score = {
    metadata: {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    },
    measures: [
      {
        number: 1,
        notes: [
          { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 3, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'rest', duration: { base: 4, dots: 0 } },
        ],
      },
    ],
  };

  describe('scheduleNotes', () => {
    it('should create scheduled notes with correct timing', () => {
      const scheduled = scheduleNotes(mockScore);

      expect(scheduled).toHaveLength(4);
      expect(scheduled[0].startTime).toBe(0);
      expect(scheduled[0].duration).toBeCloseTo(0.5); // 120 BPM -> 0.5s per beat
    });

    it('should assign sequential indices', () => {
      const scheduled = scheduleNotes(mockScore);

      scheduled.forEach((note, idx) => {
        expect(note.index).toBe(idx);
      });
    });

    it('should set frequency to null for rests', () => {
      const scheduled = scheduleNotes(mockScore);

      expect(scheduled[3].frequency).toBeNull(); // rest
    });

    it('should calculate cumulative start times', () => {
      const scheduled = scheduleNotes(mockScore);

      expect(scheduled[0].startTime).toBe(0);
      expect(scheduled[1].startTime).toBeCloseTo(0.5);
      expect(scheduled[2].startTime).toBeCloseTo(1.0);
      expect(scheduled[3].startTime).toBeCloseTo(1.5);
    });

    it('should merge tie duration into previous note', () => {
      const scoreWithTie: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'tie', duration: { base: 4, dots: 0 } },
              { type: 'tie', duration: { base: 4, dots: 0 } },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithTie);

      // 1 - - 5 → 4 个事件（do + tie + tie + sol）
      // tie 产生静默事件（frequency=null）用于 UI 高亮，但音频时长合并到前一个音符
      expect(scheduled).toHaveLength(4);

      // 第一个音符 (do)：时值 = 1 拍 + 1 拍 (tie) + 1 拍 (tie) = 3 拍 = 1.5 秒
      expect(scheduled[0].frequency).not.toBeNull();
      expect(scheduled[0].duration).toBeCloseTo(1.5);
      expect(scheduled[0].startTime).toBe(0);

      // tie 事件：静默（frequency=null），用于 UI 高亮
      expect(scheduled[1].frequency).toBeNull();
      expect(scheduled[1].startTime).toBeCloseTo(0.5);
      expect(scheduled[2].frequency).toBeNull();
      expect(scheduled[2].startTime).toBeCloseTo(1.0);

      // 第二个音符 (sol)：startTime = 1.5 秒
      expect(scheduled[3].frequency).not.toBeNull();
      expect(scheduled[3].startTime).toBeCloseTo(1.5);
      expect(scheduled[3].duration).toBeCloseTo(0.5);
    });

    it('should not merge tie at the beginning (no previous note)', () => {
      const scoreStartsWithTie: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'tie', duration: { base: 4, dots: 0 } },
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreStartsWithTie);

      // tie 在开头没有前一个音符可合并，产生静默事件
      // 时间轴仍然前进
      expect(scheduled).toHaveLength(2); // tie(静默) + note
      expect(scheduled[0].frequency).toBeNull(); // tie 无音频
      expect(scheduled[0].startTime).toBe(0);
      expect(scheduled[1].startTime).toBeCloseTo(0.5); // tie 占了 0.5s
      expect(scheduled[1].frequency).not.toBeNull();
    });

    it('should not merge tie after a rest', () => {
      const scoreRestThenTie: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'rest', duration: { base: 4, dots: 0 } },
              { type: 'tie', duration: { base: 4, dots: 0 } },
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreRestThenTie);

      // rest (frequency=null) 后面的 tie 不应合并音频时长
      expect(scheduled).toHaveLength(3); // rest + tie(静默) + note
      expect(scheduled[0].frequency).toBeNull(); // rest
      expect(scheduled[0].duration).toBeCloseTo(0.5); // rest 不被延长
      expect(scheduled[1].frequency).toBeNull(); // tie（静默事件）
      expect(scheduled[1].startTime).toBeCloseTo(0.5);
      expect(scheduled[2].startTime).toBeCloseTo(1.0); // rest + tie 各占 0.5s
    });

    it('should handle grace notes correctly', () => {
      const scoreWithGrace: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, isGrace: true, graceType: 'long', duration: { base: 8, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithGrace);

      // 倚音在主音符之前播放
      expect(scheduled.length).toBeGreaterThanOrEqual(2);
      // 倚音的开始时间应该早于主音符
      const graceNote = scheduled.find(s => s.note.type === 'note' && (s.note as Note).isGrace);
      const mainNote = scheduled.find(s => s.note.type === 'note' && !(s.note as Note).isGrace);
      
      if (graceNote && mainNote) {
        expect(graceNote.startTime).toBeLessThan(mainNote.startTime);
      }
    });

    it('should handle long grace notes (60ms)', () => {
      const scoreWithLongGrace: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, isGrace: true, graceType: 'long', duration: { base: 8, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithLongGrace);
      const graceNote = scheduled.find(s => s.note.type === 'note' && (s.note as Note).isGrace);
      
      expect(graceNote).toBeDefined();
      if (graceNote) {
        expect(graceNote.duration).toBeCloseTo(0.06); // 长倚音 60ms
      }
    });

    it('should handle short grace notes (30ms)', () => {
      const scoreWithShortGrace: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, isGrace: true, graceType: 'short', duration: { base: 16, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithShortGrace);
      const graceNote = scheduled.find(s => s.note.type === 'note' && (s.note as Note).isGrace);
      
      expect(graceNote).toBeDefined();
      if (graceNote) {
        expect(graceNote.duration).toBeCloseTo(0.03); // 短倚音 30ms
      }
    });

    it('should handle single trill (~)', () => {
      const scoreWithTrill: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 5, octave: 0, trillType: 'single', duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithTrill);

      // 单波音产生 3 个事件：主音 -> 上邻音 -> 主音
      expect(scheduled.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle double trill (~~)', () => {
      const scoreWithDoubleTrill: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 5, octave: 0, trillType: 'double', duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithDoubleTrill);

      // 复波音产生 5 个事件：主音 -> 上邻音 -> 主音 -> 上邻音 -> 主音
      expect(scheduled.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle lower trill (~.)', () => {
      const scoreWithLowerTrill: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 5, octave: 0, trillType: 'lower', duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithLowerTrill);

      // 下波音产生 3 个事件：主音 -> 下邻音 -> 主音
      expect(scheduled.length).toBeGreaterThanOrEqual(3);
      // 下邻音频率应该低于主音
      const mainFreq = scheduled[0].frequency;
      const neighborFreq = scheduled[1].frequency;
      if (mainFreq && neighborFreq) {
        expect(neighborFreq).toBeLessThan(mainFreq);
      }
    });

    it('should handle breath marks (no time)', () => {
      const scoreWithBreath: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'breath' },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithBreath);

      // 换气记号不占用时间，但会产生事件
      expect(scheduled.length).toBe(3);
      // 两个音符的时间应该连续（换气不占时间）
      expect(scheduled[0].startTime).toBe(0);
      expect(scheduled[2].startTime).toBeCloseTo(0.5); // 第二个音符在 0.5 秒后
    });

    it('should handle dotted notes', () => {
      const scoreWithDotted: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 1 }, dot: true },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWithDotted);

      // 附点四分音符 = 1.5 拍 = 0.75 秒
      expect(scheduled[0].duration).toBeCloseTo(0.75);
      // 第二个音符在 0.75 秒后开始
      expect(scheduled[1].startTime).toBeCloseTo(0.75);
    });

    it('should handle different tempos', () => {
      const scoreFast: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 240, // 快速
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreFast);

      // 240 BPM = 0.25 秒每拍
      expect(scheduled[0].duration).toBeCloseTo(0.25);
      expect(scheduled[1].startTime).toBeCloseTo(0.25);
    });

    it('should handle multiple measures', () => {
      const scoreMultiMeasure: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
          {
            number: 2,
            notes: [
              { type: 'note', pitch: 3, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 4, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreMultiMeasure);

      expect(scheduled).toHaveLength(4);
      // 时间应该连续跨越小节
      expect(scheduled[0].startTime).toBe(0);
      expect(scheduled[1].startTime).toBeCloseTo(0.5);
      expect(scheduled[2].startTime).toBeCloseTo(1.0);
      expect(scheduled[3].startTime).toBeCloseTo(1.5);
    });
  });

  describe('noteToFrequency', () => {
    it('should calculate correct frequency for middle C (do in C major)', () => {
      const note: Note = {
        type: 'note',
        pitch: 1, // do
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0); // C key offset = 0
      expect(freq).toBeCloseTo(261.63, 1); // C4 = 261.63 Hz
    });

    it('should calculate correct frequency for high octave', () => {
      const note: Note = {
        type: 'note',
        pitch: 1,
        octave: 1,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(523.25, 1); // C5 = 523.25 Hz
    });

    it('should calculate correct frequency for low octave', () => {
      const note: Note = {
        type: 'note',
        pitch: 1,
        octave: -1,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(130.81, 1); // C3 = 130.81 Hz
    });

    it('should handle key transposition', () => {
      const note: Note = {
        type: 'note',
        pitch: 1, // do
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 2); // D major (2 semitones up)
      expect(freq).toBeCloseTo(293.66, 1); // D4 = 293.66 Hz
    });

    it('should handle sharp accidental', () => {
      const note: Note = {
        type: 'note',
        pitch: 1, // do
        octave: 0,
        accidental: 'sharp',
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(277.18, 1); // C#4 = 277.18 Hz
    });

    it('should handle flat accidental', () => {
      const note: Note = {
        type: 'note',
        pitch: 7, // si
        octave: 0,
        accidental: 'flat',
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(466.16, 1); // Bb4 = 466.16 Hz
    });

    it('should handle different key signatures', () => {
      // G 大调（1 个升号）
      const noteInG: Note = {
        type: 'note',
        pitch: 1,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(noteInG, 7); // G major offset = 7
      expect(freq).toBeCloseTo(392.00, 1); // G4 = 392.00 Hz
    });

    it('should handle two octaves up', () => {
      const note: Note = {
        type: 'note',
        pitch: 1,
        octave: 2,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(1046.50, 1); // C6 = 1046.50 Hz
    });

    it('should handle two octaves down', () => {
      const note: Note = {
        type: 'note',
        pitch: 1,
        octave: -2,
        duration: { base: 4, dots: 0 },
        dot: false,
      };

      const freq = noteToFrequency(note, 0);
      expect(freq).toBeCloseTo(65.41, 1); // C2 = 65.41 Hz
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty measures', () => {
      const scoreEmpty: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [],
      };

      const scheduled = scheduleNotes(scoreEmpty);
      expect(scheduled).toHaveLength(0);
    });

    it('should handle measure with only rest', () => {
      const scoreRestOnly: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'rest', duration: { base: 1, dots: 0 } },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreRestOnly);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].frequency).toBeNull();
      expect(scheduled[0].duration).toBeCloseTo(2.0); // 全音符 = 4 拍 = 2 秒
    });

    it('should handle sixteenth notes', () => {
      const scoreSixteenth: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 16, dots: 0 }, dot: false },
              { type: 'note', pitch: 2, octave: 0, duration: { base: 16, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreSixteenth);

      // 十六分音符 = 0.25 拍 = 0.125 秒
      expect(scheduled[0].duration).toBeCloseTo(0.125);
      expect(scheduled[1].startTime).toBeCloseTo(0.125);
    });

    it('should handle half notes', () => {
      const scoreHalf: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 2, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 2, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreHalf);

      // 二分音符 = 2 拍 = 1 秒
      expect(scheduled[0].duration).toBeCloseTo(1.0);
      expect(scheduled[1].startTime).toBeCloseTo(1.0);
    });

    it('should handle whole note', () => {
      const scoreWhole: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 1, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreWhole);

      // 全音符 = 4 拍 = 2 秒
      expect(scheduled[0].duration).toBeCloseTo(2.0);
    });

    it('should handle double dotted notes', () => {
      const scoreDoubleDotted: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 2 }, dot: true },
            ],
          },
        ],
      };

      const scheduled = scheduleNotes(scoreDoubleDotted);

      // 双附点四分音符 = 1 + 0.5 + 0.25 = 1.75 拍 = 0.875 秒
      expect(scheduled[0].duration).toBeCloseTo(0.875);
    });
  });
});
