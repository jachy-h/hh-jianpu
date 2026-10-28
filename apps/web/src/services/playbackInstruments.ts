import { createSampleInstrument, TRIANGLE_INSTRUMENT } from '@hh-jianpu/core';
import type { InstrumentDefinition } from '@hh-jianpu/core';
import pianoSamples from './piano-samples.json';

/** 应用音色注册表：新增音色在此组合，无需修改 Player 调度代码。 */
export const PLAYBACK_INSTRUMENTS: readonly InstrumentDefinition[] = [
  createSampleInstrument({
    id: 'piano', label: '钢琴',
    baseUrl: `${import.meta.env.BASE_URL}audio/piano/`,
    urls: pianoSamples,
    // 各采样持续段已分别校准；同谱 LUFS 对比后保留约 0.5 LU 的钢琴余量。
    volume: -2,
  }),
  TRIANGLE_INSTRUMENT,
];

export const DEFAULT_INSTRUMENT_ID = 'piano';
const PREFERENCE_KEY = 'hh-jianpu-instrument';

/** 音色属于用户偏好，与曲谱源码和恢复草稿分别持久化。 */
export function loadInstrumentPreference(): string {
  try {
    const saved = localStorage.getItem(PREFERENCE_KEY);
    return PLAYBACK_INSTRUMENTS.some(instrument => instrument.id === saved) ? saved! : DEFAULT_INSTRUMENT_ID;
  } catch {
    return DEFAULT_INSTRUMENT_ID;
  }
}

export function saveInstrumentPreference(id: string): void {
  try { localStorage.setItem(PREFERENCE_KEY, id); } catch { /* 存储不可用时仍允许本次切换。 */ }
}
