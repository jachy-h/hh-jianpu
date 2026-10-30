export interface PracticePreference {
  readonly tempo: number;
  readonly metronome: boolean;
  readonly warmup: number;
  readonly upperMuted: boolean;
  readonly lowerMuted: boolean;
}

/** 每次选曲时使用该曲的默认练习状态。 */
export function defaultPreference(tempo: number): PracticePreference {
  return { tempo: Math.max(40, Math.min(220, tempo)), metronome: true, warmup: 0, upperMuted: false, lowerMuted: false };
}
