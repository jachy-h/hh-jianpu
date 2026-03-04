// ============================================================
// hh-jianpu Core Type Definitions
// 简谱数据模型 — 从文本到 AST 的类型系统
// ============================================================

// ---- 元信息 ----

/** 音调名 */
export type KeyName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
  | 'Db' | 'Eb' | 'Gb' | 'Ab' | 'Bb'
  | 'C#' | 'D#' | 'F#' | 'G#' | 'A#';

/** 拍号 */
export interface TimeSignature {
  /** 每小节拍数 */
  beats: number;
  /** 几分音符为一拍 */
  beatValue: number;
}

/** 曲谱元信息 */
export interface Metadata {
  /** 标题（基础元信息） */
  title?: string;
  /** 调号（基础元信息） */
  key: KeyName;
  /** 拍号（基础元信息） */
  timeSignature: TimeSignature;
  /** 速度（基础元信息） */
  tempo: number;
  /** 扩展元信息（任意 key: value 形式，除了基础元信息外的所有字段） */
  custom?: Record<string, string>;
}

// ---- 音符与时值 ----

/** 基础时值：全音符=1, 二分=2, 四分=4, 八分=8, 十六分=16 */
export type BaseDuration = 1 | 2 | 4 | 8 | 16;

/** 时值 */
export interface Duration {
  /** 基础时值 */
  base: BaseDuration;
  /** 附点数量（0=无附点, 1=单附点, 2=双附点） */
  dots: number;
}

/** 变音记号 */
export type Accidental = 'sharp' | 'flat' | 'natural';

/** 音符（发声） */
export interface Note {
  type: 'note';
  /** 音级 1-7 (do-si) */
  pitch: number;
  /** 八度偏移: -2, -1(低), 0(中), 1(高), 2 */
  octave: number;
  /** 变音记号 */
  accidental?: Accidental;
  /** 时值 */
  duration: Duration;
  /** 是否附点 */
  dot: boolean;  /** 是否为倚音（装饰音） */
  isGrace?: boolean;
  /** 倚音类型：short=短倚音（双下划线），long=长倚音（单下划线） */
  graceType?: 'short' | 'long';
  /** 波音类型：single=单波音(~)，double=复波音(~~)，lower=下波音(~.) */
  trillType?: 'single' | 'double' | 'lower';
  /** 连音组ID（用于渲染连音线beam），相同ID的音符共享一条横线 */
  beamGroup?: number;
  /** 圆滑线组ID（用于渲染圆滑线slur），相同ID的音符共享一条弧线 */
  slurGroup?: number;
  /** 此音符前是否有空格（用于连音组判断，内部使用） */
  hasSpaceBefore?: boolean;
}

/** 休止符 */
export interface Rest {
  type: 'rest';
  duration: Duration;
  /** 连音组ID（用于渲染连音线beam） */
  beamGroup?: number;
  /** 此音符前是否有空格（用于连音组判断，内部使用） */
  hasSpaceBefore?: boolean;
}

/** 延音线（连接前一个音，表示延长） */
export interface Tie {
  type: 'tie';
  duration: Duration;
}

/** 换气记号 */
export interface Breath {
  type: 'breath';
}

/** 音符组内元素 */
export type NoteElement = Note | Rest | Tie | Breath;

// ---- 歌词 ----

/** 歌词片段（对应一个音符） */
export interface LyricsSyllable {
  /** 歌词文字（可能是单字、多字分组、或占位符） */
  text: string;
  /** 是否为占位符（对应无词音符，如休止符、前奏） */
  isPlaceholder: boolean;
  /** 是否为分组（多字一音） */
  isGroup: boolean;
}

/** 小节的歌词 */
export interface MeasureLyrics {
  /** 歌词片段数组，与该小节的有效音符一一对应 */
  syllables: LyricsSyllable[];
}

// ---- 小节与曲谱 ----

/** 小节 */
export interface Measure {
  /** 小节编号（从 1 开始） */
  number: number;
  /** 小节内的音符序列 */
  notes: NoteElement[];
  /** 可选的歌词 */
  lyrics?: MeasureLyrics;
  /** 小节在源文本中的字节范围（不含两侧 | 线），供编辑器错误标注使用 */
  sourceRange?: { from: number; to: number };
}

/** 完整曲谱 AST */
export interface Score {
  metadata: Metadata;
  measures: Measure[];
}

// ---- 解析错误 ----

/** 源码位置 */
export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

/** 解析错误 */
export interface ParseError {
  message: string;
  position: SourcePosition;
  length: number;
}

/** 解析结果 */
export interface ParseResult {
  score: Score | null;
  errors: ParseError[];
}

// ---- 播放状态 ----

/** 播放状态 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused';

/** 播放配置 */
export interface PlaybackConfig {
  tempo: number;
  startMeasure?: number;
  endMeasure?: number;
  loop: boolean;
}

/** 播放状态 */
export interface PlaybackState {
  status: PlaybackStatus;
  /** 当前播放的音符在扁平化序列中的索引 */
  currentNoteIndex: number;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 当前 BPM */
  tempo: number;
}

// ---- 渲染布局 ----

/** 音符渲染位置 */
export interface NotePosition {
  /** 在扁平化音符序列中的索引（用于高亮定位） */
  index: number;
  /** SVG x 坐标 */
  x: number;
  /** SVG y 坐标 */
  y: number;
  /** 对应的音符数据 */
  note: NoteElement;
  /** 所属小节编号 */
  measureNumber: number;
  /** 连音组编号（用于渲染连音线 beam），相同编号的音符共享一条横线 */
  beamGroup?: number;
  /** 圆滑线组编号（用于渲染圆滑线 slur），相同编号的音符共享一条弧线 */
  slurGroup?: number;
}

/** 歌词渲染位置 */
export interface LyricsPosition {
  /** 歌词文字 */
  text: string;
  /** SVG x 坐标 */
  x: number;
  /** SVG y 坐标 */
  y: number;
  /** 是否为占位符 */
  isPlaceholder: boolean;
  /** 是否为分组（多字一音） */
  isGroup: boolean;
  /** 对应的音符在扁平化序列中的索引 */
  noteIndex: number;
}

/** 小节渲染布局 */
export interface MeasureLayout {
  measure: Measure;
  x: number;
  y: number;
  width: number;
  notes: NotePosition[];
  /** 可选的歌词位置 */
  lyrics?: LyricsPosition[];
}

/** 行布局 */
export interface LineLayout {
  measures: MeasureLayout[];
  y: number;
  height: number;
}

/** 整体布局 */
export interface ScoreLayout {
  width: number;
  height: number;
  lines: LineLayout[];
  allNotes: NotePosition[];
}

// ============================================================
// 笛子指法类型
// ============================================================

/** 笛子指法（筒音作X） */
export type FluteFingering = '5' | '2' | '1' | '6';

/** 笛子指法最低音对应表（低音区，即简谱一个点） */
export const FLUTE_FINGERING_LOWEST_NOTE: Record<FluteFingering, { pitch: number; octave: number }> = {
  '5': { pitch: 5, octave: -1 }, // 筒音作5：最低 5,（低音5）
  '2': { pitch: 2, octave: -1 }, // 筒音作2：最低 2,（低音2）
  '1': { pitch: 1, octave: -1 }, // 筒音作1：最低 1,（低音1）
  '6': { pitch: 6, octave: -1 }, // 筒音作6：最低 6,（低音6）
};

/** 调号半音偏移表 */
export const KEY_SEMITONE_OFFSET: Record<KeyName, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};
