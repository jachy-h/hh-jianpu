import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeTransport } from '../adapters/audio/transport';

const clocks: NativeTransport[] = [];
afterEach(() => { clocks.forEach(clock => clock.stop()); clocks.length = 0; vi.useRealTimers(); });
function setup() {
  vi.useFakeTimers();
  let time = 0;
  const retime = vi.fn(); const halt = vi.fn();
  const clock = new NativeTransport(() => time, retime, () => {}, halt);
  clocks.push(clock);
  return { clock, retime, halt, advance: (value: number) => { time = value; clock.pump(); } };
}

describe('Native beat transport', () => {
  it('uses the audio clock and remaps a four-beat release after tempo changes', () => {
    const { clock, retime, advance } = setup();
    const onset = vi.fn(), release = vi.fn();
    clock.schedule(onset, 0); clock.schedule(release, 4);
    clock.start();
    expect(onset).toHaveBeenCalledWith(0.025);
    advance(0.525); clock.bpm = 60;
    expect(clock.beat).toBeCloseTo(1);
    expect(retime).toHaveBeenLastCalledWith(0.525, 2);
    advance(3.44);
    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(3.525);
  });
  it('releases at loop end before the next occurrence at the same audio time', () => {
    const { clock, advance } = setup();
    const calls: string[] = [];
    clock.loop = true; clock.setLoopPoints(0, 4);
    clock.schedule(() => calls.push('on'), 0);
    clock.schedule(() => calls.push('ordinary-end'), 4);
    clock.onLoop(() => calls.push('boundary'));
    clock.start(); advance(1.95);
    expect(calls).toEqual(['on', 'boundary', 'on']);
    advance(3.95);
    expect(calls).toEqual(['on', 'boundary', 'on', 'boundary', 'on']);
  });
  it('preserves the pause position and removes stale events when stopped', () => {
    const { clock, advance, halt } = setup();
    const callback = vi.fn(); clock.schedule(callback, 2); clock.start();
    advance(0.525); clock.pause();
    const beat = clock.beat; advance(10);
    expect(clock.beat).toBe(beat); expect(callback).not.toHaveBeenCalled();
    clock.start(); advance(10.48);
    expect(callback).toHaveBeenCalledOnce();
    clock.stop(); clock.cancel(); advance(20);
    expect(clock.beat).toBe(0); expect(halt).toHaveBeenCalled();
    clock.start(); advance(22); expect(callback).toHaveBeenCalledOnce();
  });
  it('retimes already submitted lookahead events without dispatching duplicate onsets', () => {
    const { clock, advance, retime } = setup(); const callback = vi.fn();
    clock.schedule(callback, 0.1); clock.start(); expect(callback).toHaveBeenCalledOnce();
    advance(0.03); clock.bpm = 60; advance(0.1);
    expect(retime).toHaveBeenLastCalledWith(0.03, 2);
    expect(callback).toHaveBeenCalledOnce();
  });
});
