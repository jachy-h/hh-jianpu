import type * as Tone from 'tone';

/** 常规电平透明，仅对接近满刻度的峰值平滑收敛。 */
export function limitOutputSample(value: number): number {
  const magnitude = Math.abs(value);
  const limited = magnitude <= 0.8 ? magnitude : 0.8 + 0.15 * (1 - Math.exp(-(magnitude - 0.8) / 0.15));
  return Math.sign(value) * limited;
}

/** 所有旋律音色和声部共用混音增益与峰值保护。 */
export function createPlaybackOutput(tone: typeof Tone): { input: Tone.Gain; dispose: () => void } {
  const protection = new tone.WaveShaper(limitOutputSample, 4096).toDestination();
  const input = new tone.Gain(1).connect(protection);
  return { input, dispose: () => { input.dispose(); protection.dispose(); } };
}
