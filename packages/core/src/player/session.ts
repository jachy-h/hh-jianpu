import type { ScheduledNote } from './scheduler.js';
import type { VoiceId } from '../types/index.js';

/** 当前拍点应高亮的原谱索引；各声部独立选择最近的事件。 */
export function activeNoteIndices(events: readonly ScheduledNote[], beat: number): number[] {
  const active = new Map<VoiceId, ScheduledNote>();
  for (const event of events) {
    if (event.startBeat <= beat + 0.0001 && event.startBeat + event.durationBeats > beat + 0.0001) {
      const id = event.voiceId ?? 'upper';
      if (!active.has(id) || event.startBeat >= active.get(id)!.startBeat) active.set(id, event);
    }
  }
  return [...active.values()].map(event => event.index);
}

/** 恢复时只补回仍处于实际发声门限的音符，不重放完整起音。 */
export function sustainingNotes(events: readonly ScheduledNote[], beat: number): ScheduledNote[] {
  return events.filter(event => event.frequency !== null && event.startBeat < beat
    && event.startBeat + (event.soundingDurationBeats ?? event.durationBeats) > beat);
}
