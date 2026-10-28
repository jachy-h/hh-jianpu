// ============================================================
// Scheduler — 将 Score 转化为时间事件序列
// ============================================================

import { getScoreVoices } from '../music.js';
import type { Score, Measure, NoteElement, Note, VoiceId } from '../types/index.js';

/** 音符调度事件 */
export interface ScheduledNote {
  /** 显式双声部的事件归属。 */
  voiceId?: VoiceId;
  /** 在扁平化序列中的索引 */
  index: number;
  /** 开始时间（秒） */
  startTime: number;
  /** 持续时间（秒） */
  duration: number;
  /** 开始位置（拍）；供可变速播放器使用 */
  startBeat: number;
  /** 持续拍数；供可变速播放器使用 */
  durationBeats: number;
  /** 实际发声拍数；音色只响应起止，不自行解释奏法。 */
  soundingDurationBeats?: number;
  /** 所属小节编号，供选段播放使用 */
  measureNumber: number;
  /** 所属小节在整谱中的起始拍位置 */
  measureStartBeat: number;
  /** 所属小节总拍数 */
  measureDurationBeats: number;
  /** 音高频率（Hz），休止符/延音线为 null */
  frequency: number | null;
  /** 同音圆滑线延续的音高；区间裁剪时恢复入口发声。 */
  continuationFrequency?: number;
  /** 原谱中的事件拍位置；选段时忽略谱面反复。 */
  writtenStartBeat?: number;
  /** 原谱小节的起始拍位置。 */
  writtenMeasureStartBeat?: number;
  /** 播放顺序中的小节位置，用于区分同一记谱小节的多次出现。 */
  measureOccurrence?: number;
  /** 原始音符数据 */
  note: NoteElement;
}

export interface MeasureLoopRange {
  readonly startMeasure: number;
  readonly endMeasure: number;
}

export interface ScheduledSegment {
  readonly events: ScheduledNote[];
  readonly startBeat: number;
  readonly endBeat: number;
  readonly durationBeats: number;
}

