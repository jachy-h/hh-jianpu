import { describe, expect, it } from 'vitest';
import { createBeatClock, resolveBeatFrame, sampleBounce, sampleConducting, patterns } from './core.js';
describe('beat clock', () => {
 it('preserves position on tempo change and pause', () => { let time=0; const clock=createBeatClock({bpm:120,now:()=>time}); clock.play(); time=1000; expect(clock.read().positionBeats).toBe(2); clock.setTempo(60); time=2000; clock.pause(); expect(clock.read().positionBeats).toBe(3); time=10000; expect(clock.read().positionBeats).toBe(3); });
 it('rejects invalid positions without changing state', () => { const clock=createBeatClock({bpm:120,now:()=>0}); expect(()=>clock.seek(NaN)).toThrow(); expect(clock.read().positionBeats).toBe(0); });
});
describe('motion', () => { it('reaches each conducting point and loops',()=>{ for(const n of [2,3,4] as const) {const meter={beatsPerBar:n,beatUnit:4 as const}; for(let i=0;i<n;i++) expect(sampleConducting(i,meter)).toEqual(patterns[n][i]); expect(sampleConducting(n,meter)).toEqual(patterns[n][0]); expect(resolveBeatFrame(n,meter).barIndex).toBe(1); }}); it('lands on each beat',()=>{expect(sampleBounce(1,{beatsPerBar:4,beatUnit:4}).y).toBe(138);}); });
