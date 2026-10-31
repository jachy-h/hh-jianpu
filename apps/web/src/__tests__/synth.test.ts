import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../adapters/audio/synth.js';
import { parse } from '@hh-jianpu/core';
import type { InstrumentBank, InstrumentDefinition } from '../adapters/audio/instruments.js';

const audio = vi.hoisted(() => {
  const events: { callback: (time: number) => void; time: string }[] = [];
  const draw: (() => void)[] = [];
  const transport = {
    PPQ: 192, ticks: 0, bpm: { value: 120 }, loop: false,
    start: vi.fn(), stop: vi.fn(), pause: vi.fn(), cancel: vi.fn(() => { events.length = 0; }),
    setLoopPoints: vi.fn(), on: vi.fn(), off: vi.fn(),
    schedule: vi.fn((callback: (time: number) => void, time: string) => { events.push({ callback, time }); }),
  };
  return { events, draw, transport, start: vi.fn(async () => {}), attack: vi.fn(), release: vi.fn(), voices: vi.fn() };
});
vi.mock('tone', () => {
  class Voice {
    volume = { value: 0 };
    constructor() { audio.voices(); }
    envelope = { release: 0.4 };
    toDestination() { return this; }
    connect() { return this; }
    now() { return 0; }
    triggerAttack = audio.attack;
    triggerRelease = audio.release;
    triggerAttackRelease = audio.attack;
    releaseAll = audio.release;
    dispose = vi.fn();
  }
  return {
    Gain: Voice, WaveShaper: Voice, Synth: Voice, PolySynth: Voice, start: audio.start, now: () => 0,
    getTransport: () => audio.transport,
    getDraw: () => ({ schedule: (callback: () => void) => audio.draw.push(callback) }),
  };
});

const makePlayer = () => {
  const player = new Player();
  player.loadScore(parse('Q | 1 2 3 4 | 5 6 7 1 |').score!);
  return player;
};

