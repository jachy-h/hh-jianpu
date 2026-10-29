import type { BeatTransport } from '@hh-jianpu/core';

interface Event { readonly callback: (time: number) => void; readonly beat: number; }

/** 主线程前瞻时钟：只转换拍点与音频时间，不解释简谱或奏法。 */
export class NativeTransport implements BeatTransport {
  loop = false;
  private events: Event[] = [];
  private listeners = new Set<(time: number) => void>();
  private anchorBeat = 0;
  private anchorTime = 0;
  private through = -0.00001;
  private running = false;
  private rate = 120;
  private loopStart = 0;
  private loopEnd = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly clock: () => number,
    private readonly retime: (now: number, ratio: number) => void,
    private readonly flush: () => void,
    private readonly halt: () => void) {}

  private absoluteBeat(): number {
    return this.anchorBeat + (this.running ? Math.max(0, this.clock() - this.anchorTime) * this.rate / 60 : 0);
  }
  get beat(): number {
    const beat = this.absoluteBeat();
    return this.loop && this.loopEnd > this.loopStart && beat >= this.loopEnd
      ? this.loopStart + (beat - this.loopStart) % (this.loopEnd - this.loopStart) : beat;
  }
  set beat(value: number) { this.anchorBeat = value; this.anchorTime = this.clock(); this.through = value - 0.00001; }
  get bpm(): number { return this.rate; }
  set bpm(value: number) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('BPM 必须大于零');
    const now = this.clock();
    this.anchorBeat = this.absoluteBeat(); this.anchorTime = now;
    this.retime(now, this.rate / value); this.rate = value;
  }
  schedule(callback: (time: number) => void, beat: number): void { this.events.push({ callback, beat }); }
  setLoopPoints(start: number, end: number): void { this.loopStart = start; this.loopEnd = end; }
  onLoop(callback: (time: number) => void): void { this.listeners.add(callback); }
  offLoop(callback: (time: number) => void): void { this.listeners.delete(callback); }
  start(): void {
    if (this.running) return;
    this.running = true; this.anchorTime = this.clock() + 0.025;
    this.through = this.anchorBeat - 0.00001;
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
  }
  pause(): void {
    this.anchorBeat = this.absoluteBeat(); this.running = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null; this.halt();
  }
  stop(): void { this.pause(); this.anchorBeat = 0; this.through = -0.00001; }
  cancel(): void { this.events = []; this.through = this.absoluteBeat() - 0.00001; this.halt(); }
  /** 向前调度 100ms，UI 回调只在实际音频时间到达时执行。 */
  pump(): void {
    this.flush();
    if (!this.running) return;
    const horizon = this.anchorBeat + Math.max(0, this.clock() + 0.1 - this.anchorTime) * this.rate / 60;
    const length = this.loopEnd - this.loopStart;
    const looping = this.loop && length > 0;
    const entries: { beat: number; callback: (time: number) => void; boundary: boolean }[] = [];
    const first = looping ? Math.max(0, Math.floor((this.through - this.loopStart) / length)) : 0;
    const last = looping ? Math.max(0, Math.floor((horizon - this.loopStart) / length)) : 0;
    for (let cycle = first; cycle <= last; cycle++) {
      const offset = looping ? cycle * length : 0;
      for (const event of this.events) {
        if (looping && (event.beat >= this.loopEnd || (cycle > 0 && event.beat < this.loopStart))) continue;
        const beat = event.beat + offset;
        if (beat > this.through && beat <= horizon) entries.push({ beat, callback: event.callback, boundary: false });
      }
      const boundary = this.loopEnd + offset;
      if (looping && boundary > this.through && boundary <= horizon) {
        for (const callback of this.listeners) entries.push({ beat: boundary, callback, boundary: true });
      }
    }
    entries.sort((a, b) => a.beat - b.beat || Number(b.boundary) - Number(a.boundary));
    this.through = horizon;
    for (const entry of entries) {
      if (!this.running) break;
      entry.callback(Math.max(this.clock(), this.anchorTime + (entry.beat - this.anchorBeat) * 60 / this.rate));
    }
  }
}
