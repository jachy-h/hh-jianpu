/** 每次发声独立标识；同音重奏和不同声部不会共用释放状态。 */
export interface InstrumentNote {
  readonly id: string;
  readonly frequency: number;
  readonly velocity?: number;
  readonly staccato?: boolean;
  /** 暂停恢复或进入持续音中段时，从持续段而非起音开始。 */
  readonly resumed?: boolean;
}

/** 音源只响应发声事件，不计算拍数、节奏或停止时刻。 */
export interface PlaybackInstrument {
  noteOn(note: InstrumentNote, time: number): void;
  noteOff(id: string, time: number): void;
  releaseAll(time?: number): void;
  dispose(): void;
}

/** 一次加载的音色资源；各声部共享资源，独立管理活动音符。 */
export interface InstrumentBank {
  createVoice(): PlaybackInstrument;
  dispose(): void;
}
