import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../player/synth.js';
import { parse } from '../parser/index.js';

const audio = vi.hoisted(() => {
  const events: { callback: (time: number) => void; time: string }[] = [];
  const draw: (() => void)[] = [];
  const transport = {
    PPQ: 192, ticks: 0, bpm: { value: 120 }, loop: false,
    start: vi.fn(), stop: vi.fn(), pause: vi.fn(), cancel: vi.fn(() => { events.length = 0; }),
    setLoopPoints: vi.fn(),
    schedule: vi.fn((callback: (time: number) => void, time: string) => { events.push({ callback, time }); }),
  };
  return { events, draw, transport, start: vi.fn(async () => {}), attack: vi.fn(), release: vi.fn(), voices: vi.fn() };
});
vi.mock('tone', () => {
  class Voice {
    volume = { value: 0 };
    constructor() { audio.voices(); }
    toDestination() { return this; }
    triggerAttackRelease = audio.attack;
    releaseAll = audio.release;
    dispose = vi.fn();
  }
  return {
    Synth: Voice, PolySynth: Voice, start: audio.start, now: () => 0,
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
    expect(audio.attack.mock.calls[0][1]).toBe('518i');
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
