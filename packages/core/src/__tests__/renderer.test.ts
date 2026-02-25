import { describe, it, expect } from 'vitest';
import { createLayout } from '../renderer/index';
import type { Score } from '../types/index';

describe('Renderer', () => {
  const mockScore: Score = {
    metadata: {
      title: 'Test',
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    },
    measures: [
      {
        number: 1,
        notes: [
          { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 3, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 4, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
        ],
      },
      {
        number: 2,
        notes: [
          { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 6, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 7, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 1, octave: 1, duration: { base: 4, dots: 0 }, dot: false },
        ],
      },
    ],
  };

  it('should create layout with correct dimensions', () => {
    const layout = createLayout(mockScore, { width: 800, measuresPerLine: 4 });

    expect(layout.width).toBe(800);
    expect(layout.height).toBeGreaterThan(0);
  });

  it('should distribute measures across lines', () => {
    const layout = createLayout(mockScore, { width: 800, measuresPerLine: 2 });

    expect(layout.lines).toHaveLength(1); // 2 measures / 2 per line = 1 line
    expect(layout.lines[0].measures).toHaveLength(2);
  });

  it('should calculate note positions', () => {
    const layout = createLayout(mockScore, { width: 800, measuresPerLine: 2 });

    expect(layout.allNotes).toHaveLength(8); // 2 measures * 4 notes
    expect(layout.allNotes[0].index).toBe(0);
    expect(layout.allNotes[0].x).toBeGreaterThan(0);
    expect(layout.allNotes[0].y).toBeGreaterThan(0);
  });

  it('should assign global note indices', () => {
    const layout = createLayout(mockScore, { width: 800, measuresPerLine: 2 });

    layout.allNotes.forEach((note, idx) => {
      expect(note.index).toBe(idx);
    });
  });

  it('should handle multiple lines correctly', () => {
    const scoreWithMoreMeasures: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: Array(8).fill(null).map((_, i) => ({
        number: i + 1,
        notes: [
          { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
        ],
      })),
    };

    const layout = createLayout(scoreWithMoreMeasures, { width: 800, measuresPerLine: 2 });

    // 8 measures / 2 per line = 4 lines
    expect(layout.lines).toHaveLength(4);
    expect(layout.lines[0].measures).toHaveLength(2);
    expect(layout.lines[1].measures).toHaveLength(2);
  });

  it('should handle last line with fewer measures', () => {
    const scoreWith5Measures: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: Array(5).fill(null).map((_, i) => ({
        number: i + 1,
        notes: [
          { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
        ],
      })),
    };

    const layout = createLayout(scoreWith5Measures, { width: 800, measuresPerLine: 4 });

    // 5 measures / 4 per line = 2 lines
    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0].measures).toHaveLength(4);
    expect(layout.lines[1].measures).toHaveLength(1);
  });

  it('should calculate y positions correctly for multiple lines', () => {
    const scoreTwoLines: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: Array(4).fill(null).map((_, i) => ({
        number: i + 1,
        notes: [
          { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
        ],
      })),
    };

    const layout = createLayout(scoreTwoLines, { width: 800, measuresPerLine: 2, lineHeight: 60, lineGap: 30, marginTop: 80 });

    // First line y = marginTop = 80
    expect(layout.lines[0].y).toBe(80);
    // Second line y = marginTop + lineHeight + lineGap = 80 + 60 + 30 = 170
    expect(layout.lines[1].y).toBe(170);
  });

  it('should handle empty measures', () => {
    const scoreWithEmptyMeasure: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [],
        },
      ],
    };

    const layout = createLayout(scoreWithEmptyMeasure, { width: 800 });

    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].measures).toHaveLength(1);
    expect(layout.lines[0].measures[0].notes).toHaveLength(0);
  });

  it('should handle measures with different note counts', () => {
    const scoreWithVariedNotes: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          ],
        },
        {
          number: 2,
          notes: [
            { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            { type: 'note', pitch: 3, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            { type: 'note', pitch: 4, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithVariedNotes, { width: 800, measuresPerLine: 2 });

    expect(layout.lines[0].measures[0].notes).toHaveLength(1);
    expect(layout.lines[0].measures[1].notes).toHaveLength(3);
  });

  it('should preserve beamGroup information in layout', () => {
    const scoreWithBeamGroup: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 8, dots: 0 }, dot: false, beamGroup: 1 },
            { type: 'note', pitch: 2, octave: 0, duration: { base: 8, dots: 0 }, dot: false, beamGroup: 1 },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithBeamGroup, { width: 800 });

    expect(layout.allNotes[0].beamGroup).toBe(1);
    expect(layout.allNotes[1].beamGroup).toBe(1);
  });

  it('should preserve slurGroup information in layout', () => {
    const scoreWithSlurGroup: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false, slurGroup: 1 },
            { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false, slurGroup: 1 },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithSlurGroup, { width: 800 });

    expect(layout.allNotes[0].slurGroup).toBe(1);
    expect(layout.allNotes[1].slurGroup).toBe(1);
  });

  it('should handle rests in layout', () => {
    const scoreWithRest: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            { type: 'rest', duration: { base: 4, dots: 0 } },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithRest, { width: 800 });

    expect(layout.allNotes).toHaveLength(2);
    expect(layout.allNotes[0].note.type).toBe('note');
    expect(layout.allNotes[1].note.type).toBe('rest');
  });

  it('should handle ties in layout', () => {
    const scoreWithTie: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            { type: 'tie', duration: { base: 4, dots: 0 } },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithTie, { width: 800 });

    expect(layout.allNotes).toHaveLength(2);
    expect(layout.allNotes[0].note.type).toBe('note');
    expect(layout.allNotes[1].note.type).toBe('tie');
  });

  it('should handle grace notes in layout', () => {
    const scoreWithGrace: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, isGrace: true, graceType: 'long', duration: { base: 8, dots: 0 }, dot: false },
            { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithGrace, { width: 800 });

    expect(layout.allNotes).toHaveLength(2);
    expect((layout.allNotes[0].note as any).isGrace).toBe(true);
  });

  it('should handle breath marks in layout', () => {
    const scoreWithBreath: Score = {
      metadata: {
        key: 'C',
        timeSignature: { beats: 4, beatValue: 4 },
        tempo: 120,
      },
      measures: [
        {
          number: 1,
          notes: [
            { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            { type: 'breath' },
          ],
        },
      ],
    };

    const layout = createLayout(scoreWithBreath, { width: 800 });

    expect(layout.allNotes).toHaveLength(2);
    expect(layout.allNotes[1].note.type).toBe('breath');
  });

  describe('Lyrics Positioning', () => {
    it('should calculate lyrics positions for basic lyrics', () => {
      const scoreWithLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
            lyrics: {
              syllables: [
                { text: '一', isPlaceholder: false, isGroup: false },
                { text: '二', isPlaceholder: false, isGroup: false },
              ],
            },
          },
        ],
      };

      const layout = createLayout(scoreWithLyrics, { width: 800, lineHeight: 60, lyricsOffset: 10 });

      expect(layout.lines[0].measures[0].lyrics).toBeDefined();
      expect(layout.lines[0].measures[0].lyrics).toHaveLength(2);
      expect(layout.lines[0].measures[0].lyrics![0].text).toBe('一');
      expect(layout.lines[0].measures[0].lyrics![0].y).toBe(80 + 60 + 10); // lineY + lineHeight + lyricsOffset
    });

    it('should calculate lyrics positions for placeholder lyrics', () => {
      const scoreWithPlaceholderLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
            lyrics: {
              syllables: [
                { text: '一', isPlaceholder: false, isGroup: false },
                { text: '', isPlaceholder: true, isGroup: false },
              ],
            },
          },
        ],
      };

      const layout = createLayout(scoreWithPlaceholderLyrics, { width: 800 });

      expect(layout.lines[0].measures[0].lyrics).toHaveLength(2);
      expect(layout.lines[0].measures[0].lyrics![0].isPlaceholder).toBe(false);
      expect(layout.lines[0].measures[0].lyrics![1].isPlaceholder).toBe(true);
    });

    it('should calculate lyrics positions for grouped lyrics', () => {
      const scoreWithGroupedLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
              { type: 'note', pitch: 2, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
            lyrics: {
              syllables: [
                { text: '我的', isPlaceholder: false, isGroup: true },
                { text: '二', isPlaceholder: false, isGroup: false },
              ],
            },
          },
        ],
      };

      const layout = createLayout(scoreWithGroupedLyrics, { width: 800 });

      expect(layout.lines[0].measures[0].lyrics).toHaveLength(2);
      expect(layout.lines[0].measures[0].lyrics![0].isGroup).toBe(true);
      expect(layout.lines[0].measures[0].lyrics![0].text).toBe('我的');
    });

    it('should skip grace notes when positioning lyrics', () => {
      const scoreWithGraceAndLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, isGrace: true, graceType: 'long', duration: { base: 8, dots: 0 }, dot: false },
              { type: 'note', pitch: 5, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
            lyrics: {
              syllables: [
                { text: '一', isPlaceholder: false, isGroup: false },
              ],
            },
          },
        ],
      };

      const layout = createLayout(scoreWithGraceAndLyrics, { width: 800 });

      // 歌词应该只分配给非倚音的音符
      expect(layout.lines[0].measures[0].lyrics).toHaveLength(1);
      expect(layout.lines[0].measures[0].lyrics![0].noteIndex).toBe(1); // 第二个音符（非倚音）
    });

    it('should handle measures without lyrics', () => {
      const scoreWithoutLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
          },
        ],
      };

      const layout = createLayout(scoreWithoutLyrics, { width: 800 });

      expect(layout.lines[0].measures[0].lyrics).toBeUndefined();
    });

    it('should handle empty lyrics syllables', () => {
      const scoreWithEmptyLyrics: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: [
          {
            number: 1,
            notes: [
              { type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false },
            ],
            lyrics: {
              syllables: [],
            },
          },
        ],
      };

      const layout = createLayout(scoreWithEmptyLyrics, { width: 800 });

      expect(layout.lines[0].measures[0].lyrics).toBeUndefined();
    });
  });

  describe('Custom Layout Config', () => {
    it('should use custom note spacing', () => {
      const layout = createLayout(mockScore, { width: 800, noteSpacing: 60 });

      expect(layout.allNotes[0].x).toBeGreaterThan(40); // marginLeft
    });

    it('should use custom margin left', () => {
      const layout = createLayout(mockScore, { width: 800, marginLeft: 60 });

      expect(layout.allNotes[0].x).toBeGreaterThan(60);
    });

    it('should use custom margin top', () => {
      const layout = createLayout(mockScore, { width: 800, marginTop: 100 });

      expect(layout.lines[0].y).toBe(100);
    });

    it('should use custom line gap', () => {
      const scoreTwoLines: Score = {
        metadata: {
          key: 'C',
          timeSignature: { beats: 4, beatValue: 4 },
          tempo: 120,
        },
        measures: Array(4).fill(null).map((_, i) => ({
          number: i + 1,
          notes: [{ type: 'note', pitch: 1, octave: 0, duration: { base: 4, dots: 0 }, dot: false }],
        })),
      };

      const layout = createLayout(scoreTwoLines, { width: 800, measuresPerLine: 2, lineGap: 50, marginTop: 80, lineHeight: 60 });

      expect(layout.lines[1].y).toBe(80 + 60 + 50); // marginTop + lineHeight + lineGap
    });
  });
});
