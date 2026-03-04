import type { Note, NoteElement, Score, KeyName, FluteFingering } from '../types';
import type { LyricsSyllable } from '../types';
import { FLUTE_FINGERING_LOWEST_NOTE, KEY_SEMITONE_OFFSET } from '../types';

const PITCH_OFFSET: Record<number, number> = {
  1: 0, // C
  2: 2, // D
  3: 4, // E
  4: 5, // F
  5: 7, // G
  6: 9, // A
  7: 11, // B
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const PITCH_MAP: Record<string, number> = {
  'C': 1, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 2, 'Eb': 2,
  'E': 3,
  'F': 4, 'F#': 4, 'Gb': 4,
  'G': 5, 'G#': 5, 'Ab': 5,
  'A': 6, 'A#': 6, 'Bb': 6,
  'B': 7,
};

/**
 * 音符转 MIDI 编号
 * 简谱 octave=0 对应 C4 (MIDI 60)
 */
export function noteToMidi(pitch: number, octave: number): number {
  const semitone = PITCH_OFFSET[pitch] ?? 0;
  const octaveOffset = octave * 12;
  return 60 + semitone + octaveOffset;
}

export function midiToNote(midi: number): { pitch: number; octave: number; accidental?: 'sharp' | 'flat' } {
  const noteName = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 5; // MIDI 60 = C4, octave=0

  const pitch = PITCH_MAP[noteName] ?? 1;
  const accidental = noteName.includes('#') ? 'sharp' : noteName.includes('b') ? 'flat' : undefined;

  return { pitch, octave, accidental };
}

function transposeNoteElement(element: NoteElement, semitones: number): NoteElement {
  if (element.type === 'note') {
    const midi = noteToMidi(element.pitch, element.octave);
    const newMidi = midi + semitones;
    const { pitch, octave, accidental } = midiToNote(newMidi);

    return {
      ...element,
      pitch,
      octave,
      accidental,
    };
  }
  return element;
}

export function calculateSemitoneDistance(fromKey: KeyName, toKey: KeyName): number {
  const from = KEY_SEMITONE_OFFSET[fromKey];
  const to = KEY_SEMITONE_OFFSET[toKey];
  return to - from;
}

export function calculateFingeringSemitones(
  lowestPitch: number,
  lowestOctave: number,
  fingering: FluteFingering
): number {
  const currentLowestMidi = noteToMidi(lowestPitch, lowestOctave);
  const targetLowest = FLUTE_FINGERING_LOWEST_NOTE[fingering];
  const targetLowestMidi = noteToMidi(targetLowest.pitch, targetLowest.octave);

  if (currentLowestMidi >= targetLowestMidi) {
    return 0;
  }
  return targetLowestMidi - currentLowestMidi;
}

export function transposeScore(score: Score, semitones: number): Score {
  if (semitones === 0) return score;

  const newMetadata = { ...score.metadata };

  const currentKey = score.metadata.key;
  const currentKeyOffset = KEY_SEMITONE_OFFSET[currentKey];
  const newKeyOffset = currentKeyOffset + semitones;

  const keyNames: KeyName[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  const normalizedOffset = ((newKeyOffset % 12) + 12) % 12;
  let newKey: KeyName = 'C';
  for (const key of keyNames) {
    if (KEY_SEMITONE_OFFSET[key] === normalizedOffset) {
      newKey = key;
      break;
    }
  }
  newMetadata.key = newKey;

  const newMeasures = score.measures.map((measure) => ({
    ...measure,
    notes: measure.notes.map((note) => transposeNoteElement(note, semitones)),
  }));

  return {
    metadata: newMetadata,
    measures: newMeasures,
  };
}

function formatNote(note: Note): string {
  const accidental = note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : '';
  const octaveMark = note.octave > 0 ? "'".repeat(note.octave) : note.octave < 0 ? ','.repeat(-note.octave) : '';
  // base=4(四分)→0斜线, base=8(八分)→1斜线, base=16(十六分)→2斜线
  const slashes = Math.max(0, Math.log2(note.duration.base) - 2);
  const duration = slashes > 0 ? '/'.repeat(slashes) : '';
  const dot = note.dot ? '.' : '';
  return `${accidental}${note.pitch}${octaveMark}${duration}${dot}`;
}

function formatRest(element: { type: 'rest'; duration: { base: number; dots: number } }): string {
  const slashes = Math.max(0, Math.log2(element.duration.base) - 2);
  const duration = slashes > 0 ? '/'.repeat(slashes) : '';
  const dot = element.duration.dots > 0 ? '.' : '';
  return `0${duration}${dot}`;
}

/** 将歌词音节序列化回源码格式 */
function serializeLyrics(syllables: LyricsSyllable[]): string {
  return syllables.map((s) => {
    if (s.isPlaceholder) return '_';
    if (s.isGroup) return `(${s.text})`;
    return s.text;
  }).join(' ');
}

export function scoreToSource(score: Score): string {
  const lines: string[] = [];

  lines.push('---');
  if (score.metadata.title) {
    lines.push(`标题：${score.metadata.title}`);
  }
  lines.push(`调号：${score.metadata.key}`);
  lines.push(`拍号：${score.metadata.timeSignature.beats}/${score.metadata.timeSignature.beatValue}`);
  lines.push(`速度：${score.metadata.tempo}`);
  lines.push('---');
  lines.push('');

  for (const measure of score.measures) {
    let measureStr = 'Q';
    let openSlurGroup: number | undefined = undefined;

    for (const note of measure.notes) {
      let token = '';
      if (note.type === 'note') {
        token = formatNote(note);
      } else if (note.type === 'rest') {
        token = formatRest(note);
      } else if (note.type === 'tie') {
        token = '-';
      } else if (note.type === 'breath') {
        token = 'V';
      }

      if (token) {
        // 保留原始间距：hasSpaceBefore=false 表示与上一个音符紧连（共享连音线）
        const needSpace = (note as { hasSpaceBefore?: boolean }).hasSpaceBefore !== false;
        const noteSlurGroup = (note as { slurGroup?: number }).slurGroup;

        // 关闭上一个圆滑线组（slurGroup 发生变化）
        if (openSlurGroup !== undefined && noteSlurGroup !== openSlurGroup) {
          measureStr += ')';
          openSlurGroup = undefined;
        }

        // 在 token 前加空格或不加
        measureStr += needSpace ? ' ' : '';

        // 开启新的圆滑线组
        if (noteSlurGroup !== undefined && openSlurGroup === undefined) {
          measureStr += '(';
          openSlurGroup = noteSlurGroup;
        }

        measureStr += token;
      }
    }

    // 关闭小节末尾未关闭的圆滑线组
    if (openSlurGroup !== undefined) {
      measureStr += ')';
    }

    lines.push(measureStr + ' |');

    // 输出该小节的歌词行
    if (measure.lyrics && measure.lyrics.syllables.length > 0) {
      lines.push(`C ${serializeLyrics(measure.lyrics.syllables)}`);
    }
  }

  return lines.join('\n');
}