/** 提取按小节编号闭区间选择的播放段，并将事件拍数归一到段落起点。 */
export function selectMeasureSegment(events: ScheduledNote[], range: MeasureLoopRange): ScheduledSegment | null {
  const firstOccurrences = new Map<number, number>();
  for (const event of events) {
    const occurrence = event.measureOccurrence ?? 0;
    firstOccurrences.set(event.measureNumber, Math.min(firstOccurrences.get(event.measureNumber) ?? occurrence, occurrence));
  }
  const selected = events.filter((event) => event.measureNumber >= range.startMeasure && event.measureNumber <= range.endMeasure
    && (event.measureOccurrence ?? 0) === firstOccurrences.get(event.measureNumber))
    .map(event => ({ ...event, startBeat: event.writtenStartBeat ?? event.startBeat,
      measureStartBeat: event.writtenMeasureStartBeat ?? event.measureStartBeat }))
    .sort((a, b) => a.startBeat - b.startBeat || a.index - b.index);
  if (selected.length === 0) return null;

  // 从所选小节最早的事件开始，保留起始倚音/波音相对主音的时序。
  const startBeat = Math.min(...selected.map(event => Math.min(event.measureStartBeat, event.startBeat)));
  const endBeat = Math.max(...selected.map(event => event.measureStartBeat + event.measureDurationBeats));
  const normalizedEvents = selected.map((event) => ({
    ...event,
    startBeat: Math.max(0, event.startBeat - startBeat),
    durationBeats: Math.max(0.01, Math.min(event.durationBeats, endBeat - event.startBeat)),
    soundingDurationBeats: Math.max(0, Math.min(event.soundingDurationBeats ?? event.durationBeats, endBeat - event.startBeat)),
  }));

  const soundingByVoice = new Map<VoiceId | undefined, ScheduledNote>();
  for (const event of normalizedEvents) {
    let sounding = soundingByVoice.get(event.voiceId);
    if (event.continuationFrequency !== undefined) {
      if (sounding?.frequency === event.continuationFrequency
        && sounding.startBeat + sounding.durationBeats >= event.startBeat - 0.001) {
        sounding.durationBeats = Math.max(sounding.durationBeats, event.startBeat + event.durationBeats - sounding.startBeat);
        sounding.soundingDurationBeats = sounding.durationBeats;
      } else {
        event.frequency = event.continuationFrequency;
        event.soundingDurationBeats = event.durationBeats;
        sounding = event;
      }
    } else if (event.frequency !== null) {
      sounding = event;
    } else if (event.note.type === 'rest') {
      sounding = undefined;
    }
    if (sounding) soundingByVoice.set(event.voiceId, sounding);
    else soundingByVoice.delete(event.voiceId);
  }

  return { events: normalizedEvents, startBeat, endBeat, durationBeats: Math.max(0.25, endBeat - startBeat) };
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
 * 注意：倚音不占用独立的节拍时间
 */
function durationInBeats(note: NoteElement): number {
  // 换气符号不占用时间
  if (note.type === 'breath') {
    return 0;
  }

  // 倚音不占用独立时间（从主音符中借用）
  if (note.type === 'note' && note.isGrace) {
    return 0;
  }

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
 * @param score - 曲谱 AST
 * @param tempoOverride - 可选的速度覆盖（BPM），不传则使用曲谱元数据中的速度
 */
export function scheduleNotes(score: Score, tempoOverride?: number, options: ScheduleOptions = {}): ScheduledNote[] {
  if (score.secondaryVoice && (score.secondaryVoice.measures.length !== score.measures.length
    || score.measures.some((measure, index) => Boolean(measure.repeatStart) !== Boolean(score.secondaryVoice!.measures[index]?.repeatStart)
      || Boolean(measure.repeatEnd) !== Boolean(score.secondaryVoice!.measures[index]?.repeatEnd)))) {
    throw new Error('双声部反复边界不一致，无法调度');
  }
  const order = options.expandRepeats === false ? score.measures.map((_, index) => index) : createPlaybackOrder(score.measures);
  return getScoreVoices(score).flatMap(voice => {
    const writtenOffsets: number[] = [];
    const noteOffsets: number[] = [];
    let writtenBeat = 0;
    let noteOffset = voice.indexOffset;
    for (const measure of voice.measures) {
      writtenOffsets.push(writtenBeat);
      noteOffsets.push(noteOffset);
      writtenBeat += measure.notes.reduce((sum, note) => sum + durationInBeats(note), 0);
      noteOffset += measure.notes.length;
    }
    const indexMap: number[] = [];
    const resets = new Set<number>();
    const measures = order.map((originalIndex, occurrence) => {
      const measure = voice.measures[originalIndex];
      if (!measure) throw new Error('双声部小节数不一致，无法调度');
      measure.notes.forEach((_, index) => indexMap.push(noteOffsets[originalIndex] + index));
      if (occurrence > 0 && originalIndex !== order[occurrence - 1] + 1) resets.add(occurrence + 1);
      return { ...measure, number: occurrence + 1 };
    });
    return scheduleWrittenNotes({ metadata: score.metadata, measures }, tempoOverride, resets).map(event => {
      const occurrence = event.measureNumber - 1;
      const originalIndex = order[occurrence];
      return { ...event, index: indexMap[event.index],
        ...(score.secondaryVoice ? { voiceId: voice.id } : {}),
        measureNumber: voice.measures[originalIndex].number,
        measureOccurrence: occurrence,
        writtenStartBeat: writtenOffsets[originalIndex] + event.startBeat - event.measureStartBeat,
        writtenMeasureStartBeat: writtenOffsets[originalIndex] };
    });
  }).sort((a, b) => a.startBeat - b.startBeat || a.index - b.index);
}

/** 调度配置；完整 A/B 选段使用记谱顺序。 */
export interface ScheduleOptions {
  readonly expandRepeats?: boolean;
}

/**
 * 从记谱小节生成有限播放顺序；反复段演奏两遍，不修改原谱。
 * @param measures - 经 Parser 校验的记谱小节
 * @returns 原谱小节的零基索引序列
 */
export function createPlaybackOrder(measures: readonly Measure[]): number[] {
  const order: number[] = [];
  let repeatStart: number | null = null;
  for (let index = 0; index < measures.length; index++) {
    const measure = measures[index];
    if (measure.repeatStart) {
      if (repeatStart !== null) throw new Error('不支持嵌套反复');
      repeatStart = index;
    }
    order.push(index);
    if (measure.repeatEnd) {
      const start = repeatStart ?? 0;
      for (let repeated = start; repeated <= index; repeated++) order.push(repeated);
      repeatStart = null;
    }
  }
  if (repeatStart !== null) throw new Error('前反复记号缺少后反复记号');
  return order;
}

function scheduleWrittenNotes(score: Score, tempoOverride?: number, resets = new Set<number>()): ScheduledNote[] {
  const scheduled: Array<Omit<ScheduledNote, 'startBeat' | 'durationBeats' | 'measureNumber' | 'measureStartBeat' | 'measureDurationBeats'>> = [];
  const measureByIndex = new Map<number, number>();
  const measureStartBeatByNumber = new Map<number, number>();
  const measureDurationByNumber = new Map<number, number>();
  let measureNoteIndex = 0;
  let measureStartBeat = 0;
  for (const measure of score.measures) {
    measureStartBeatByNumber.set(measure.number, measureStartBeat);
    const measureDuration = measure.notes.reduce((sum, note) => sum + durationInBeats(note), 0);
    measureDurationByNumber.set(measure.number, measureDuration);
    for (let i = 0; i < measure.notes.length; i++) {
      measureByIndex.set(measureNoteIndex++, measure.number);
    }
    measureStartBeat += measureDuration;
  }
  const keyOffset = KEY_OFFSET[score.metadata.key] ?? 0;
  const bpm = tempoOverride ?? score.metadata.tempo;
  const secondsPerBeat = 60 / bpm;

  let currentTime = 0;
  let globalIndex = 0;
  let lastScheduledWithFreq: { duration: number; frequency: number | null; note: NoteElement } | null = null;
  let lastSlurGroup: number | undefined;

  for (const measure of score.measures) {
    if (resets.has(measure.number)) {
      lastScheduledWithFreq = null;
      lastSlurGroup = undefined;
    }
    for (let i = 0; i < measure.notes.length; i++) {
      const note = measure.notes[i];
      const beats = durationInBeats(note);
      const durationSec = beats * secondsPerBeat;

      // 圆滑线内连续相同音高：合并时值，不重新发音，但产生静默事件用于 UI 高亮
      if (
        note.type === 'note' &&
        !note.isGrace &&
        lastScheduledWithFreq &&
        lastSlurGroup !== undefined &&
        note.slurGroup === lastSlurGroup
      ) {
        const currentFreq = noteToFrequency(note, keyOffset);
        const lastScheduled = scheduled.find(s => s === lastScheduledWithFreq);
        if (lastScheduled && lastScheduled.frequency === currentFreq) {
          lastScheduled.duration += durationSec;

          // 产生静默事件，让 UI 在此时间点高亮
          scheduled.push({
            index: globalIndex,
            startTime: currentTime,
            duration: durationSec,
            frequency: null,
            continuationFrequency: currentFreq,
            note,
          });

          currentTime += durationSec;
          globalIndex++;
          continue;
        }
      }

      // 倚音特殊处理：极短播放时长，从当前时间（主音符开始时间）往前推
      if (note.type === 'note' && note.isGrace) {
        // 短倚音更快，长倚音稍慢
        const graceDuration = note.graceType === 'short' ? 0.03 : 0.06; // 30ms vs 60ms
        const frequency = noteToFrequency(note, keyOffset);
        
        scheduled.push({
          index: globalIndex,
          startTime: currentTime - graceDuration,
          duration: graceDuration,
          frequency,
          note,
        });
        
        globalIndex++;
        // 倚音不推进 currentTime
        continue;
      }

      // 延长线：将时值合并到前一个有效音符的发音时长，
      // 但仍产生一个静默事件用于 UI 高亮
      if (note.type === 'tie') {
        const continuationFrequency = lastScheduledWithFreq?.note.type === 'note' && lastScheduledWithFreq.note.articulation === 'staccatissimo'
          ? undefined : lastScheduledWithFreq?.frequency ?? undefined;
        if (lastScheduledWithFreq) {
          lastScheduledWithFreq.duration += durationSec;
        }

        // 产生静默事件（frequency=null），让 UI 在此时间点高亮延长线符号
        scheduled.push({
          index: globalIndex,
          startTime: currentTime,
          duration: durationSec,
          frequency: null,
          ...(continuationFrequency !== undefined ? { continuationFrequency } : {}),
          note,
        });

        lastSlurGroup = undefined;
        currentTime += durationSec;
        globalIndex++;
        continue;
      }

      let frequency: number | null = null;
      if (note.type === 'note') {
        frequency = noteToFrequency(note, keyOffset);
        
        // 波音处理：在主音符之前快速播放相邻音
        if (note.trillType) {
          const trillDuration = 0.05; // 每个波音音符50ms
          const neighborDegree = note.trillType === 'lower' ? note.pitch - 2 : note.pitch;
          const neighborPitch = ((neighborDegree % 7) + 7) % 7 + 1;
          
          // 创建临时音符对象用于计算相邻音频率
          const neighborNote: Note = {
            ...note,
            pitch: neighborPitch,
            octave: note.octave + Math.floor(neighborDegree / 7),
          };
          const neighborFreq = noteToFrequency(neighborNote, keyOffset);
          
          if (note.trillType === 'single') {
            // 单波音: 主音 -> 上邻音 -> 主音 (565)
            // 主音1
            scheduled.push({
              index: globalIndex,
              startTime: currentTime - trillDuration * 2,
              duration: trillDuration,
              frequency,
              note,
            });
            // 上邻音
            scheduled.push({
              index: globalIndex,
              startTime: currentTime - trillDuration,
              duration: trillDuration,
              frequency: neighborFreq,
              note,
            });
            // 主音会在下面正常添加
          } else if (note.trillType === 'double') {
            // 复波音: 主音 -> 上邻音 -> 主音 -> 上邻音 -> 主音 (56565)
            for (let j = 0; j < 2; j++) {
              // 主音
              scheduled.push({
                index: globalIndex,
                startTime: currentTime - trillDuration * (4 - j * 2),
                duration: trillDuration,
                frequency,
                note,
              });
              // 上邻音
              scheduled.push({
                index: globalIndex,
                startTime: currentTime - trillDuration * (3 - j * 2),
                duration: trillDuration,
                frequency: neighborFreq,
                note,
              });
            }
            // 最后一个主音会在下面正常添加
          } else if (note.trillType === 'lower') {
            // 下波音: 主音 -> 下邻音 -> 主音 (545)
            // 主音1
            scheduled.push({
              index: globalIndex,
              startTime: currentTime - trillDuration * 2,
              duration: trillDuration,
              frequency,
              note,
            });
            // 下邻音
            scheduled.push({
              index: globalIndex,
              startTime: currentTime - trillDuration,
              duration: trillDuration,
              frequency: neighborFreq,
              note,
            });
            // 主音会在下面正常添加
          }
        }
      }

      scheduled.push({
        index: globalIndex,
        startTime: currentTime,
        duration: durationSec,
        frequency,
        note,
      });

      if (frequency !== null) {
        lastScheduledWithFreq = scheduled[scheduled.length - 1];
        if (note.type === 'note') {
          lastSlurGroup = note.slurGroup;
        }
      }

      if (note.type === 'rest') {
        lastScheduledWithFreq = null;
        lastSlurGroup = undefined;
      }

      currentTime += durationSec;
      globalIndex++;
    }
  }

  return scheduled.map((event): ScheduledNote => ({
    ...event,
    startBeat: event.startTime / secondsPerBeat,
    durationBeats: event.duration / secondsPerBeat,
    soundingDurationBeats: event.frequency === null ? 0
      : event.note.type === 'note' && event.note.articulation === 'staccatissimo'
        ? event.duration / secondsPerBeat * 0.25
        : event.duration / secondsPerBeat > 1 || (event.note.type === 'note' && event.note.slurGroup !== undefined)
          ? event.duration / secondsPerBeat : event.duration / secondsPerBeat * 0.9,
    measureNumber: measureByIndex.get(event.index) ?? 1,
    measureStartBeat: measureStartBeatByNumber.get(measureByIndex.get(event.index) ?? 1) ?? 0,
    measureDurationBeats: measureDurationByNumber.get(measureByIndex.get(event.index) ?? 1) ?? 0,
  }));
}
