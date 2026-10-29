import type { InstrumentBank, InstrumentNote, PlaybackInstrument, PlaybackRuntime } from '@hh-jianpu/core';
import { NativeTransport } from './transport';

interface Sound {
  readonly note: InstrumentNote;
  readonly level: number;
  oscillator: OscillatorNode;
  gain: GainNode;
  start: number;
  end: number;
  finished: boolean;
  onFinish?: () => void;
}
interface DrawTask { readonly callback: () => void; time: number; }

/** 无采样、无 Worker 的原生合成运行时；只执行 core 的音符/节拍命令。 */
export function createNativeRuntime(context?: AudioContext): PlaybackRuntime {
  const Constructor = typeof window !== 'undefined' ? window.AudioContext : undefined;
  if (!context && !Constructor) throw new Error('当前环境不支持音频播放，请在支持的小红书客户端重试');
  const audio = context ?? new Constructor!();
  // 在用户点击调用栈中立即申请激活，避免异步存储/模块加载消耗用户手势。
  const activation = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
  void activation.catch(() => undefined);
  const master = audio.createGain(); master.gain.value = 0.65; master.connect(audio.destination);
  const sounds = new Set<Sound>();
  let tasks: DrawTask[] = [];
  let disposed = false;
  let interrupt = () => {};
  audio.onstatechange = () => { if (!disposed && audio.state !== 'running') interrupt(); };
  const initialize = (sound: Sound): void => {
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    sound.oscillator = oscillator; sound.gain = gain;
    oscillator.type = 'triangle'; oscillator.frequency.value = sound.note.frequency;
    oscillator.connect(gain); gain.connect(master);
    gain.gain.setValueAtTime(sound.note.resumed ? sound.level : 0, sound.start);
    gain.gain.linearRampToValueAtTime(sound.level, sound.start + 0.008);
    oscillator.onended = () => {
      oscillator.disconnect(); gain.disconnect();
      if (sound.oscillator === oscillator) { sound.finished = true; sounds.delete(sound); sound.onFinish?.(); }
    };
    oscillator.start(sound.start);
  };
  const finish = (sound: Sound, time: number): void => {
    if (sound.finished) return;
    const end = Math.max(time, audio.currentTime);
    sound.end = end;
    const param = sound.gain.gain;
    param.cancelScheduledValues(end);
    param.setValueAtTime(sound.level, Math.max(end, sound.start + 0.008));
    param.linearRampToValueAtTime(0, Math.max(end, sound.start + 0.008) + 0.035);
    sound.oscillator.stop(Math.max(end, sound.start + 0.008) + 0.04);
  };
  const silence = (sound: Sound): void => {
    if (sound.finished) return;
    sound.finished = true; sounds.delete(sound); sound.onFinish?.();
    const now = audio.currentTime;
    sound.gain.gain.cancelScheduledValues(now);
    if (sound.start > now) {
      sound.oscillator.onended = null; sound.oscillator.stop(now);
      sound.oscillator.disconnect(); sound.gain.disconnect();
    } else {
      sound.gain.gain.setValueAtTime(sound.gain.gain.value, now);
      sound.gain.gain.linearRampToValueAtTime(0, now + 0.008);
      sound.oscillator.stop(now + 0.01);
    }
  };
  const spawn = (note: InstrumentNote, time: number, level: number): Sound => {
    const sound = { note, level, start: Math.max(audio.currentTime, time), end: Infinity, finished: false } as Sound;
    sounds.add(sound); initialize(sound); return sound;
  };
  const flush = (): void => {
    const due = tasks.filter(task => task.time <= audio.currentTime + 0.001);
    tasks = tasks.filter(task => task.time > audio.currentTime + 0.001);
    for (const task of due) task.callback();
  };
  const halt = (): void => { tasks = []; for (const sound of [...sounds]) silence(sound); };
  const transport = new NativeTransport(() => audio.currentTime, (now, ratio) => {
    // 前瞻窗口内已发送的发声/释放/UI 命令也必须随新 BPM 重定时。
    for (const sound of [...sounds]) {
      if (sound.finished || sound.end <= now) continue;
      const end = sound.end > now ? now + (sound.end - now) * ratio : sound.end;
      if (sound.start > now) {
        const newStart = now + (sound.start - now) * ratio;
        sound.oscillator.onended = null; sound.oscillator.stop(now);
        sound.oscillator.disconnect(); sound.gain.disconnect();
        sound.start = newStart; initialize(sound);
      } else {
        sound.gain.gain.cancelScheduledValues(now);
        sound.gain.gain.setValueAtTime(sound.level, now);
      }
      if (Number.isFinite(end)) finish(sound, end);
    }
    for (const task of tasks) if (task.time > now) task.time = now + (task.time - now) * ratio;
  }, flush, halt);
  const createVoice = (): PlaybackInstrument => {
    const notes = new Map<string, Sound>();
    return {
      noteOn: (note, time) => {
        const previous = notes.get(note.id); if (previous) silence(previous);
        const sound = spawn(note, time, note.staccato ? 0.18 : 0.2);
        notes.set(note.id, sound);
        sound.onFinish = () => { if (notes.get(note.id) === sound) notes.delete(note.id); };
      },
      noteOff: (id, time) => { const sound = notes.get(id); if (sound) finish(sound, time); },
      releaseAll: () => { for (const sound of notes.values()) silence(sound); notes.clear(); },
      dispose: () => { for (const sound of notes.values()) silence(sound); notes.clear(); },
    };
  };
  const bank: InstrumentBank = { createVoice, dispose: halt };
  return {
    delay: (callback, seconds) => { const timer = setTimeout(callback, seconds * 1000); return () => clearTimeout(timer); },
    transport, draw: { schedule: (callback, time) => { tasks.push({ callback, time }); } },
    start: async () => {
      if (disposed) throw new Error('播放器已关闭');
      await activation.catch(() => undefined);
      if (audio.state === 'suspended') await audio.resume();
      if (audio.state !== 'running') throw new Error('音频尚未激活，请再次点击播放');
    },
    onInterrupt: callback => { interrupt = callback; },
    now: () => audio.currentTime,
    click: (frequency, time, strong = false) => {
      const sound = spawn({ id: 'metronome', frequency }, time, strong ? 0.12 : 0.06);
      finish(sound, time + 0.025);
    },
    loadInstrument: async id => { if (id !== 'triangle') throw new Error('未知音色'); return bank; },
    dispose: () => { disposed = true; audio.onstatechange = null; transport.stop(); halt(); master.disconnect(); if (!context) void audio.close(); },
  };
}
