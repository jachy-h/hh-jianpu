// ============================================================
// Synth — 音频合成封装（基于 Tone.js）
// ============================================================
// 注意：此模块在运行时动态引入 Tone.js，避免 SSR 问题

import type { Score, PlaybackState, PlaybackStatus } from '../types/index.js';
import { scheduleNotes, type ScheduledNote } from './scheduler.js';

export type NoteHighlightCallback = (noteIndex: number) => void;
export type StatusChangeCallback = (status: PlaybackStatus) => void;

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
  private synth: any = null; // Tone.Synth
  private tone: any = null;  // Tone module
  private isInitialized = false;
  private animationFrame: number | null = null;
  private _tempo: number = 120;
  private _status: PlaybackStatus = 'idle';

  private onNoteHighlight: NoteHighlightCallback | null = null;
  private onStatusChange: StatusChangeCallback | null = null;

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
   * 加载曲谱（仅保存曲谱，播放时按当前 tempo 重新计算时序）
   */
  loadScore(score: Score): void {
    this.stop();
    this._score = score;
    this._tempo = score.metadata.tempo;
  }

  /**
   * 播放
   */
  async play(): Promise<void> {
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

    // 调度所有音符
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
      }, scheduled.startTime);
    }

    // 在最后一个音符结束后自动停止
    const lastNote = this.scheduledNotes[this.scheduledNotes.length - 1];
    if (lastNote) {
      const endTime = lastNote.startTime + lastNote.duration;
      Tone.getTransport().schedule((time: number) => {
        Tone.getDraw().schedule(() => {
          this.stop();
        }, time);
      }, endTime);
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
    this.isInitialized = false;
  }
}
