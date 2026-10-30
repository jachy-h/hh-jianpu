import { bounded, clientVersion } from './index';
import type { FollowResult } from './index';

export interface AuthorActions {
  readStatus: () => Promise<FollowResult['follow_status']>;
  follow: () => Promise<FollowResult['follow_status']>;
}

/** 仅使用公开的 9.51+ 作者能力；浏览器及旧客户端保留页内引导。 */
export async function authorActions(): Promise<AuthorActions | null> {
  if (await clientVersion() < 9510) return null;
  const bridge = window.xhs?.miniTool;
  if (typeof bridge?.followAuthor !== 'function') return null;
  return {
    readStatus: async () => {
      if (typeof bridge.getFollowStatus !== 'function') return -1;
      try { return (await bounded(bridge.getFollowStatus())).follow_status; } catch { return -1; }
    },
    // 用户可能长时间停留在原生确认框，不能用超时提前放开重复调用。
    follow: async () => (await bridge.followAuthor!()).follow_status,
  };
}

/** 取消不报错；失败时仍可通过作者主页联系。 */
export function followErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'errCode' in error ? Number(error.errCode) : 0;
  if (code === 20002) return '';
  if (code === 15404) return '今天的关注提示次数已用完，可前往作者主页关注。';
  if (code === 10003) return '请先完成已打开的关注确认。';
  return '暂时未能关注，请稍后重试，或前往作者主页关注。';
}
