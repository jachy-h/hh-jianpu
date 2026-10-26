import type { Measure, NoteElement, Score, VoiceId } from './types/index.js';

/** 以四分音符为一拍计算时值；装饰音和换气不推进时间轴。 */
export function durationInBeats(note: NoteElement): number {
  if (note.type === 'breath' || (note.type === 'note' && note.isGrace)) return 0;
  return (4 / note.duration.base) * (2 - 1 / 2 ** note.duration.dots);
}

export interface ScoreVoice {
  readonly id: VoiceId;
  readonly name: string;
  readonly measures: Measure[];
  readonly indexOffset: number;
}

/** 提供统一声部视图，主旋律不复制到第二份 AST。 */
export function getScoreVoices(score: Score): ScoreVoice[] {
  const names = score.metadata.custom?.['声部'];
  const name = (id: VoiceId, fallback: string): string =>
    names?.match(new RegExp(`(?:^|[,，])\\s*${id}=([^,，]+)`))?.[1].trim() || fallback;
  const upper: ScoreVoice = { id: 'upper', name: name('upper', '旋律'), measures: score.measures, indexOffset: 0 };
  return score.secondaryVoice ? [upper, { id: 'lower', name: name('lower', '伴奏'),
    measures: score.secondaryVoice.measures,
    indexOffset: score.measures.reduce((count, measure) => count + measure.notes.length, 0) }] : [upper];
}
