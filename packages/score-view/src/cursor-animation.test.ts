import { describe, expect, it, vi } from 'vitest';
import { startCursorAnimation } from './cursor-animation.js';

describe('播放线帧调度', () => {
  it('后台暂停，恢复时读取最新状态，清理后不再调度', () => {
    let hidden = false;
    let visibility = () => {};
    const frames = new Map<number, () => void>();
    let id = 0;
    const update = vi.fn();
    const unsubscribe = vi.fn();
    const dispose = startCursorAnimation({
      request: callback => { frames.set(++id, callback); return id; },
      cancel: key => { frames.delete(key); },
      isHidden: () => hidden,
      subscribe: callback => { visibility = callback; return unsubscribe; },
    }, update);
    expect(update).toHaveBeenCalledTimes(1);
    const first = frames.get(1)!; frames.delete(1); first();
    expect(update).toHaveBeenCalledTimes(2);
    hidden = true; visibility();
    expect(frames.size).toBe(0);
    hidden = false; visibility();
    expect(update).toHaveBeenCalledTimes(3);
    dispose();
    expect(frames.size).toBe(0);
    expect(unsubscribe).toHaveBeenCalledOnce();
    first();
    expect(update).toHaveBeenCalledTimes(3);
  });
});
