import { durationInBeats, getScoreVoices } from '../music.js';
import type { Score } from '../types/index.js';
import { createPlaybackOrder, type MeasureLoopRange } from './scheduler.js';

export interface PlaybackPosition {
  readonly playbackBeat: number;
  readonly writtenBeat: number;
  readonly measureNumber: number;
  readonly occurrence: number;
  readonly session: number;
}

export interface PlaybackMeasure {
  readonly startBeat: number;
  readonly endBeat: number;
  readonly writtenBeat: number;
  readonly measureNumber: number;
  readonly occurrence: number;
}

/** 从记谱小节构造演奏时间轴，避免依赖装饰音和发声事件。 */
export function createPlaybackMeasures(score: Score, range: MeasureLoopRange | null, segmentStart = 0): PlaybackMeasure[] {
  const voices = getScoreVoices(score);
  const durations = score.measures.map((_, index) => Math.max(...voices.map(voice =>
    (voice.measures[index]?.notes ?? []).reduce((sum, note) => sum + durationInBeats(note), 0))));
  const writtenStarts: number[] = [];
  let written = 0;
  for (const duration of durations) { writtenStarts.push(written); written += duration; }
  const order = range ? score.measures.map((_, index) => index).filter(index =>
    score.measures[index].number >= range.startMeasure && score.measures[index].number <= range.endMeasure)
    : createPlaybackOrder(score.measures);
  let beat = range && order.length ? writtenStarts[order[0]] - segmentStart : 0;
  return order.map((index, occurrence) => {
    const startBeat = beat;
    beat += durations[index];
    return { startBeat, endBeat: beat, writtenBeat: writtenStarts[index], measureNumber: score.measures[index].number, occurrence };
  });
}

/** 左闭右开查找演奏拍点；曲末保留最后一个有效位置。 */
export function resolvePlaybackPosition(measures: readonly PlaybackMeasure[], beat: number, session: number): PlaybackPosition | null {
  if (!Number.isFinite(beat) || measures.length === 0) return null;
  let firstIndex = 0;
  let lastIndex = measures.length - 1;
  while (firstIndex <= lastIndex && measures[firstIndex].endBeat <= measures[firstIndex].startBeat) firstIndex++;
  while (lastIndex >= firstIndex && measures[lastIndex].endBeat <= measures[lastIndex].startBeat) lastIndex--;
  if (firstIndex > lastIndex) return null;
  const first = measures[firstIndex];
  const last = measures[lastIndex];
  const bounded = Math.max(first.startBeat, Math.min(beat, last.endBeat));
  let low = firstIndex;
  let high = lastIndex + 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (measures[mid].endBeat <= bounded) low = mid + 1;
    else high = mid;
  }
  const measure = low <= lastIndex ? measures[low] : last;
  return { playbackBeat: bounded, writtenBeat: measure.writtenBeat + bounded - measure.startBeat,
    measureNumber: measure.measureNumber, occurrence: measure.occurrence, session };
}
