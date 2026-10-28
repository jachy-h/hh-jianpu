import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import samples from '../services/piano-samples.json';

describe('教学钢琴的持续采样资源', () => {
  it('全部循环点落在真实 WAV 内，各音区持续段经过独立电平校准', () => {
    expect(Object.keys(samples)).toHaveLength(30);
    for (const [note, sample] of Object.entries(samples)) {
      const bytes = readFileSync(new URL(`../../public/audio/piano/${sample.url}`, import.meta.url));
      expect(bytes.toString('ascii', 0, 4), note).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12), note).toBe('WAVE');
      expect(bytes.readUInt16LE(20), note).toBe(1);
      const channels = bytes.readUInt16LE(22), rate = bytes.readUInt32LE(24);
      expect(channels).toBe(2);
      expect(rate).toBe(44100);
      expect(bytes.readUInt16LE(34)).toBe(16);
      const start = Math.round(sample.loopStart * rate), end = Math.round(sample.loopEnd * rate);
      expect(start, note).toBeGreaterThan(0);
      expect(end - start, note).toBeGreaterThan(rate * 0.1);
      expect(end * channels * 2 + 44, note).toBe(bytes.length);
      let squared = 0, peak = 0;
      for (let frame = start; frame < end; frame++) {
        for (let channel = 0; channel < channels; channel++) {
          const value = bytes.readInt16LE(44 + (frame * channels + channel) * 2) / 32767;
          squared += value * value; peak = Math.max(peak, Math.abs(value));
        }
      }
      expect(Math.sqrt(squared / ((end - start) * channels)), note).toBeCloseTo(0.22, 2);
      expect(peak, note).toBeLessThan(0.93);
    }
  });
});
