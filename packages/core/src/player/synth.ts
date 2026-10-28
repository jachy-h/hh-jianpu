// ============================================================
// Synth — 音频合成封装（基于 Tone.js）
// ============================================================
// 注意：此模块在运行时动态引入 Tone.js，避免 SSR 问题

import type { Score, PlaybackStatus, VoiceId } from '../types/index.js';
import { scheduleNotes, selectMeasureSegment, type MeasureLoopRange, type ScheduledNote } from './scheduler.js';
import { createPlaybackOutput } from './audio-output.js';
import { TRIANGLE_INSTRUMENT, type InstrumentBank, type InstrumentDefinition, type PlaybackInstrument } from './instruments.js';

export interface PlayerOptions {
  readonly instruments?: readonly InstrumentDefinition[];
  readonly instrumentId?: string;
}

export type NoteHighlightCallback = (noteIndex: number, activeIndices?: number[]) => void;
export type StatusChangeCallback = (status: PlaybackStatus) => void;
/** 节拍器拍点回调：beat 为当前拍（1-based），beatsPerMeasure 为每小节总拍数 */
export type BeatCallback = (beat: number, beatsPerMeasure: number) => void;

/**
 * Player — 简谱播放器
 *
 * 职责：
 * 1. 将 Score 调度为时间事件
 * 2. 使用 Tone.js 合成音频
 * 3. 触发高亮回调同步 UI
 */
export class Player {
  private scheduledNotes: ScheduledNote[] = [];
  private activePlaybackNotes: ScheduledNote[] = [];
  private playbackDelayBeats = 0;
  private _score: Score | null = null;  // 保存曲谱，播放时按当前 tempo 重新计算时序
  private readonly instrumentDefinitions: Map<string, InstrumentDefinition>;
  private readonly voices = new Map<VoiceId, PlaybackInstrument>();
  private readonly soundingNotes = new Map<ScheduledNote, { id: string; voice: PlaybackInstrument }>();
  private noteSequence = 0;
  private output: ReturnType<typeof createPlaybackOutput> | null = null;
  private loopEndHandler: ((time: number) => void) | null = null;
  private instrumentBank: InstrumentBank | null = null;
  private instrumentGeneration = 0;
  private instrumentLoad: { generation: number; promise: Promise<void> } | null = null;
  private _instrumentId: string;
  private mutedVoices = new Set<VoiceId>();
  private metronomeSynth: import('tone').Synth | null = null; // Tone.Synth（节拍器点击声，非鼓声）
  private tone: typeof import('tone') | null = null;  // Tone module
  private isInitialized = false;
  private initialization: Promise<void> | null = null;
  private audioGeneration = 0;
  private playbackGeneration = 0;
  private animationFrame: number | null = null;
  private _tempo: number = 120;
  private _status: PlaybackStatus = 'idle';
  private _metronomeEnabled: boolean = true; // 默认启用节拍器
  private _loopRange: MeasureLoopRange | null = null;
  private warmupTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private warmupGeneration = 0;

  private onNoteHighlight: NoteHighlightCallback | null = null;
  private onStatusChange: StatusChangeCallback | null = null;
  private onBeat: BeatCallback | null = null;

  constructor(options: PlayerOptions = {}) {
    this.instrumentDefinitions = new Map((options.instruments ?? [TRIANGLE_INSTRUMENT]).map(definition => [definition.id, definition]));
    this._instrumentId = options.instrumentId ?? this.instrumentDefinitions.keys().next().value ?? '';
    if (!this.instrumentDefinitions.has(this._instrumentId)) throw new Error('未知播放音色');
  }

  /** 切换音色时停止播放，取消过期加载；下次播放按需加载所选音色。 */
  setInstrument(id: string): void {
    if (!this.instrumentDefinitions.has(id)) throw new Error(`未知播放音色：${id}`);
    if (id === this._instrumentId) return;
    this.stop();
    this.instrumentGeneration++;
    this.disposeInstrument();
    this.instrumentLoad = null;
    this._instrumentId = id;
  }

