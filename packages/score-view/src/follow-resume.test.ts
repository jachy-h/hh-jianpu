import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFollowResumeTimer } from './follow-resume.js';

afterEach(() => vi.useRealTimers());
describe('闲置恢复播放跟随', () => {
  it('连续操作重新计时，达到配置时间后恢复', () => {
    vi.useFakeTimers();
    const resume = vi.fn();
    const timer = createFollowResumeTimer(2000, resume);
    timer.enable(true);
    vi.advanceTimersByTime(1500);
    timer.activity();
    vi.advanceTimersByTime(1999);
    expect(resume).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(resume).toHaveBeenCalledOnce();
    timer.dispose();
  });
  it('按住拖动期间不恢复；松手后才开始计时', () => {
    vi.useFakeTimers();
    const resume = vi.fn();
    const timer = createFollowResumeTimer(2000, resume);
    timer.enable(true); timer.hold(true);
    vi.advanceTimersByTime(5000);
    expect(resume).not.toHaveBeenCalled();
    timer.hold(false);
    vi.advanceTimersByTime(2000);
    expect(resume).toHaveBeenCalledOnce();
  });
  it('暂停或卸载取消待执行的恢复，并支持自定义时长', () => {
    vi.useFakeTimers();
    const resume = vi.fn();
    const timer = createFollowResumeTimer(500, resume);
    timer.enable(true); timer.enable(false);
    vi.advanceTimersByTime(1000);
    expect(resume).not.toHaveBeenCalled();
    timer.enable(true);
    vi.advanceTimersByTime(500);
    expect(resume).toHaveBeenCalledOnce();
    timer.activity(); timer.dispose();
    vi.advanceTimersByTime(1000);
    expect(resume).toHaveBeenCalledOnce();
  });
});
