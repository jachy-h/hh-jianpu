import type { ScoreLayout } from '../types/index.js';

export interface TimeCursor {
  readonly lineIndex: number;
  readonly measureNumber: number;
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

/** 根据原谱小节与拍点解析时值布局中的播放线。 */
export function resolveTimeCursor(layout: ScoreLayout, measureNumber: number, writtenBeat: number): TimeCursor | null {
  if (!Number.isFinite(writtenBeat)) return null;
  for (const [lineIndex, line] of layout.lines.entries()) {
    const measure = line.measures.find(item => item.measure.number === measureNumber);
    const time = measure?.timeGeometry;
    if (!time || time.endBeat <= time.startBeat || writtenBeat < time.startBeat - 1e-7 || writtenBeat > time.endBeat + 1e-7) continue;
    const beat = Math.max(time.startBeat, Math.min(writtenBeat, time.endBeat));
    return { lineIndex, measureNumber, x: time.originX + (beat - time.startBeat) * time.pixelsPerBeat,
      top: line.y, bottom: line.y + line.height };
  }
  return null;
}
