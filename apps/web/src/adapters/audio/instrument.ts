import type * as Tone from 'tone';
import type { InstrumentBank } from '@hh-jianpu/core';
export type { InstrumentNote, PlaybackInstrument, InstrumentBank } from '@hh-jianpu/core';
/** 工厂接收统一输出，不直接连接系统扬声器。 */
export interface InstrumentDefinition {
  readonly id: string;
  readonly label: string;
  readonly load: (tone: typeof Tone, output: Tone.ToneAudioNode) => Promise<InstrumentBank>;
}
