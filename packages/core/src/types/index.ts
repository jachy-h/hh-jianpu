// ============================================================
// as-nmn Core Type Definitions
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
  title?: string;
  key: KeyName;
  timeSignature: TimeSignature;
  /** 每分钟拍数 */
  tempo: number;
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
  dot: boolean;
  /** 连音组ID（用于渲染连音线beam），相同ID的音符共享一条横线 */
  beamGroup?: number;
  /** 此音符前是否有空格（用于连音组判断，内部使用） */
  hasSpaceBefore?: boolean;
}

/** 休止符 */
export interface Rest {
  type: 'rest';
  duration: Duration;
}

/** 延音线（连接前一个音，表示延长） */
export interface Tie {
  type: 'tie';
  duration: Duration;
}

/** 音符组内元素 */
export type NoteElement = Note | Rest | Tie;

// ---- 小节与曲谱 ----

/** 小节 */
export interface Measure {
  /** 小节编号（从 1 开始） */
  number: number;
  /** 小节内的音符序列 */
  notes: NoteElement[];
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
}

/** 小节渲染布局 */
export interface MeasureLayout {
  measure: Measure;
  x: number;
  y: number;
  width: number;
  notes: NotePosition[];
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
