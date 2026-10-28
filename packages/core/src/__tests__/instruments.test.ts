import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Tone from 'tone';
import { createSampleInstrument } from '../player/instruments.js';
import { createPlaybackOutput, limitOutputSample } from '../player/audio-output.js';

const audio = vi.hoisted(() => ({
  loads: [] as { onload: () => void; onerror: (error: Error) => void }[],
  sources: [] as { stop: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>; fadeOut: number;
    start: ReturnType<typeof vi.fn>; options: { playbackRate: number; loop: boolean; loopStart: number; loopEnd: number;
      onended: () => void; url: { duration: number; note: string } } }[],
  disposeBuffers: vi.fn(), disposeGain: vi.fn(), connections: [] as unknown[], curves: [] as unknown[],
}));

vi.mock('tone', () => ({
  ToneAudioBuffers: class {
    constructor(options: { onload: () => void; onerror: (error: Error) => void }) { audio.loads.push(options); }
    get(note: string) { return { get: () => ({ duration: 1, note }) }; }
    dispose = audio.disposeBuffers;
  },
  Gain: class {
    toDestination() { return this; }
    connect(destination: unknown) { audio.connections.push(destination); return this; }
    now() { return 1; }
    dispose = audio.disposeGain;
  },
  WaveShaper: class {
    dispose = vi.fn();
    constructor(public mapping: (value: number) => number) { audio.curves.push(this); }
    toDestination() { return this; }
  },
  ToneBufferSource: class {
    fadeOut = 0;
    stop = vi.fn(); dispose = vi.fn(); start = vi.fn();
    constructor(public options: { playbackRate: number; loop: boolean; loopStart: number; loopEnd: number;
      onended: () => void; url: { duration: number; note: string } }) { audio.sources.push(this); }
    connect() { return this; }
  },
  Frequency: (note: string) => ({ toMidi: () => note === 'C4' ? 60 : 72 }),
  dbToGain: (decibels: number) => 10 ** (decibels / 20),
}));

const definition = () => createSampleInstrument({ id: 'piano', label: '钢琴', baseUrl: '/audio/',
  urls: { C4: { url: 'C4.wav', loopStart: 0.3, loopEnd: 0.54 }, C5: { url: 'C5.wav', loopStart: 0.2, loopEnd: 0.44 } } });
const output = () => new Tone.Gain(1);

describe('sample instrument note lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks();
    audio.loads.length = 0; audio.sources.length = 0; audio.connections.length = 0; audio.curves.length = 0;
  });
  afterEach(() => { vi.useRealTimers(); });

  it('loops until an explicit noteOff, shares buffers, and isolates same-pitch note IDs and voices', async () => {
    const bus = output();
    const loading = definition().load(Tone, bus);
    audio.loads[0].onload();
    const bank = await loading;
    const upper = bank.createVoice(), lower = bank.createVoice();
    upper.noteOn({ id: 'first', frequency: 440 }, 0);
    upper.noteOn({ id: 'second', frequency: 440 }, 0.5);
    lower.noteOn({ id: 'lower', frequency: 440, staccato: true }, 0);
    expect(audio.loads).toHaveLength(1);
    expect(audio.sources[0].options).toMatchObject({ loop: true, loopStart: 0.2, loopEnd: 0.44 });
    expect(audio.sources[0].options.url.note).toBe('C5');
    expect(audio.sources[0].options.playbackRate).toBeCloseTo(2 ** (-3 / 12));
    expect(audio.sources[0].stop).not.toHaveBeenCalled();
    upper.noteOff('first', 8);
    expect(audio.sources[0].stop).toHaveBeenCalledWith(8);
    expect(audio.sources[1].stop).not.toHaveBeenCalled();
    expect(audio.sources[2].stop).not.toHaveBeenCalled();
    upper.releaseAll();
    expect(audio.sources[0].stop).toHaveBeenLastCalledWith(1);
    expect(audio.sources[1].stop).toHaveBeenLastCalledWith(1);
    expect(audio.sources[2].stop).not.toHaveBeenCalled();
    lower.noteOff('lower', 2);
    expect(audio.sources[2].fadeOut).toBe(0.04);
    upper.dispose(); lower.dispose(); bank.dispose();
    expect(audio.disposeBuffers).toHaveBeenCalledOnce();
    expect(audio.connections).toEqual([bus, bus]);
    expect(audio.curves).toHaveLength(0);
  });

  it('restores a paused sample from the sustain loop rather than repeating its attack', async () => {
    const loading = definition().load(Tone, output());
    audio.loads[0].onload();
    const bank = await loading;
    const voice = bank.createVoice();
    voice.noteOn({ id: 'resume', frequency: 440, resumed: true }, 3);
    expect(audio.sources[0].start).toHaveBeenCalledWith(3, 0.2, undefined, 1);
    expect(audio.sources[0].stop).not.toHaveBeenCalled();
    voice.dispose(); bank.dispose();
  });

  it('cleans up failed, invalid, or timed out samples and permits retry', async () => {
    const failed = definition().load(Tone, output());
    const rejection = expect(failed).rejects.toThrow('404');
    audio.loads[0].onerror(new Error('404'));
    await rejection;
    const timedOut = definition().load(Tone, output());
    const timeoutRejection = expect(timedOut).rejects.toThrow('采样加载超时');
    await vi.advanceTimersByTimeAsync(30000);
    await timeoutRejection;
    const invalid = createSampleInstrument({ id: 'invalid', label: '错误', baseUrl: '/',
      urls: { C4: { url: 'C4.wav', loopStart: 1, loopEnd: 2 } } }).load(Tone, output());
    audio.loads[2].onload();
    await expect(invalid).rejects.toThrow('无效的采样循环点');
    expect(audio.disposeBuffers).toHaveBeenCalledTimes(3);
    const retry = definition().load(Tone, output());
    audio.loads[3].onload();
    (await retry).dispose();
    expect(audio.disposeBuffers).toHaveBeenCalledTimes(4);
  });

  it('keeps normal mix levels transparent and provides one independent output bus', () => {
    for (const value of [-0.5, 0, 0.5]) expect(limitOutputSample(value)).toBe(value);
    expect(limitOutputSample(1)).toBeLessThan(1);
    expect(limitOutputSample(-1)).toBe(-limitOutputSample(1));
    const bus = createPlaybackOutput(Tone);
    expect(audio.curves).toHaveLength(1);
    bus.dispose();
    expect(audio.disposeGain).toHaveBeenCalledOnce();
  });
});
