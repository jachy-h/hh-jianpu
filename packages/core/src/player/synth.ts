// ============================================================
// Synth — 音频合成封装（基于 Tone.js）
// ============================================================
// 注意：此模块在运行时动态引入 Tone.js，避免 SSR 问题

import type { Score, PlaybackState, PlaybackStatus } from '../types/index.js';
import { scheduleNotes, type ScheduledNote } from './scheduler.js';

export type NoteHighlightCallback = (noteIndex: number) => void;
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
  private _score: Score | null = null;  // 保存曲谱，播放时按当前 tempo 重新计算时序
  private synth: any = null; // Tone.Synth（音符合成）
  private metronomeSynth: any = null; // Tone.Synth（节拍器点击声，非鼓声）
  private tone: any = null;  // Tone module
  private isInitialized = false;
  private animationFrame: number | null = null;
  private _tempo: number = 120;
  private _status: PlaybackStatus = 'idle';
  private _metronomeEnabled: boolean = true; // 默认启用节拍器
  private warmupIntervalId: ReturnType<typeof setInterval> | null = null;
  private warmupTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private onNoteHighlight: NoteHighlightCallback | null = null;
  private onStatusChange: StatusChangeCallback | null = null;
  private onBeat: BeatCallback | null = null;

  /**
   * 初始化 Tone.js（懒加载，首次播放时调用）
   */
  private async initTone(): Promise<void> {
    if (this.isInitialized) return;

    // 动态引入 Tone.js
    const Tone = await import('tone');
    this.tone = Tone;

    this.synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.4,
      },
    }).toDestination();

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
    }).toDestination();
    this.metronomeSynth.volume.value = -8;

    this.isInitialized = true;
  }

  /**
   * 设置音符高亮回调
   */
  setNoteHighlightCallback(cb: NoteHighlightCallback): void {
    this.onNoteHighlight = cb;
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
  async startMetronomeWarmup(beats: number, onComplete: () => void): Promise<void> {
    await this.initTone();
    const Tone = this.tone;
    await Tone.start();

    const secondsPerBeat = 60 / this._tempo;
    let currentBeat = beats;

    const tick = () => {
      if (currentBeat <= 0) {
        return;
      }
      if (this.metronomeSynth) {
        this.metronomeSynth.triggerAttackRelease('C5', '32n', Tone.now());
      }
      this.onBeat?.(currentBeat, 4);
      currentBeat--;
    };

    // 立即播放第一拍
    tick();

    // 如果只有 1 拍，等待一个节拍后完成
    if (beats <= 1) {
      this.warmupTimeoutId = setTimeout(() => {
        this.warmupTimeoutId = null;
        onComplete();
      }, secondsPerBeat * 1000);
      return;
    }

    // 剩余拍数用 setInterval，最后一拍完成后等待一个节拍再回调
    this.warmupIntervalId = setInterval(() => {
      tick();
      if (currentBeat <= 0) {
        if (this.warmupIntervalId !== null) {
          clearInterval(this.warmupIntervalId);
          this.warmupIntervalId = null;
        }
        // 最后一拍播放后，等待一个节拍再开始音符
        this.warmupTimeoutId = setTimeout(() => {
          this.warmupTimeoutId = null;
          onComplete();
        }, secondsPerBeat * 1000);
      }
    }, secondsPerBeat * 1000);
  }

  /**
   * 停止预热节拍器
   */
  stopMetronomeWarmup(): void {
    // 清除节拍器预热的 setInterval / setTimeout，防止多次点击时并发执行
    if (this.warmupIntervalId !== null) {
      clearInterval(this.warmupIntervalId);
      this.warmupIntervalId = null;
    }
    if (this.warmupTimeoutId !== null) {
      clearTimeout(this.warmupTimeoutId);
      this.warmupTimeoutId = null;
    }
    if (this.tone) {
      this.tone.getTransport().cancel();
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
    await this.initTone();
    const Tone = this.tone;

    // 确保 AudioContext 已激活（需要用户交互后才能播放）
    await Tone.start();

    // 如果是从暂停状态恢复，直接继续播放
    if (this._status === 'paused') {
      Tone.getTransport().start();
      this.setStatus('playing');
      return;
    }

    // 用当前 tempo 重新计算时序（确保播放前调整 tempo 滑块立即生效）
    if (this._score) {
      this.scheduledNotes = scheduleNotes(this._score, this._tempo);
    }

    // 清除之前的调度
    Tone.getTransport().cancel();
    Tone.getTransport().bpm.value = this._tempo;

    // 延迟拍数对应的延迟时间
    const delaySeconds = (delayBeats * 60) / this._tempo;

    // 调度所有音符（加上延迟）
    for (const scheduled of this.scheduledNotes) {
      Tone.getTransport().schedule((time: number) => {
        if (scheduled.frequency !== null) {
          this.synth.triggerAttackRelease(
            scheduled.frequency,
            scheduled.duration * 0.9, // 留一点间隙
            time
          );
        }
        // 回调高亮（在主线程执行）
        Tone.getDraw().schedule(() => {
          this.onNoteHighlight?.(scheduled.index);
        }, time);
      }, delaySeconds + scheduled.startTime);
    }

    // 在最后一个音符结束后自动停止
    const lastNote = this.scheduledNotes[this.scheduledNotes.length - 1];
    if (lastNote) {
      const endTime = delaySeconds + lastNote.startTime + lastNote.duration;
      Tone.getTransport().schedule((time: number) => {
        Tone.getDraw().schedule(() => {
          this.stop();
        }, time);
      }, endTime);
    }

    // === 节拍器调度（与音符共用同一 Transport，不互相干扰） ===
    // 节拍器从延迟后开始，重音从第1拍重新计算
    if (this._metronomeEnabled && this._score && this.metronomeSynth) {
      const beatsPerMeasure = this._score.metadata.timeSignature.beats;
      const secondsPerBeat = 60 / this._tempo;
      const totalDuration = lastNote ? lastNote.startTime + lastNote.duration : 0;

      // 节拍器从 delaySeconds 开始，从第1拍重新计算
      const startTime = delaySeconds;
      const adjustedTotalDuration = totalDuration - delaySeconds;

      let beatIndex = 0;
      let t = startTime;
      while (t <= startTime + adjustedTotalDuration + secondsPerBeat * 0.5) {
        const currentBeat = beatIndex % beatsPerMeasure; // 0-based，0 = 强拍
        const isDownbeat = currentBeat === 0;
        const capturedT = t;
        const capturedBeat = currentBeat + 1; // 转为 1-based

        Tone.getTransport().schedule((time: number) => {
          // 强拍：较高频率 + 较大音量；弱拍：较低频率 + 较小音量
          if (isDownbeat) {
            this.metronomeSynth.volume.value = -4;
            this.metronomeSynth.triggerAttackRelease(1500, '64n', time);
          } else {
            this.metronomeSynth.volume.value = -12;
            this.metronomeSynth.triggerAttackRelease(1000, '64n', time);
          }
          // UI 回调：在主线程触发
          Tone.getDraw().schedule(() => {
            this.onBeat?.(capturedBeat, beatsPerMeasure);
          }, time);
        }, capturedT);

        t += secondsPerBeat;
        beatIndex++;
      }
    }

    Tone.getTransport().start();
    this.setStatus('playing');
  }

  /**
   * 暂停
   */
  pause(): void {
    if (!this.tone) return;
    this.tone.getTransport().pause();
    this.setStatus('paused');
  }

  /**
   * 停止
   */
  stop(): void {
    if (!this.tone) return;
    this.tone.getTransport().stop();
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

  /**
   * 销毁资源
   */
  dispose(): void {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose();
      this.metronomeSynth = null;
    }
    this.isInitialized = false;
  }
}