  get instrumentId(): string { return this._instrumentId; }

  private async prepareInstrument(): Promise<void> {
    if (this.instrumentBank) return;
    const generation = this.instrumentGeneration;
    if (this.instrumentLoad?.generation === generation) return this.instrumentLoad.promise;
    const promise = this.instrumentDefinitions.get(this._instrumentId)!.load(this.tone!, this.output!.input).then(bank => {
      if (generation !== this.instrumentGeneration) bank.dispose();
      else this.instrumentBank = bank;
    }).finally(() => {
      if (this.instrumentLoad?.generation === generation) this.instrumentLoad = null;
    });
    this.instrumentLoad = { generation, promise };
    return promise;
  }

  private releaseVoices(id?: VoiceId): void {
    for (const [voiceId, voice] of this.voices) {
      if (!id || voiceId === id) voice.releaseAll();
    }
    for (const event of this.soundingNotes.keys()) {
      if (!id || (event.voiceId ?? 'upper') === id) this.soundingNotes.delete(event);
    }
  }

  private startNote(event: ScheduledNote, time: number, resumed = false): void {
    if (event.frequency === null) return;
    const voice = this.getInstrumentForEvent(event);
    if (!voice) return;
    const previous = this.soundingNotes.get(event);
    previous?.voice.noteOff(previous.id, time);
    const id = `${this.playbackGeneration}:${++this.noteSequence}`;
    voice.noteOn({ id, frequency: event.frequency, resumed: resumed || event.continuationFrequency !== undefined,
      staccato: event.note.type === 'note' && event.note.articulation === 'staccatissimo' }, time);
    this.soundingNotes.set(event, { id, voice });
  }

  private endNote(event: ScheduledNote, time: number): void {
    const sounding = this.soundingNotes.get(event);
    if (!sounding) return;
    sounding.voice.noteOff(sounding.id, time);
    this.soundingNotes.delete(event);
  }

  private clearLoopHandler(): void {
    if (this.loopEndHandler && this.tone) this.tone.getTransport().off('loopEnd', this.loopEndHandler);
    this.loopEndHandler = null;
  }

  private disposeInstrument(): void {
    for (const voice of this.voices.values()) voice.dispose();
    this.voices.clear();
    this.soundingNotes.clear();
    this.instrumentBank?.dispose();
    this.instrumentBank = null;
  }

