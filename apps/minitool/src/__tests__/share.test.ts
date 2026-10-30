import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareScoreToNote } from '../adapters/container/share';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('分享曲谱到笔记', () => {
  it('将曲目和图片传给发布笔记接口', async () => {
    const postNote = vi.fn().mockResolvedValue({});
    vi.stubGlobal('window', { xhs: { miniTool: { postNote } } });
    await shareScoreToNote('小星星', 'data:image/png;base64,example');
    expect(postNote).toHaveBeenCalledWith({ title: '哈哈简谱｜一起练《小星星》', content: '今天用「哈哈简谱」练习《小星星》。选一首，慢慢练，一起来练习吧！\n#哈哈简谱 #简谱 #练琴日常', mediaInfo: { image_resources: [{ url: 'data:image/png;base64,example' }] } });
  });
  it('未注入接口时提示在小红书打开', async () => {
    vi.stubGlobal('window', {});
    await expect(shareScoreToNote('小星星', 'image')).rejects.toThrow('小红书客户端');
  });
  it('传播平台调用失败', async () => {
    vi.stubGlobal('window', { xhs: { miniTool: { postNote: vi.fn().mockRejectedValue(new Error('failed')) } } });
    await expect(shareScoreToNote('小星星', 'image')).rejects.toThrow('failed');
  });
  it('平台未响应时超时并允许调用方恢复', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { xhs: { miniTool: { postNote: () => new Promise(() => {}) } } });
    const result = shareScoreToNote('小星星', 'image');
    const rejection = expect(result).rejects.toThrow('客户端响应超时');
    await vi.advanceTimersByTimeAsync(2500);
    await rejection;
  });
});
