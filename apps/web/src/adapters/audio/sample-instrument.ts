import type * as Tone from 'tone';
import type { InstrumentDefinition } from './instrument.js';

/** 经过制作的采样资源；循环点以原始采样秒数定义。 */
export interface SampleDefinition {
  readonly url: string;
  readonly loopStart?: number;
  readonly loopEnd?: number;
  readonly gain?: number;
}

export interface SampleInstrumentOptions {
  readonly id: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly urls: Readonly<Record<string, string | SampleDefinition>>;
  readonly release?: number;
  readonly staccatoRelease?: number;
  readonly volume?: number;
}

/** 采样音源负责音高与持续/释放方式，结束时间完全由外部 noteOff 决定。 */
export function createSampleInstrument(options: SampleInstrumentOptions): InstrumentDefinition {
  return {
    id: options.id, label: options.label,
    load: async (tone, output) => {
      const definitions = Object.entries(options.urls).map(([note, value]) => ({
        note, definition: typeof value === 'string' ? { url: value } : value,
      }));
      if (!definitions.length) throw new Error('采样音色不能为空');
      let buffers: InstanceType<typeof Tone.ToneAudioBuffers> | undefined;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('采样加载超时，请重试')), 30000);
          buffers = new tone.ToneAudioBuffers({
            urls: Object.fromEntries(definitions.map(({ note, definition }) => [note, definition.url])),
            baseUrl: options.baseUrl, onload: resolve, onerror: reject,
          });
        });
        const samples = definitions.map(({ note, definition }) => {
          const buffer = buffers!.get(note).get()!;
          if (definition.loopStart !== undefined || definition.loopEnd !== undefined) {
            if (definition.loopStart === undefined || definition.loopEnd === undefined
              || definition.loopStart < 0 || definition.loopEnd <= definition.loopStart || definition.loopEnd > buffer.duration + 0.0001) {
              throw new Error(`无效的采样循环点：${note}`);
            }
          }
          return { ...definition, midi: tone.Frequency(note).toMidi(), buffer };
        });
        const loadedBuffers = buffers!;
        return {
          createVoice: () => {
            const gain = new tone.Gain({ context: output.context, gain: tone.dbToGain(options.volume ?? 0) }).connect(output);
            const sources = new Map<string, { source: InstanceType<typeof Tone.ToneBufferSource>; release: number; startTime: number }>();
            return {
              noteOn: (note, time) => {
                const midi = 69 + 12 * Math.log2(note.frequency / 440);
                const sample = samples.reduce((best, candidate) =>
                  Math.abs(candidate.midi - midi) < Math.abs(best.midi - midi) ? candidate : best);
                const source = new tone.ToneBufferSource({
                  context: output.context,
                  url: sample.buffer, loop: sample.loopEnd !== undefined,
                  loopStart: sample.loopStart ?? 0, loopEnd: sample.loopEnd ?? 0,
                  playbackRate: 2 ** ((midi - sample.midi) / 12),
                  fadeIn: note.resumed ? 0.01 : 0,
                  fadeOut: 0,
                  onended: () => { if (sources.get(note.id)?.source === source) sources.delete(note.id); },
                }).connect(gain);
                sources.set(note.id, { source, startTime: time, release: note.staccato ? options.staccatoRelease ?? 0.04 : options.release ?? 0.12 });
                // 不在起音时安排停止，不受文件长度/起音时 BPM 限制。
                source.start(time, note.resumed ? sample.loopStart ?? 0 : 0, undefined, (note.velocity ?? 1) * (sample.gain ?? 1));
              },
              noteOff: (id, time) => {
                const entry = sources.get(id);
                if (entry) { entry.source.fadeOut = entry.release; entry.source.stop(time); }
              },
              releaseAll: (time = gain.now()) => {
                for (const [id, { source, startTime }] of sources) {
                  if (startTime > time) { source.dispose(); sources.delete(id); continue; }
                  source.fadeOut = 0.01; source.stop(time);
                }
              },
              dispose: () => {
                for (const { source } of sources.values()) source.dispose();
                sources.clear(); gain.dispose();
              },
            };
          },
          dispose: () => { loadedBuffers.dispose(); },
        };
      } catch (error) {
        buffers?.dispose();
        throw error;
      } finally { clearTimeout(timeout); }
    },
  };
}
