import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorActions, followErrorMessage } from '../adapters/container/author';

afterEach(() => vi.unstubAllGlobals());

describe('作者关注能力', () => {
  it('浏览器与旧客户端不调用关注接口', async () => {
    vi.stubGlobal('window', {});
    expect(await authorActions()).toBeNull();
    const followAuthor = vi.fn();
    vi.stubGlobal('window', { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9509000 } }, miniTool: { followAuthor } } });
    expect(await authorActions()).toBeNull();
    expect(followAuthor).not.toHaveBeenCalled();
  });

  it('9.51 客户端只查询状态，用户操作后才请求关注且不传用户 ID', async () => {
    const followAuthor = vi.fn(async () => ({ follow_status: 1 }));
    const getFollowStatus = vi.fn(async () => ({ follow_status: 2 }));
    vi.stubGlobal('window', { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9510001 } }, miniTool: { followAuthor, getFollowStatus } } });
    const actions = await authorActions();
    expect(await actions?.readStatus()).toBe(2);
    expect(followAuthor).not.toHaveBeenCalled();
    expect(await actions?.follow()).toBe(1);
    expect(followAuthor).toHaveBeenCalledWith();
  });

  it('查询失败可重试，业务失败不被当作已关注', async () => {
    const getFollowStatus = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce({ follow_status: 1 });
    vi.stubGlobal('window', { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9510001 } }, miniTool: { getFollowStatus, followAuthor: async () => ({ follow_status: -1 }) } } });
    const actions = await authorActions();
    expect(await actions?.readStatus()).toBe(-1);
    expect(await actions?.readStatus()).toBe(1);
    expect(await actions?.follow()).toBe(-1);
  });

  it('取消静默处理，频控与重复确认提供提示', () => {
    expect(followErrorMessage({ errCode: 20002 })).toBe('');
    expect(followErrorMessage({ errCode: 15404 })).toContain('次数已用完');
    expect(followErrorMessage({ errCode: 10003 })).toContain('已打开');
    expect(followErrorMessage(null)).toContain('稍后重试');
  });
});
