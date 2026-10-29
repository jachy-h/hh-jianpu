import type { InstrumentBank } from './instrument.js';

/** 可供应用组合与展示的音色，不暴露平台节点或工厂参数。 */
export interface InstrumentInfo { readonly id: string; readonly label: string; }

/** 以四分音符拍为单位的可变速时钟；回调收到音频时间（秒）。 */
export interface BeatTransport {
  beat: number;
  bpm: number;
  loop: boolean;
  schedule(callback: (time: number) => void, beat: number): void;
  setLoopPoints(start: number, end: number): void;
  onLoop(callback: (time: number) => void): void;
  offLoop(callback: (time: number) => void): void;
  start(): void;
  pause(): void;
  stop(): void;
  cancel(): void;
}

/** 平台副作用端口。乐谱规则由 core 决定，音频/计时由应用注入。 */
export interface PlaybackRuntime {
  readonly transport: BeatTransport;
  readonly draw: { schedule(callback: () => void, time: number): void };
  start(): Promise<void>;
  delay(callback: () => void, seconds: number): () => void;
  now(): number;
  click(frequency: number, time: number, strong?: boolean): void;
  loadInstrument(id: string): Promise<InstrumentBank>;
  onInterrupt?(callback: () => void): void;
  dispose(): void;
}
