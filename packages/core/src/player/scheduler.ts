// ============================================================
// Scheduler — 将 Score 转化为时间事件序列
// ============================================================

import type { Score, NoteElement, Note } from '../types/index.js';

/** 音符调度事件 */
export interface ScheduledNote {
  /** 在扁平化序列中的索引 */
  index: number;
  /** 开始时间（秒） */
  startTime: number;
  /** 持续时间（秒） */
  duration: number;
  /** 音高频率（Hz），休止符/延音线为 null */
  frequency: number | null;
  /** 原始音符数据 */
  note: NoteElement;
}

/** 音符名到频率的基准映射（C4 八度，中央 C） */
const PITCH_TO_SEMITONE: Record<number, number> = {
  1: 0,   // C (do)
  2: 2,   // D (re)
  3: 4,   // E (mi)
  4: 5,   // F (fa)
  5: 7,   // G (sol)
  6: 9,   // A (la)
  7: 11,  // B (si)
};

/** 调号到半音偏移 */
const KEY_OFFSET: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

/**
 * 将音符音级 + 八度 + 调号转换为频率（Hz）
 * 基于 A4 = 440Hz
 */
export function noteToFrequency(note: Note, keyOffset: number): number {
  const semitone = PITCH_TO_SEMITONE[note.pitch] ?? 0;
  const octaveOffset = note.octave * 12;
  const accidentalOffset = note.accidental === 'sharp' ? 1 : note.accidental === 'flat' ? -1 : 0;

  // C4 = MIDI 60, A4 = MIDI 69
  const midi = 60 + keyOffset + semitone + octaveOffset + accidentalOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 计算音符的持续时间（以拍为单位）
 */
function durationInBeats(note: NoteElement): number {
  const baseDuration = note.duration.base;
  // base: 1=全音符(4拍), 2=二分(2拍), 4=四分(1拍), 8=八分(0.5拍), 16=十六分(0.25拍)
  let beats = 4 / baseDuration;

  // 附点：增加一半时值
  if (note.duration.dots > 0) {
    let dotValue = beats / 2;
    for (let d = 0; d < note.duration.dots; d++) {
      beats += dotValue;
      dotValue /= 2;
    }
  }

  return beats;
}

/**
 * 将 Score 转换为按时间排序的调度事件序列
 */
export function scheduleNotes(score: Score): ScheduledNote[] {
  const scheduled: ScheduledNote[] = [];
  const keyOffset = KEY_OFFSET[score.metadata.key] ?? 0;
  const bpm = score.metadata.tempo;
  const secondsPerBeat = 60 / bpm;

  let currentTime = 0;
  let globalIndex = 0;

  for (const measure of score.measures) {
    for (const note of measure.notes) {
      const beats = durationInBeats(note);
      const durationSec = beats * secondsPerBeat;

      // 延长线：将时值合并到前一个有效音符，不产生新事件
      if (note.type === 'tie') {
        const lastScheduled = scheduled.length > 0 ? scheduled[scheduled.length - 1] : null;
        if (lastScheduled && lastScheduled.frequency !== null) {
          lastScheduled.duration += durationSec;
        }
        currentTime += durationSec;
        globalIndex++;
        continue;
      }

      let frequency: number | null = null;
      if (note.type === 'note') {
        frequency = noteToFrequency(note, keyOffset);
      }

      scheduled.push({
        index: globalIndex,
        startTime: currentTime,
        duration: durationSec,
        frequency,
        note,
      });

      currentTime += durationSec;
      globalIndex++;
    }
  }

  return scheduled;
}
