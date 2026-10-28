export { getScoreVoices, durationInBeats } from './music.js';
export { parse } from './parser/index.js';
export { createLayout } from './renderer/index.js';
export { Player, TRIANGLE_INSTRUMENT, createSampleInstrument } from './player/index.js';
export type { PlayerOptions, InstrumentDefinition, InstrumentBank, InstrumentNote, PlaybackInstrument, SampleDefinition, SampleInstrumentOptions } from './player/index.js';
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
