import type * as Tone from 'tone';
import type { InstrumentDefinition } from './instrument.js';

/** 原有三角波音色；每次发声有独立的包络和释放。 */
export const TRIANGLE_INSTRUMENT: InstrumentDefinition = {
  id: 'triangle',
  label: '原声（合成音）',
  load: async (tone, output) => ({
    createVoice: () => {
      const notes = new Map<string, { synth: InstanceType<typeof Tone.Synth>; startTime: number }>();
      const allocated = new Set<InstanceType<typeof Tone.Synth>>();
      return {
        noteOn: (note, time) => {
          const release = note.staccato ? 0.04 : 0.4;
          const envelope = note.resumed
            ? { attack: 0.005, decay: 0, sustain: 1, release }
            : note.staccato
              ? { attack: 0.005, decay: 0.04, sustain: 0.3, release }
              : { attack: 0.02, decay: 0.1, sustain: 0.3, release };
          const synth = new tone.Synth({
            context: output.context,
            oscillator: { type: 'triangle' }, envelope,
            onsilence: () => {
              if (notes.get(note.id)?.synth === synth) notes.delete(note.id);
              // 离线时钟先调度完事件再渲染波形，不能提前断开发生过的声音。
              if (!output.context.isOffline) { allocated.delete(synth); synth.dispose(); }
            },
          }).connect(output);
          allocated.add(synth);
          notes.set(note.id, { synth, startTime: time });
          synth.triggerAttack(note.frequency, time, (note.velocity ?? 1) * (note.resumed ? 0.3 : 1));
        },
        noteOff: (id, time) => { notes.get(id)?.synth.triggerRelease(time); },
        releaseAll: (time = output.now()) => {
          for (const [id, { synth, startTime }] of notes) {
            if (startTime > time) { synth.dispose(); allocated.delete(synth); notes.delete(id); continue; }
            synth.envelope.release = 0.01;
            synth.triggerRelease(time);
          }
        },
        dispose: () => { for (const synth of allocated) synth.dispose(); notes.clear(); allocated.clear(); },
      };
    },
    dispose: () => {},
  }),
};