  /**
   * 初始化 Tone.js（懒加载，首次播放时调用）
   */
  private async initTone(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initialization) return this.initialization;
    this.initialization = this.initializeAudio();
    try {
      await this.initialization;
    } finally {
      this.initialization = null;
    }
  }

  private async initializeAudio(): Promise<void> {
    const generation = this.audioGeneration;
    const Tone = await import('tone');
    if (generation !== this.audioGeneration) return;
    this.tone = Tone;
    this.output = createPlaybackOutput(Tone);

    // 节拍器合成器：短促的 click 音效，非鼓声
    // 使用三角波 + 极短包络，模拟木块/哒声
    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.001,
        decay: 0.04,
        sustain: 0,
        release: 0.04,
      },
    }).connect(this.output.input);
    this.metronomeSynth.volume.value = -8;

    this.isInitialized = true;
  }

  /**
   * 设置音符高亮回调
   */
  setNoteHighlightCallback(cb: NoteHighlightCallback): void {
    this.onNoteHighlight = cb;
  }

  /** 设置声部静音；不改变全曲时间轴或另一声部的发声。 */
  setVoiceMuted(id: VoiceId, muted: boolean): void {
    if (muted) {
      this.mutedVoices.add(id);
      this.releaseVoices(id);
    } else this.mutedVoices.delete(id);
  }

  /**
   * 设置播放状态变化回调
   */
  setStatusChangeCallback(cb: StatusChangeCallback): void {
    this.onStatusChange = cb;
  }

  /**
   * 启用/禁用节拍器
   * 需要在 play() 前调用才能生效
   */
  setMetronomeEnabled(enabled: boolean): void {
    this._metronomeEnabled = enabled;
  }

  setLoopRange(range: MeasureLoopRange | null): void {
    this._loopRange = range;
  }

  /**
   * 设置节拍器拍点回调（用于 UI 同步显示当前拍）
   */
  setBeatCallback(cb: BeatCallback | null): void {
    this.onBeat = cb;
  }

  /**
   * 预热节拍器：在延迟期间播放节拍声
   * @param beats 预热拍数
   * @param onComplete 预热完成回调（回调时在下一拍开始音符播放）
   */
  async startMetronomeWarmup(
    beats: number,
    onComplete: () => void,
    onBeat?: (remainingBeats: number) => void
  ): Promise<void> {
    const generation = ++this.warmupGeneration;
    await this.initTone();
    if (generation !== this.warmupGeneration) return;
    const Tone = this.tone!;
    await Tone.start();
    if (generation !== this.warmupGeneration) return;
    await this.prepareInstrument();
    if (generation !== this.warmupGeneration) return;

    let currentBeat = beats;

    const tick = () => {
      if (currentBeat <= 0) {
        return;
      }
      if (this.metronomeSynth) {
        this.metronomeSynth.triggerAttackRelease('C5', '32n', Tone.now());
      }
      this.onBeat?.(currentBeat, 4);
      onBeat?.(currentBeat);
      currentBeat--;
    };

    // 立即播放第一拍，后续每拍读取最新 BPM，允许预热过程中调整速度。
    tick();
    const scheduleNextBeat = (): void => {
      const secondsPerBeat = 60 / this._tempo;
      this.warmupTimeoutId = setTimeout(() => {
        this.warmupTimeoutId = null;
        if (generation !== this.warmupGeneration) return;
        if (currentBeat <= 0) {
          onComplete();
          return;
        }
        tick();
        scheduleNextBeat();
      }, secondsPerBeat * 1000);
    };
    scheduleNextBeat();
  }

  /**
   * 停止预热节拍器
   */
  stopMetronomeWarmup(): void {
    // 清除节拍器预热的计时器，防止多次点击时并发执行
    this.warmupGeneration++;
    if (this.warmupTimeoutId !== null) {
      clearTimeout(this.warmupTimeoutId);
      this.warmupTimeoutId = null;
    }
  }

  /**
   * 加载曲谱（仅保存曲谱，播放时按当前 tempo 重新计算时序）
   */
  loadScore(score: Score): void {
    this.stop();
    this._score = score;
    this._tempo = score.metadata.tempo;
  }

  /**
   * 播放
   * @param delayBeats 延迟拍数（可选，默认为 0）
   */
  async play(delayBeats: number = 0): Promise<void> {
    const generation = this._status === 'paused' ? this.playbackGeneration : ++this.playbackGeneration;
    await this.initTone();
    if (generation !== this.playbackGeneration) return;
    const Tone = this.tone!;

    // 确保 AudioContext 已激活（需要用户交互后才能播放）
    await Tone.start();
    if (generation !== this.playbackGeneration) return;
    await this.prepareInstrument();
    if (generation !== this.playbackGeneration) return;

    // 如果是从暂停状态恢复，直接继续播放
    if (this._status === 'paused') {
      const transport = Tone.getTransport();
      const beat = Number(transport.ticks) / transport.PPQ - this.playbackDelayBeats;
      // 暂停已释放音源，恢复时补回仍应持续的音，不重新起算时间轴。
      for (const event of this.activePlaybackNotes) {
        const endBeat = event.startBeat + (event.soundingDurationBeats ?? event.durationBeats);
        if (event.frequency !== null && event.startBeat < beat && endBeat > beat
          && (!this._score?.secondaryVoice || !this.mutedVoices.has(event.voiceId ?? 'upper'))) {
          this.startNote(event, Tone.now(), true);
        }
      }
      Tone.getTransport().start();
      this.setStatus('playing');
      return;
    }

    // 用当前 tempo 重新计算时序（确保播放前调整 tempo 滑块立即生效）
    if (this._score) {
      this.scheduledNotes = scheduleNotes(this._score, this._tempo, { expandRepeats: !this._loopRange });
    }

    // 清除之前的调度
    this.clearLoopHandler();
    Tone.getTransport().cancel();
    Tone.getTransport().bpm.value = this._tempo;

    const transport = Tone.getTransport();
    const beatToTransportTime = (beats: number): string =>
      `${Math.max(0, Math.round(beats * transport.PPQ))}i`;

    const range = this._loopRange;
    const segment = range ? selectMeasureSegment(this.scheduledNotes, range) : null;
    if (range && !segment) return;
    const selectedNotes = segment?.events ?? this.scheduledNotes;
    const loopDurationBeats = segment?.durationBeats ?? 0;
    this.activePlaybackNotes = selectedNotes;
    // 在启动时间轴前准备声部适配器，奏法作为每个音符的发声参数传入。
    for (const event of selectedNotes) {
      if (event.frequency !== null) this.getInstrumentForEvent(event);
    }
    this.playbackDelayBeats = delayBeats;
    transport.loop = false;
    if (range && segment) {
      transport.setLoopPoints(
        beatToTransportTime(delayBeats),
        beatToTransportTime(delayBeats + loopDurationBeats)
      );
      transport.loop = true;
    }

    // 起音和结束分别按拍点调度；音源不再把时值锁定为起音时的秒数。
    for (const scheduled of selectedNotes) {
      if (scheduled.frequency === null) continue;
      transport.schedule((time: number) => {
        if (generation !== this.playbackGeneration) return;
        if (!this._score?.secondaryVoice || !this.mutedVoices.has(scheduled.voiceId ?? 'upper')) {
          this.startNote(scheduled, time);
        }
      }, beatToTransportTime(delayBeats + scheduled.startBeat));
      const endBeat = delayBeats + scheduled.startBeat + (scheduled.soundingDurationBeats ?? scheduled.durationBeats);
      transport.schedule((time: number) => {
        if (generation === this.playbackGeneration) this.endNote(scheduled, time);
      }, beatToTransportTime(endBeat));
    }
    // Transport 在 loopEnd 的 tick 先回绕，那个 tick 上的 schedule 不会执行。
    // 用边界事件释放上一轮仍活动的音，不影响新一轮独立 ID 或前音释放尾音。
    if (range && segment) {
      this.loopEndHandler = (time: number) => {
        if (generation !== this.playbackGeneration) return;
        for (const event of this.soundingNotes.keys()) this.endNote(event, time);
      };
      transport.on('loopEnd', this.loopEndHandler);
    }

    // 同一拍点只产生一次 UI 更新；使用每个声部最近的记谱事件，包含延音线和休止。
    const boundaries = [...new Set(selectedNotes.flatMap(event => [event.startBeat, event.startBeat + event.durationBeats]))].sort((a, b) => a - b);
    for (const beat of boundaries) {
      const active = new Map<VoiceId, ScheduledNote>();
      for (const event of selectedNotes) {
        if (event.startBeat <= beat + 0.0001 && event.startBeat + event.durationBeats > beat + 0.0001) {
          const id = event.voiceId ?? 'upper';
          const previous = active.get(id);
          if (!previous || event.startBeat >= previous.startBeat) active.set(id, event);
        }
      }
      const indices = [...active.values()].map(event => event.index);
      transport.schedule((time: number) => {
        Tone.getDraw().schedule(() => {
          if (generation === this.playbackGeneration && this._status === 'playing') {
            this.onNoteHighlight?.(indices[0] ?? -1, indices);
          }
        }, time);
      }, beatToTransportTime(delayBeats + beat));
    }

    // 在最后一个音符结束后自动停止
    const lastNote = selectedNotes.reduce<ScheduledNote | undefined>((last, event) => !last || event.startBeat + event.durationBeats > last.startBeat + last.durationBeats ? event : last, undefined);
    if (lastNote) {
      if (!range) {
        const endBeat = delayBeats + lastNote.startBeat + lastNote.durationBeats;
        transport.schedule((time: number) => {
          Tone.getDraw().schedule(() => {
            if (generation === this.playbackGeneration) this.stop();
          }, time);
        }, beatToTransportTime(endBeat));
      }
    }

    // === 节拍器调度（与音符共用同一 Transport，不互相干扰） ===
    // 节拍器从延迟后开始，重音从第1拍重新计算
    if (this._metronomeEnabled && this._score && this.metronomeSynth) {
      const beatsPerMeasure = this._score.metadata.timeSignature.beats;
      const totalDurationBeats = range ? loopDurationBeats : lastNote ? lastNote.startBeat + lastNote.durationBeats : 0;

      let beatIndex = 0;
      let beat = 0;
      while (range ? beat < totalDurationBeats - 0.001 : beat <= totalDurationBeats + 0.01) {
        const currentBeat = beatIndex % beatsPerMeasure; // 0-based，0 = 强拍
        const isDownbeat = currentBeat === 0;
        const capturedBeat = currentBeat + 1; // 转为 1-based

        const callback = (time: number) => {
          // 强拍：较高频率 + 较大音量；弱拍：较低频率 + 较小音量
          if (isDownbeat) {
            this.metronomeSynth!.volume.value = -4;
            this.metronomeSynth?.triggerAttackRelease(1500, '64n', time);
          } else {
            this.metronomeSynth!.volume.value = -12;
            this.metronomeSynth?.triggerAttackRelease(1000, '64n', time);
          }
          // UI 回调：在主线程触发
          Tone.getDraw().schedule(() => {
            if (generation === this.playbackGeneration && this._status === 'playing') {
              this.onBeat?.(capturedBeat, beatsPerMeasure);
            }
          }, time);
        };
        transport.schedule(callback, beatToTransportTime(delayBeats + beat));

        beat += 1;
        beatIndex++;
      }
    }

    transport.start();
    this.setStatus('playing');
  }

  /**
   * 暂停
   */
  pause(): void {
    if (!this.tone) return;
    this.releaseVoices();
    this.tone.getTransport().pause();
    this.setStatus('paused');
  }

  /**
   * 停止
   */
  stop(): void {
    this.playbackGeneration++;
    this.activePlaybackNotes = [];
    this.clearLoopHandler();
    this.stopMetronomeWarmup();
    this.releaseVoices();
    if (!this.tone) {
      this.setStatus('idle');
      this.onNoteHighlight?.(-1);
      return;
    }
    this.tone.getTransport().stop();
    this.tone.getTransport().loop = false;
    this.tone.getTransport().cancel();
    this.setStatus('idle');
    this.onNoteHighlight?.(-1);
  }

  /**
   * 设置速度（BPM）
   */
  setTempo(bpm: number): void {
    this._tempo = bpm;
    if (this.tone) {
      this.tone.getTransport().bpm.value = bpm;
    }
  }

  /**
   * 获取当前播放状态
   */
  get status(): PlaybackStatus {
    return this._status;
  }

  get tempo(): number {
    return this._tempo;
  }

  private setStatus(status: PlaybackStatus): void {
    this._status = status;
    this.onStatusChange?.(status);
  }

  private getInstrumentForEvent(event: ScheduledNote): PlaybackInstrument | undefined {
    const id = event.voiceId ?? 'upper';
    let voice = this.voices.get(id);
    if (!voice && this.instrumentBank) {
      voice = this.instrumentBank.createVoice();
      this.voices.set(id, voice);
    }
    return voice;
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    this.stop();
    this.audioGeneration++;
    this.instrumentGeneration++;
    this.instrumentLoad = null;
    this.disposeInstrument();
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose();
      this.metronomeSynth = null;
    }
    this.output?.dispose();
    this.output = null;
    this.isInitialized = false;
  }
}
