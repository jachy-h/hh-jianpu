import { bounded, clientVersion } from '../container';

export interface PracticePreference {
  readonly tempo: number;
  readonly metronome: boolean;
  readonly warmup: number;
  readonly upperMuted: boolean;
  readonly lowerMuted: boolean;
}
export interface Preferences {
  readonly version: 1;
  readonly updatedAt: number;
  readonly selection: string;
  readonly scores: Readonly<Record<string, PracticePreference>>;
}
const KEY = 'hh-jianpu-minitool-preferences-v1';

/** 只接受受限偏好字段；不持久化资源内容或 AST。 */
export function decodePreferences(raw: string | null): Preferences | null {
  if (!raw || raw.length > 1024 * 1024) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, unknown>;
    if (data.version !== 1 || typeof data.selection !== 'string' || typeof data.updatedAt !== 'number'
      || !data.scores || typeof data.scores !== 'object' || Array.isArray(data.scores)) return null;
    const scores: Record<string, PracticePreference> = {};
    for (const [id, pref] of Object.entries(data.scores)) {
      if (!pref || typeof pref !== 'object') continue;
      const item = pref as Record<string, unknown>;
      if (typeof item.tempo !== 'number' || !Number.isFinite(item.tempo) || item.tempo < 40 || item.tempo > 220
        || ![0, 4, 8].includes(Number(item.warmup)) || typeof item.metronome !== 'boolean'
        || typeof item.upperMuted !== 'boolean' || typeof item.lowerMuted !== 'boolean') continue;
      scores[id] = { tempo: item.tempo, warmup: Number(item.warmup), metronome: item.metronome,
        upperMuted: item.upperMuted, lowerMuted: item.lowerMuted };
    }
    return { version: 1, selection: data.selection, updatedAt: data.updatedAt, scores };
  } catch { return null; }
}

/** 支持平台 Storage 时以它为权威；只在低版本回退浏览器存储。 */
export async function preferenceStore(): Promise<{ read(): Promise<Preferences | null>; write(data: Preferences): Promise<boolean> }> {
  const bridge = window.xhs?.miniTool;
  if (await clientVersion() >= 9460 && typeof bridge?.getStorage === 'function' && typeof bridge?.setStorage === 'function') {
    return {
      read: async () => {
        // 平台调用失败不能被解释为无数据，避免旧缓存反向覆盖。
        const stored = decodePreferences((await bounded(bridge.getStorage!({ key: KEY }))).data);
        if (stored) return stored;
        let migrated: Preferences | null = null;
        try { migrated = decodePreferences(localStorage.getItem(KEY)); } catch { return null; }
        if (migrated) {
          await bounded(bridge.setStorage!({ key: KEY, data: JSON.stringify(migrated) }));
          try { localStorage.removeItem(KEY); } catch { /* 平台数据已成为权威。 */ }
        }
        return migrated;
      },
      write: async data => {
        try { await bounded(bridge.setStorage!({ key: KEY, data: JSON.stringify(data) })); return true; } catch { return false; }
      },
    };
  }
  return {
    read: async () => { try { return decodePreferences(localStorage.getItem(KEY)); } catch { return null; } },
    write: async data => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; } },
  };
}