describe('Player lifecycle and musical timing', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); audio.events.length = 0; audio.draw.length = 0; });
  afterEach(() => { vi.useRealTimers(); });

  it('reports continuous written positions through pause, repeat and selection loops', async () => {
    const player = new Player();
    player.loadScore(parse('Q ||: 1 2 | 3 4 :|| 5 6 |').score!);
    player.setMetronomeEnabled(false);
    audio.transport.ticks = 0;
    await player.play();
    audio.transport.ticks = 192 * 4.5;
    expect(player.getPlaybackPosition()).toMatchObject({ measureNumber: 1, writtenBeat: 0.5, occurrence: 2 });
    player.pause();
    expect(player.getPlaybackPosition()).toMatchObject({ measureNumber: 1, writtenBeat: 0.5 });
    player.setTempo(60);
    await player.play();
    expect(player.getPlaybackPosition()).toMatchObject({ measureNumber: 1, writtenBeat: 0.5 });
    player.stop();
    expect(player.getPlaybackPosition()).toBeNull();
    player.setLoopRange({ startMeasure: 2, endMeasure: 3 });
    audio.transport.ticks = 0;
    await player.play();
    audio.transport.ticks = 192 * 1.5;
    expect(player.getPlaybackPosition()).toMatchObject({ measureNumber: 2, writtenBeat: 3.5 });
    audio.transport.ticks = 0;
    expect(player.getPlaybackPosition()).toMatchObject({ measureNumber: 2, writtenBeat: 2 });
    player.dispose();
  });

  it('hides the position during playback delay and clears it when loading another score', async () => {
    const player = makePlayer();
    player.setMetronomeEnabled(false);
    audio.transport.ticks = 0;
    expect(player.getPlaybackPosition()).toBeNull();
    await player.play(2);
    audio.transport.ticks = 192;
    expect(player.getPlaybackPosition()).toBeNull();
    audio.transport.ticks = 192 * 2.5;
    const position = player.getPlaybackPosition();
    expect(position).toMatchObject({ measureNumber: 1, writtenBeat: 0.5 });
    player.loadScore(parse('Q 5 6 7 1 |').score!);
    expect(player.getPlaybackPosition()).toBeNull();
    audio.transport.ticks = 0;
    await player.play();
    expect(player.getPlaybackPosition()?.session).not.toBe(position?.session);
    player.dispose();
    expect(player.getPlaybackPosition()).toBeNull();
  });

  it('does not let a second instance cancel the active Web transport', async () => {
    const first = makePlayer(); const second = makePlayer();
    first.setLoopRange({ startMeasure: 1, endMeasure: 1 });
    await first.play();
    const count = audio.events.length;
    await expect(second.play()).rejects.toThrow('另一个播放器');
    second.dispose();
    expect(audio.events).toHaveLength(count);
    expect(audio.transport.loop).toBe(true);
    expect(audio.transport.stop).not.toHaveBeenCalled();
    first.dispose();
    expect(audio.transport.stop).toHaveBeenCalledOnce();
  });

  it('sends noteOff at the full prolongation tick and follows a changed tempo instead of fixing seconds at onset', async () => {
    const voice = { noteOn: vi.fn(), noteOff: vi.fn(), releaseAll: vi.fn(), dispose: vi.fn() };
    const player = new Player({ instruments: [{ id: 'event-test', label: '事件测试', load: async () => ({
      createVoice: () => voice, dispose: vi.fn(),
    }) }] });
    player.loadScore(parse('1 - - - |').score!);
    player.setMetronomeEnabled(false);
    await player.play();
    audio.events[0].callback(0);
    const note = voice.noteOn.mock.calls[0][0];
    expect(voice.noteOff).not.toHaveBeenCalled();
    const off = audio.events.find(event => event.time === '768i')!;
    player.setTempo(60);
    off.callback(4);
    expect(voice.noteOff).toHaveBeenCalledWith(note.id, 4);
    player.dispose();
  });

  it('ends a loop boundary note and assigns a new ID for its next occurrence', async () => {
    const voice = { noteOn: vi.fn(), noteOff: vi.fn(), releaseAll: vi.fn(), dispose: vi.fn() };
    const player = new Player({ instruments: [{ id: 'loop-test', label: '循环测试', load: async () => ({
      createVoice: () => voice, dispose: vi.fn(),
    }) }] });
    player.loadScore(parse('1 - - - |').score!);
    player.setLoopRange({ startMeasure: 1, endMeasure: 1 });
    player.setMetronomeEnabled(false);
    await player.play();
    const onset = audio.events[0];
    onset.callback(0);
    const firstId = voice.noteOn.mock.calls[0][0].id;
    const loopEnd = audio.transport.on.mock.calls[0][1] as (time: number) => void;
    loopEnd(2);
    expect(voice.noteOff).toHaveBeenCalledWith(firstId, 2);
    onset.callback(2);
    expect(voice.noteOn.mock.calls[1][0].id).not.toBe(firstId);
    player.dispose();
    expect(audio.transport.off).toHaveBeenCalledWith('loopEnd', loopEnd);
  });

  it('routes a registered instrument through independent voice and articulation channels', async () => {
    const channels: { attack: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }[] = [];
    const bank: InstrumentBank = {
      createVoice: () => {
        const channel = { attack: vi.fn(), release: vi.fn() };
        channels.push(channel);
        return { noteOn: channel.attack, noteOff: vi.fn(), releaseAll: channel.release, dispose: vi.fn() };
      },
      dispose: vi.fn(),
    };
    const load = vi.fn(async () => bank);
    const player = new Player({ instruments: [{ id: 'test-piano', label: '测试钢琴', load }] });
    player.loadScore(parse('Q[upper] 1! 2 3 4 |\nQ[lower] 1 - - - |').score!);
    player.setMetronomeEnabled(false);
    await player.play();
    expect(channels).toHaveLength(2);
    audio.events.filter(event => event.time === '0i').forEach(event => event.callback(0));
    expect(channels[0].attack).toHaveBeenCalledWith(expect.objectContaining({ staccato: true }), 0);
    expect(audio.events.some(event => event.time === '48i')).toBe(true);
    expect(channels[1].attack).toHaveBeenCalledTimes(1);
    player.setVoiceMuted('lower', true);
    expect(channels[1].release).toHaveBeenCalledOnce();
    expect(channels[0].release).not.toHaveBeenCalled();
    player.pause();
    await player.play();
    expect(load).toHaveBeenCalledOnce();
    player.dispose();
    expect(bank.dispose).toHaveBeenCalledOnce();
  });

  it('disposes a stale loading bank after switching instruments and never starts the old request', async () => {
    let finish: ((bank: InstrumentBank) => void) | undefined;
    const stale = { createVoice: vi.fn(), dispose: vi.fn() };
    const slow: InstrumentDefinition = { id: 'slow', label: '慢速采样',
      load: () => new Promise(resolve => { finish = resolve; }) };
    const fast: InstrumentDefinition = { id: 'fast', label: '合成音', load: async () => ({
      createVoice: () => ({ noteOn: vi.fn(), noteOff: vi.fn(), releaseAll: vi.fn(), dispose: vi.fn() }),
      dispose: vi.fn(),
    }) };
    const player = new Player({ instruments: [slow, fast] });
    player.loadScore(parse('1 - - - |').score!);
    const oldPlay = player.play();
    await vi.waitFor(() => expect(finish).toBeDefined());
    player.setInstrument('fast');
    await player.play();
    expect(audio.transport.start).toHaveBeenCalledOnce();
    finish!(stale);
    await oldPlay;
    expect(stale.dispose).toHaveBeenCalledOnce();
    expect(stale.createVoice).not.toHaveBeenCalled();
    expect(audio.transport.start).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('allows retry after sample loading fails and waits for the bank before counting warmup beats', async () => {
    let finish: ((bank: InstrumentBank) => void) | undefined;
    const load = vi.fn<InstrumentDefinition['load']>()
      .mockRejectedValueOnce(new Error('sample unavailable'))
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const player = new Player({ instruments: [{ id: 'sample', label: '采样', load }] });
    await expect(player.play()).rejects.toThrow('sample unavailable');
    expect(audio.transport.start).not.toHaveBeenCalled();
    const beat = vi.fn();
    const warmup = player.startMetronomeWarmup(4, vi.fn(), beat);
    await vi.waitFor(() => expect(finish).toBeDefined());
    expect(beat).not.toHaveBeenCalled();
    finish!({ createVoice: vi.fn(), dispose: vi.fn() });
    await warmup;
    expect(beat).toHaveBeenCalledWith(4);
    player.dispose();
  });

  it('does not revive a stopped request after samples finish loading', async () => {
    let finish: ((bank: InstrumentBank) => void) | undefined;
    const player = new Player({ instruments: [{ id: 'sample', label: '采样',
      load: () => new Promise(resolve => { finish = resolve; }) }] });
    const playing = player.play();
    await vi.waitFor(() => expect(finish).toBeDefined());
    player.stop();
    finish!({ createVoice: vi.fn(), dispose: vi.fn() });
    await playing;
    expect(audio.transport.start).not.toHaveBeenCalled();
    player.dispose();
  });

  it('waits for all four complete beats before ending warmup and reads changed BPM', async () => {
    const player = makePlayer();
    const complete = vi.fn();
    const beat = vi.fn();
    player.setTempo(120);
    await player.startMetronomeWarmup(4, complete, beat);
    expect(beat.mock.calls.flat()).toEqual([4]);
    await vi.advanceTimersByTimeAsync(500);
    player.setTempo(60);
    await vi.advanceTimersByTimeAsync(500);
    expect(beat.mock.calls.flat()).toEqual([4, 3, 2]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(beat.mock.calls.flat()).toEqual([4, 3, 2, 1]);
    expect(complete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(complete).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('does not revive playback when stopped during audio activation', async () => {
    const player = makePlayer();
    let activate: (() => void) | undefined;
    audio.start.mockImplementationOnce(() => new Promise<void>((resolve) => { activate = resolve; }));
    const playing = player.play();
    await vi.waitFor(() => expect(activate).toBeDefined());
    player.stop();
    activate!();
    await playing;
    expect(player.status).toBe('idle');
    expect(audio.transport.start).not.toHaveBeenCalled();
    player.dispose();
  });

  it('resumes paused transport without clearing or rebuilding events', async () => {
    const player = makePlayer();
    await player.play();
    const count = audio.transport.schedule.mock.calls.length;
    player.pause();
    await player.play();
    expect(audio.transport.pause).toHaveBeenCalledOnce();
    expect(audio.transport.schedule).toHaveBeenCalledTimes(count);
    expect(player.status).toBe('playing');
    player.dispose();
  });

  it('keeps loop points and notes on ticks when tempo changes and ignores old UI callbacks after stop', async () => {
    const player = makePlayer();
    const highlight = vi.fn();
    player.setNoteHighlightCallback(highlight);
    player.setLoopRange({ startMeasure: 2, endMeasure: 2 });
    await player.play();
    expect(audio.transport.setLoopPoints).toHaveBeenCalledWith('0i', '768i');
    expect(audio.events.every((event) => event.time.endsWith('i'))).toBe(true);
    const positions = audio.events.map((event) => event.time);
    player.setTempo(80);
    expect(audio.transport.bpm.value).toBe(80);
    expect(audio.events.map((event) => event.time)).toEqual(positions);
    audio.events[0].callback(0);
    player.stop();
    highlight.mockClear();
    audio.draw.forEach((callback) => callback());
    expect(highlight).not.toHaveBeenCalled();
    player.dispose();
  });

  it('highlights concurrent voices together and mutes one channel without changing loop length', async () => {
    const player = new Player();
    player.loadScore(parse('Q[upper] 1/2/ 3 4 5 |\nQ[lower] 1 - - - |').score!);
    player.setMetronomeEnabled(false);
    player.setLoopRange({ startMeasure: 1, endMeasure: 1 });
    player.setVoiceMuted('lower', true);
    const highlight = vi.fn();
    player.setNoteHighlightCallback(highlight);
    await player.play();
    expect(audio.transport.setLoopPoints).toHaveBeenCalledWith('0i', '768i');
    const initial = audio.events.filter(event => event.time === '0i');
    initial.forEach(event => event.callback(0));
    audio.draw.forEach(callback => callback());
    expect(audio.attack).toHaveBeenCalledTimes(1);
    expect(highlight).toHaveBeenCalledWith(0, [0, 5]);
    player.setVoiceMuted('lower', false);
    audio.attack.mockClear();
    initial.forEach(event => event.callback(0));
    expect(audio.attack).toHaveBeenCalledTimes(2);
    player.dispose();
  });

  it('restores sustained notes in both voices when resuming inside a beat', async () => {
    const player = new Player();
    player.loadScore(parse('Q[upper] 1 - - - |\nQ[lower] 3 - - - |').score!);
    player.setMetronomeEnabled(false);
    await player.play();
    player.pause();
    audio.transport.ticks = 192;
    audio.attack.mockClear();
    await player.play();
    expect(audio.attack).toHaveBeenCalledTimes(2);
    expect(audio.attack.mock.calls[0][2]).toBe(0.3);
    player.dispose();
    audio.transport.ticks = 0;
  });

  it('does not carry hidden duet mute settings into an old single-voice score', async () => {
    const player = makePlayer();
    player.setMetronomeEnabled(false);
    player.setVoiceMuted('upper', true);
    await player.play();
    audio.events.filter(event => event.time === '0i').forEach(event => event.callback(0));
    expect(audio.attack).toHaveBeenCalledTimes(1);
    player.dispose();
  });

  it('preserves the second repeat occurrence when paused and restores the original highlight index', async () => {
    const score = parse('1 - - - | 3 - - - |').score!;
    const player = new Player();
    player.loadScore({ ...score, measures: score.measures.map((measure, index) => ({ ...measure,
      repeatStart: index === 0, repeatEnd: index === 0 })) });
    player.setMetronomeEnabled(false);
    const highlight = vi.fn();
    player.setNoteHighlightCallback(highlight);
    await player.play();
    audio.events.filter(event => event.time === '768i').forEach(event => event.callback(2));
    audio.draw.forEach(callback => callback());
    expect(highlight).toHaveBeenCalledWith(0, [0]);
    const positions = audio.events.map(event => event.time);
    player.pause();
    audio.transport.ticks = 192 * 5;
    player.setTempo(60);
    audio.attack.mockClear();
    await player.play();
    expect(audio.attack).toHaveBeenCalledTimes(1);
    expect(audio.attack.mock.calls[0][2]).toBe(0.3);
    expect(audio.events.map(event => event.time)).toEqual(positions);
    expect(audio.transport.bpm.value).toBe(60);
    player.dispose();
    audio.transport.ticks = 0;
  });

  it('ignores internal repeats in an A/B range and resumes written repeats after clearing it', async () => {
    const score = parse('1 2 3 4 | 5 6 7 1 |').score!;
    const player = new Player();
    player.loadScore({ ...score, measures: score.measures.map((measure, index) => ({ ...measure,
      repeatStart: index === 0, repeatEnd: index === 1 })) });
    player.setMetronomeEnabled(false);
    player.setLoopRange({ startMeasure: 1, endMeasure: 2 });
    await player.play();
    expect(audio.transport.setLoopPoints).toHaveBeenCalledWith('0i', '1536i');
    player.stop();
    player.setLoopRange(null);
    await player.play();
    expect(audio.transport.loop).toBe(false);
    expect(audio.events.some(event => event.time === '3072i')).toBe(true);
    player.dispose();
  });

  it('cancels pending warmup on stop before it can start playback', async () => {
    const player = makePlayer();
    const complete = vi.fn();
    await player.startMetronomeWarmup(4, complete);
    player.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(complete).not.toHaveBeenCalled();
    player.dispose();
  });
});
