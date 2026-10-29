import { Player as SharedPlayer } from '@hh-jianpu/core';
import type { BeatTransport, PlaybackRuntime } from '@hh-jianpu/core';
import { createPlaybackOutput } from './audio-output';
import { TRIANGLE_INSTRUMENT } from './triangle-instrument';
import type { InstrumentDefinition } from './instrument';
export type { InstrumentDefinition, InstrumentBank, PlaybackInstrument } from './instrument';

export interface PlayerOptions {
  readonly instruments?: readonly InstrumentDefinition[];
  readonly instrumentId?: string;
}

/** Web 音频门面：音乐编排仍由 core Player 负责，Tone 只负责执行。 */
export class Player extends SharedPlayer {
  constructor(options: PlayerOptions = {}) {
    const instruments = options.instruments ?? [TRIANGLE_INSTRUMENT];
    super({ instruments, instrumentId: options.instrumentId, runtime: () => createToneRuntime(instruments) });
  }
}

let transportOwner: symbol | null = null;

async function createToneRuntime(instruments: readonly InstrumentDefinition[]): Promise<PlaybackRuntime> {
  const tone = await import('tone');
  const source = tone.getTransport();
  const token = Symbol('web-playback');
  const ownsTransport = () => transportOwner === token;
  const output = createPlaybackOutput(tone);
  const click = new tone.Synth({ oscillator: { type: 'triangle' }, envelope: {
    attack: 0.001, decay: 0.04, sustain: 0, release: 0.04,
  } }).connect(output.input);
  const ticks = (beat: number): string => `${Math.max(0, Math.round(beat * source.PPQ))}i`;
  const transport: BeatTransport = {
    get beat() { return Number(source.ticks) / source.PPQ; },
    set beat(value) { if (ownsTransport()) source.ticks = value * source.PPQ; },
    get bpm() { return source.bpm.value; }, set bpm(value) { if (ownsTransport()) source.bpm.value = value; },
    get loop() { return source.loop; }, set loop(value) { if (ownsTransport()) source.loop = value; },
    schedule: (callback, beat) => { if (ownsTransport()) source.schedule(callback, ticks(beat)); },
    setLoopPoints: (start, end) => { if (ownsTransport()) source.setLoopPoints(ticks(start), ticks(end)); },
    onLoop: callback => { if (ownsTransport()) source.on('loopEnd', callback); },
    offLoop: callback => { source.off('loopEnd', callback); },
    start: () => { if (ownsTransport()) source.start(); }, pause: () => { if (ownsTransport()) source.pause(); },
    stop: () => { if (ownsTransport()) { source.stop(); source.cancel(); transportOwner = null; } },
    cancel: () => { if (ownsTransport()) source.cancel(); },
  };
  return {
    delay: (callback, seconds) => { const timer = setTimeout(callback, seconds * 1000); return () => clearTimeout(timer); },
    transport, draw: tone.getDraw(), start: async () => {
      if (transportOwner && !ownsTransport()) throw new Error('另一个播放器正在使用音频，请先停止它');
      transportOwner = token;
      try { await tone.start(); } catch (error) { if (ownsTransport()) transportOwner = null; throw error; }
    }, now: () => tone.now(),
    click: (frequency, time, strong = false) => {
      click.volume.value = strong ? -4 : -12;
      click.triggerAttackRelease(frequency, '64n', time);
    },
    loadInstrument: async id => {
      const definition = instruments.find(item => item.id === id);
      if (!definition) throw new Error('未知播放音色');
      return definition.load(tone, output.input);
    },
    dispose: () => { transport.stop(); click.dispose(); output.dispose(); },
  };
}
