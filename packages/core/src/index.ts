export { getScoreVoices, durationInBeats } from './music.js';
export { parse } from './parser/index.js';
export { createLayout } from './renderer/index.js';
export { Player } from './player/index.js';
export type { PlayerOptions, InstrumentBank, InstrumentNote, PlaybackInstrument } from './player/index.js';
export {
  transposeScore,
  scoreToSource,
  calculateSemitoneDistance,
  calculateFingeringSemitones,
  noteToMidi,
  midiToNote,
} from './parser/transpose.js';
export {
  FLUTE_FINGERING_LOWEST_NOTE,
  KEY_SEMITONE_OFFSET,
} from './types/index.js';
export type * from './types/index.js';
export type { PlaybackRuntime, BeatTransport, InstrumentInfo, MeasureLoopRange, ScheduledNote } from './player/index.js';
export { scheduleNotes, selectMeasureSegment, activeNoteIndices, sustainingNotes } from './player/index.js';

export { resolveTimeCursor } from './renderer/time-cursor.js';
export type { TimeCursor } from './renderer/time-cursor.js';
export type { PlaybackPosition } from './player/position.js';
