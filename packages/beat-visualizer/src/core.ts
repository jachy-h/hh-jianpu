export interface Meter { readonly beatsPerBar: 2 | 3 | 4; readonly beatUnit: 4 }
export interface BeatSnapshot { readonly positionBeats: number; readonly bpm: number; readonly status: 'stopped' | 'playing' | 'paused'; readonly revision: number }
export interface BeatSource { read(): BeatSnapshot; subscribe(listener: () => void): () => void }
export interface Point { readonly x: number; readonly y: number }
export const patterns: Record<2 | 3 | 4, readonly Point[]> = { 2: [{x:120,y:138},{x:120,y:50}], 3: [{x:104,y:138},{x:188,y:112},{x:120,y:42}], 4: [{x:120,y:138},{x:52,y:112},{x:188,y:112},{x:120,y:42}] };
export function resolveBeatFrame(q: number, meter: Meter) {
  if (!Number.isFinite(q) || q < 0 || ![2,3,4].includes(meter.beatsPerBar) || meter.beatUnit !== 4) throw new Error('Invalid beat position or meter');
  const beat = Math.floor(q);
  return { absoluteBeat: beat, beatIndex: beat % meter.beatsPerBar, phase: q - beat, barIndex: Math.floor(beat / meter.beatsPerBar) };
}
function cubic(a: number,b: number,c: number,d: number,t: number): number { return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d; }
export function sampleConducting(q: number, meter: Meter, mirrored = false): Point {
  const {beatIndex,phase}=resolveBeatFrame(q,meter); const points=patterns[meter.beatsPerBar]; const p=points[beatIndex]; const next=points[(beatIndex+1)%points.length]; const dx=next.x-p.x; const r={x:(p.x+next.x)/2,y:Math.min(p.y,next.y)-24};
  const first=phase<0.35; const t=first?phase/0.35:(phase-0.35)/0.65;
  const x=first?cubic(p.x,p.x,r.x-0.15*dx,r.x,t):cubic(r.x,r.x+0.15*dx,next.x,next.x,t);
  const y=first?cubic(p.y,p.y-18,r.y,r.y,t):cubic(r.y,r.y,next.y-18,next.y,t);
  return {x:mirrored?240-x:x,y};
}
export function sampleBounce(q: number, meter: Meter): Point { const {phase}=resolveBeatFrame(q,meter); return {x:84,y:138-256*phase*(1-phase)}; }
export interface BeatClock extends BeatSource { play(): void; pause(): void; stop(): void; seek(position: number): void; setTempo(bpm: number): void }
export function createBeatClock(options: {bpm: number; now: () => number}): BeatClock {
  const valid=(v: number, positive=false) => { if (!Number.isFinite(v) || (positive ? v<=0 : v<0)) throw new Error('Invalid clock value'); };
  valid(options.bpm,true); let bpm=options.bpm, position=0, anchor=options.now(), status: BeatSnapshot['status']='stopped', revision=0; const listeners=new Set<() => void>();
  const read=(): BeatSnapshot => ({positionBeats: position+(status==='playing' ? Math.max(0,options.now()-anchor)*bpm/60000 : 0),bpm,status,revision});
  const emit=() => listeners.forEach(fn=>fn());
  const freeze=() => { position=read().positionBeats; anchor=options.now(); };
  return {read, subscribe(fn) { listeners.add(fn); return () => {listeners.delete(fn);}; }, play() {if(status==='playing') return; anchor=options.now(); status='playing'; emit();}, pause() {if(status!=='playing') return; freeze(); status='paused'; emit();}, stop() {position=0; anchor=options.now(); status='stopped'; revision++; emit();}, seek(q) {valid(q); position=q; anchor=options.now(); revision++; emit();}, setTempo(value) {valid(value,true); freeze(); bpm=value; emit();} };
}
