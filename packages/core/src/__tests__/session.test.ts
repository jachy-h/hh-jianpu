import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { scheduleNotes } from '../player/scheduler.js';
import { activeNoteIndices, sustainingNotes } from '../player/session.js';

describe('Shared playback session selectors', () => {
  it('restores only active sounding notes while highlighting each voice independently', () => {
    const score = parse('Q[upper] 1! 2 3 4 |\nQ[lower] 1 - - - |').score!;
    const events = scheduleNotes(score, 120);
    const atHalfBeat = activeNoteIndices(events, 0.5);
    expect(atHalfBeat).toHaveLength(2);
    const sustaining = sustainingNotes(events, 0.5);
    expect(sustaining).toHaveLength(1);
    expect(sustaining[0].voiceId).toBe('lower');
    expect(sustainingNotes(events, 4)).toEqual([]);
  });
});
