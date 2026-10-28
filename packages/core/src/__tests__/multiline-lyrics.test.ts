import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser.js';
import { scoreToSource, transposeScore } from '../parser/transpose.js';
import { createLayout } from '../renderer/layout.js';

const source = `Q 1 0 ^2/ 3 - | 4 5 6 7 |
C 春 风 吹 过 山 川
C2 (明月) _ 照 在 心 间
Q 1 2 3 4 |
C 又 一 年 啊
C2 共 唱 此 歌`;

describe('multiple lyric verses', () => {
  it('aligns each verse independently and preserves continuation and grouped syllables', () => {
    const { score, errors } = parse(source);
    expect(errors).toEqual([]);
    expect(score!.measures[0].lyricLines!.map(row => row.syllables.map(s => s.text)))
      .toEqual([['春', '风'], ['明月', '']]);
    expect(score!.measures[2].lyricLines!.map(row => row.syllables.map(s => s.text)))
      .toEqual([['又', '一', '年', '啊'], ['共', '唱', '此', '歌']]);
    const restored = parse(scoreToSource(transposeScore(score!, 2))).score!;
    expect(restored.measures.map(m => m.lyricLines)).toEqual(score!.measures.map(m => m.lyricLines));
  });

  it('leaves space for all verses across automatic wrapping and at the bottom of the SVG', () => {
    const score = parse(source).score!;
    for (const noteFontSize of [18, 32]) {
      const layout = createLayout(score, { width: 360, noteFontSize });
      expect(layout.lines.length).toBeGreaterThan(1);
      for (const [index, line] of layout.lines.entries()) {
        const lyrics = line.measures.flatMap(m => m.lyrics ?? []);
        const bottom = Math.max(...lyrics.map(lyric => lyric.y)) + noteFontSize * 0.3;
        expect(bottom).toBeLessThan(index + 1 < layout.lines.length ? layout.lines[index + 1].y : layout.height);
        const first = lyrics.find(lyric => lyric.text === '春');
        const second = lyrics.find(lyric => lyric.text === '明月');
        if (first && second) {
          expect(second.x).toBe(first.x);
          expect(second.y).toBeGreaterThan(first.y);
          expect(second.noteIndex).toBe(first.noteIndex);
        }
      }
    }
  });

  it('preserves empty earlier verses and independent duet lyrics on serialization', () => {
    const score = parse(`Q[upper] 1 2 3 4 |\nC2[upper] 上 声 部 词\nQ[lower] 5 6 7 1 |\nC[lower] 下 声 部 词\nC2[lower] 一 二 三 四`).score!;
    const restored = parse(scoreToSource(score));
    expect(restored.errors).toEqual([]);
    expect(restored.score!.measures[0].lyricLines).toEqual(score.measures[0].lyricLines);
    const layout = createLayout(restored.score!);
    const upperBottom = Math.max(...layout.lines[0].measures[0].lyrics!.map(lyric => lyric.y));
    expect(upperBottom).toBeLessThan(layout.lines[0].secondaryMeasures![0].y);
  });
});
