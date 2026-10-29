import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodePreferences, preferenceStore } from '../adapters/storage';
const raw = JSON.stringify({ version: 1, updatedAt: 100, selection: 'examples/twinkle', scores: {
  'examples/twinkle': { tempo: 120, warmup: 4, metronome: true, upperMuted: false, lowerMuted: true },
} });
afterEach(() => vi.unstubAllGlobals());
describe('Minitool preferences', () => {
  it('accepts bounded preferences and rejects arbitrary resource data or invalid tempo', () => {
    const parsed = decodePreferences(raw)!;
    expect(parsed.selection).toBe('examples/twinkle');
    expect(decodePreferences(raw.replace('120', '999'))?.scores).toEqual({});
    expect(decodePreferences('{invalid')).toBeNull();
    expect(decodePreferences('{"version":2}')).toBeNull();
  });
  it('prefers platform storage and migrates browser data only after a successful write', async () => {
    const browser = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
    const platform = { getStorage: vi.fn(async () => ({ data: null })), setStorage: vi.fn(async () => undefined) };
    vi.stubGlobal('localStorage', browser);
    vi.stubGlobal('window', { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9462004 } }, miniTool: platform } });
    const store = await preferenceStore();
    expect(await store.read()).toEqual(JSON.parse(raw));
    expect(platform.setStorage).toHaveBeenCalledOnce(); expect(browser.removeItem).toHaveBeenCalledOnce();
    expect(await store.write(JSON.parse(raw))).toBe(true);
    expect(browser.setItem).not.toHaveBeenCalled();
  });
  it('does not treat a platform read failure as empty data or overwrite it with old local data', async () => {
    const browser = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
    const platform = { getStorage: vi.fn(async () => { throw new Error('storage unavailable'); }), setStorage: vi.fn(async () => undefined) };
    vi.stubGlobal('localStorage', browser);
    vi.stubGlobal('window', { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9490001 } }, miniTool: platform } });
    const store = await preferenceStore(); await expect(store.read()).rejects.toThrow('storage unavailable');
    expect(browser.getItem).not.toHaveBeenCalled(); expect(platform.setStorage).not.toHaveBeenCalled();
  });
  it('handles failure of the low-version browser fallback without throwing', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } });
    const store = await preferenceStore(); expect(await store.read()).toBeNull(); expect(await store.write(JSON.parse(raw))).toBe(false);
  });
});
