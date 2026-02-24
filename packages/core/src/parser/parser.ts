// ============================================================
// Parser — 将 Token 流解析为 Score AST
// ============================================================

import { tokenize, type Token } from './tokenizer.js';
import type {
  Score,
  Metadata,
  Measure,
  NoteElement,
  Note,
  Rest,
  Tie,
  Breath,
  Duration,
  KeyName,
  TimeSignature,
  ParseError,
  ParseResult,
  LyricsSyllable,
  MeasureLyrics,
} from '../types/index.js';

/** 默认元信息 */
const DEFAULT_METADATA: Metadata = {
  key: 'C',
  timeSignature: { beats: 4, beatValue: 4 },
  tempo: 120,
};

/**
 * 解析元信息 Token 对
 */
function parseMetadata(tokens: Token[]): Metadata {
  const metadata: Metadata = { ...DEFAULT_METADATA };

  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'METADATA_KEY' && tokens[i + 1].type === 'METADATA_VALUE') {
      const key = tokens[i].value;
      const value = tokens[i + 1].value;

      switch (key) {
        case '标题':
        case 'title':
          metadata.title = value;
          break;
        case '调号':
        case 'key':
          metadata.key = value as KeyName;
          break;
        case '拍号':
        case 'time': {
          const match = value.match(/^(\d+)\/(\d+)$/);
          if (match) {
            metadata.timeSignature = {
              beats: parseInt(match[1], 10),
              beatValue: parseInt(match[2], 10),
            };
          }
          break;
        }
        case '速度':
        case 'tempo':
          metadata.tempo = parseInt(value, 10) || 120;
          break;
      }
      i++; // 跳过 value token
    }
  }

  return metadata;
}

// ============================================================
// Lyrics 解析函数
// ============================================================

/**
 * 解析歌词文本为音节数组
 * 支持：单字、分组(多字)、占位符_、延长符-
 * 
 * @example
 * parseLyrics("一 闪 (我的) _ -") → [
 *   { text: "一", isPlaceholder: false, isGroup: false },
 *   { text: "闪", isPlaceholder: false, isGroup: false },
 *   { text: "我的", isPlaceholder: false, isGroup: true },
 *   { text: "", isPlaceholder: true, isGroup: false },
 *   { text: "", isPlaceholder: true, isGroup: false }
 * ]
 */
function parseLyrics(lyricsText: string): LyricsSyllable[] {
  const syllables: LyricsSyllable[] = [];
  let i = 0;
  
  while (i < lyricsText.length) {
    const ch = lyricsText[i];
    
    // 跳过空格
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }
    
    // 分组 (多字)
    if (ch === '(') {
      const closeIdx = lyricsText.indexOf(')', i);
      if (closeIdx === -1) {
        // 未闭合，提取到结尾
        const text = lyricsText.substring(i + 1).trim();
        syllables.push({ text, isPlaceholder: false, isGroup: true });
        break;
      }
      const text = lyricsText.substring(i + 1, closeIdx).trim();
      syllables.push({ text, isPlaceholder: false, isGroup: true });
      i = closeIdx + 1;
      continue;
    }
    
    // 占位符 _
    if (ch === '_') {
      syllables.push({ text: '', isPlaceholder: true, isGroup: false });
      i++;
      continue;
    }
    
    // 普通单字
    syllables.push({ text: ch, isPlaceholder: false, isGroup: false });
    i++;
  }
  
  return syllables;
}

/**
 * 将歌词关联到小节
 * 
 * @param measures 已解析的小节数组
 * @param lyricsTokens 歌词相关 Token 数组 [{LYRICS_MARKER, LYRICS_TEXT}, ...]
 * @returns 错误数组
 */
function associateLyricsToMeasures(
  measures: Measure[],
  lyricsTokens: Token[]
): ParseError[] {
  const errors: ParseError[] = [];
  
  // 提取所有歌词文本行
  const lyricsLines: Array<{ syllables: LyricsSyllable[]; line: number }> = [];
  for (let i = 0; i < lyricsTokens.length; i++) {
    if (lyricsTokens[i].type === 'LYRICS_MARKER') {
      const nextToken = lyricsTokens[i + 1];
      if (nextToken && nextToken.type === 'LYRICS_TEXT') {
        const syllables = parseLyrics(nextToken.value);
        lyricsLines.push({ syllables, line: nextToken.line });
      }
    }
  }
  
  if (lyricsLines.length === 0) {
    return errors;
  }
  
  // 将所有歌词合并为一个数组
  const allSyllables: LyricsSyllable[] = [];
  lyricsLines.forEach(({ syllables }) => allSyllables.push(...syllables));
  
  // 关联歌词到小节
  let syllableIndex = 0;
  for (const measure of measures) {
    const measureSyllables: LyricsSyllable[] = [];
    
    for (const note of measure.notes) {
      if (note.type === 'note' && !note.isGrace) {
        if (syllableIndex < allSyllables.length) {
          measureSyllables.push(allSyllables[syllableIndex]);
          syllableIndex++;
        }
      }
    }
    
    if (measureSyllables.length > 0) {
      measure.lyrics = { syllables: measureSyllables };
    }
  }
  
  return errors;
}

/**
 * 将 Token 流解析为音符序列，按小节分组
 */
function parseBody(tokens: Token[]): { measures: Measure[]; errors: ParseError[] } {
  const measures: Measure[] = [];
  const errors: ParseError[] = [];
  let currentNotes: NoteElement[] = [];
  let measureNumber = 1;

  // 过滤掉元信息和换行 Token，但保留歌词 Token
  const lyricsTokens = tokens.filter(
    t => t.type === 'LYRICS_MARKER' || t.type === 'LYRICS_TEXT'
  );
  
  const bodyTokens = tokens.filter(
    t => !['METADATA_KEY', 'METADATA_VALUE', 'NEWLINE', 'EOF', 'MELODY_MARKER', 'LYRICS_MARKER', 'LYRICS_TEXT'].includes(t.type)
  );

  // 追踪当前小节起始 offset（不含 | 线自身）
  let measureStartOffset = bodyTokens[0]?.offset ?? 0;
  let i = 0;
  while (i < bodyTokens.length) {
    const token = bodyTokens[i];

    switch (token.type) {
      case 'BARLINE': {
        // 遇到小节线，保存当前小节
        if (currentNotes.length > 0) {
          measures.push({
            number: measureNumber,
            notes: currentNotes,
            sourceRange: { from: measureStartOffset, to: token.offset },
          });
          measureNumber++;
          currentNotes = [];
        }
        // 下一小节从 | 之后开始
        measureStartOffset = token.offset + token.value.length;
        i++;
        break;
      }

      case 'GRACE_PREFIX': {
        // 跳过倚音前缀，找到下一个音符并标记为倚音
        i++;
        // 跳过可能的前置修饰符（八度、升降号）直到找到音符
        let foundNote = false;
        let noteIndex = i;
        while (noteIndex < bodyTokens.length) {
          const nextToken = bodyTokens[noteIndex];
          if (nextToken.type === 'NOTE') {
            foundNote = true;
            break;
          } else if (['OCTAVE_UP', 'OCTAVE_DOWN', 'SHARP', 'FLAT'].includes(nextToken.type)) {
            // 前置修饰符，继续查找
            noteIndex++;
          } else {
            // 遇到其他token，停止查找
            break;
          }
        }
        
        if (foundNote) {
          // 先检查音符后的下划线数量（在 parseNote 消耗它们之前）
          let peekIndex = noteIndex + 1; // 音符的下一个 token
          let underlineCount = 0;
          
          // 计数连续的下划线
          while (peekIndex < bodyTokens.length && bodyTokens[peekIndex].type === 'UNDERLINE') {
            underlineCount++;
            peekIndex++;
          }
          
          const noteResult = parseNote(bodyTokens, noteIndex);
          const note = noteResult.note;
          note.isGrace = true; // 标记为倚音
          note.hasSpaceBefore = bodyTokens[noteIndex]?.hasSpaceBefore || false;
          
          // 根据下划线数量判断类型
          if (underlineCount === 1) {
            // 单减时线：长帚音
            note.graceType = 'long';
          } else if (underlineCount >= 2) {
            // 双减时线：短帚音
            note.graceType = 'short';
          } else {
            // 无减时线：错误，倚音必须有减时线
            errors.push({
              message: `倚音必须有减时线标记：长倚音用 ^音符/ ，短倚音用 ^音符//`,
              position: { line: token.line, column: token.column, offset: token.offset },
              length: 1,
            });
            note.graceType = 'long'; // 默认为长倚音
          }
          
          currentNotes.push(note);
          i = noteResult.nextIndex;
        } else {
          // 如果^后面没有找到音符，报错
          errors.push({
            message: `倚音标记 ^ 后面必须跟随音符`,
            position: { line: token.line, column: token.column, offset: token.offset },
            length: 1,
          });
          i++;
        }
        break;
      }

      case 'NOTE': {
        const noteResult = parseNote(bodyTokens, i);
        const note = noteResult.note;
        // 记录空格信息
        note.hasSpaceBefore = bodyTokens[i]?.hasSpaceBefore || false;
        
        // 检查音符前是否有波音标记
        let trillCount = 0;
        let hasDotBeforeTrill = false;
        let checkIdx = i - 1;
        
        // 向前查找波音标记
        // 顺序应该是：NOTE <- [DOT] <- TRILL [TRILL ...]
        while (checkIdx >= 0) {
          const prevToken = bodyTokens[checkIdx];
          if (prevToken.type === 'DOT') {
            // 遇到点号，记录下来，继续向前找 TRILL
            if (trillCount === 0) {
              hasDotBeforeTrill = true;
            }
            checkIdx--;
          } else if (prevToken.type === 'TRILL') {
            trillCount++;
            checkIdx--;
          } else if (prevToken.type === 'OCTAVE_UP' || prevToken.type === 'OCTAVE_DOWN' || 
                     prevToken.type === 'SHARP' || prevToken.type === 'FLAT') {
            // 跳过修饰符
            checkIdx--;
          } else {
            break;
          }
        }
        
        // 设置波音类型
        if (trillCount > 0) {
          if (hasDotBeforeTrill) {
            note.trillType = 'lower'; // 下波音 ~.
          } else if (trillCount === 1) {
            note.trillType = 'single'; // 单波音 ~
          } else {
            note.trillType = 'double'; // 复波音 ~~
          }
        }
        
        currentNotes.push(note);
        i = noteResult.nextIndex;
        break;
      }

      case 'REST': {
        const rest: Rest = {
          type: 'rest',
          duration: { base: 4, dots: 0 },
        };
        currentNotes.push(rest);
        i++;
        // 检查后续减时线
        const underlineResult = consumeUnderlines(bodyTokens, i);
        rest.duration.base = underlineResult.base;
        i = underlineResult.nextIndex;
        break;
      }

      case 'TIE': {
        const tie: Tie = {
          type: 'tie',
          duration: { base: 4, dots: 0 },
        };
        currentNotes.push(tie);
        i++;
        break;
      }

      case 'BREATH': {
        const breath: Breath = {
          type: 'breath',
        };
        currentNotes.push(breath);
        i++;
        break;
      }

      case 'ERROR': {
        errors.push({
          message: `未识别的字符: "${token.value}"`,
          position: { line: token.line, column: token.column, offset: token.offset },
          length: 1,
        });
        i++;
        break;
      }

      case 'SLUR_START':
      case 'SLUR_END':
        // 圆滑线括号在后续统一处理
        i++;
        break;

      default:
        i++;
        break;
    }
  }

  // 最后一个小节
  if (currentNotes.length > 0) {
    const lastBodyToken = bodyTokens[bodyTokens.length - 1];
    const measureEnd = lastBodyToken
      ? lastBodyToken.offset + lastBodyToken.value.length
      : measureStartOffset;
    measures.push({
      number: measureNumber,
      notes: currentNotes,
      sourceRange: { from: measureStartOffset, to: measureEnd },
    });
  }

  // 为所有小节识别连音组（基于空格分隔）
  assignBeamGroups(measures, bodyTokens);

  // 识别圆滑线组（基于括号）
  assignSlurGroups(measures, bodyTokens);

  // 关联歌词到小节
  const lyricsErrors = associateLyricsToMeasures(measures, lyricsTokens);
  errors.push(...lyricsErrors);

  return { measures, errors };
}

/**
 * 识别并标记连音组
 * 规则：相邻的八分音符（duration.base >= 8），且中间没有空格，属于同一个连音组
 */
function assignBeamGroups(measures: Measure[], tokens: Token[]): void {
  let globalBeamGroupId = 0;
  
  for (const measure of measures) {
    const notes = measure.notes;
    let i = 0;
    
    while (i < notes.length) {
      const note = notes[i];
      
      // 只处理普通音符且是八分音符及更短
      if (note.type === 'note' && note.duration.base >= 8) {
        // 找到当前连音组的范围
        const groupStart = i;
        let groupEnd = i;
        
        // 向后查找连续的八分音符及更短音符（无空格分隔，允许不同时值）
        while (groupEnd + 1 < notes.length) {
          const nextNote = notes[groupEnd + 1];
          
          // 检查下一个音符是否满足连音条件：
          // - 是普通音符
          // - base >= 8（八分音符及更短，即有减时线）
          // - 前面没有空格
          if (nextNote.type === 'note' && 
              nextNote.duration.base >= 8 &&
              !nextNote.hasSpaceBefore) { // 前面没有空格才连接
            groupEnd++;
          } else {
            break; // 有空格或不满足条件，断开连音组
          }
        }
        
        // 如果找到至少2个音符，分配连音组ID
        if (groupEnd > groupStart) {
          globalBeamGroupId++;
          for (let j = groupStart; j <= groupEnd; j++) {
            const noteInGroup = notes[j];
            if (noteInGroup.type === 'note') {
              noteInGroup.beamGroup = globalBeamGroupId;
            }
          }
        }
        
        i = groupEnd + 1;
      } else {
        i++;
      }
    }
  }
}

/**
 * 识别并标记圆滑线组
 * 规则：括号 () 内的所有音符属于同一个圆滑线组，可以跨小节
 */
function assignSlurGroups(measures: Measure[], tokens: Token[]): void {
  let globalSlurGroupId = 0;
  let slurDepth = 0; // 当前嵌套深度（支持嵌套括号）
  let currentSlurGroupId = 0;
  let noteIndex = 0; // 当前处理到第几个音符

  // 扁平化所有音符用于标记
  const allNotes: Note[] = [];
  for (const measure of measures) {
    for (const note of measure.notes) {
      if (note.type === 'note') {
        allNotes.push(note);
      }
    }
  }

  // 遍历 tokens，根据括号标记音符
  let currentNoteIdx = 0;
  for (const token of tokens) {
    if (token.type === 'SLUR_START') {
      slurDepth++;
      if (slurDepth === 1) {
        // 新的圆滑线组开始
        globalSlurGroupId++;
        currentSlurGroupId = globalSlurGroupId;
      }
    } else if (token.type === 'SLUR_END') {
      slurDepth--;
      if (slurDepth === 0) {
        currentSlurGroupId = 0;
      }
    } else if (token.type === 'NOTE' && currentSlurGroupId > 0) {
      // 在圆滑线组内的音符，标记 slurGroup
      if (currentNoteIdx < allNotes.length) {
        allNotes[currentNoteIdx].slurGroup = currentSlurGroupId;
      }
      currentNoteIdx++;
    } else if (token.type === 'NOTE') {
      // 不在圆滑线组内的音符，跳过
      currentNoteIdx++;
    }
  }
}

/**
 * 解析一个音符及其修饰符（八度、升降、减时线、附点）
 */
function parseNote(tokens: Token[], startIndex: number): { note: Note; nextIndex: number } {
  let i = startIndex;
  let octave = 0;
  let accidental: Note['accidental'] = undefined;
  let dot = false;

  // 检查前置修饰符（升降号）
  // 向前回溯检查升降号
  let checkIdx = i - 1;
  while (checkIdx >= 0) {
    const prevToken = tokens[checkIdx];
    if (prevToken.type === 'SHARP') {
      accidental = 'sharp';
      break;
    } else if (prevToken.type === 'FLAT') {
      accidental = 'flat';
      break;
    } else if (prevToken.type === 'BARLINE' || prevToken.type === 'NOTE' || prevToken.type === 'REST') {
      break;
    } else {
      checkIdx--;
    }
  }

  // 当前 token 是 NOTE
  const pitch = parseInt(tokens[i].value, 10);
  i++;

  // 后置修饰符：八度标记、附点（减时线前）
  while (i < tokens.length) {
    if (tokens[i].type === 'OCTAVE_UP') {
      octave++;
      i++;
    } else if (tokens[i].type === 'OCTAVE_DOWN') {
      octave--;
      i++;
    } else if (tokens[i].type === 'DOT') {
      dot = true;
      i++;
    } else {
      break;
    }
  }

  // 减时线
  const underlineResult = consumeUnderlines(tokens, i);
  i = underlineResult.nextIndex;

  // 后置修饰符：八度标记（减时线后）
  // 支持 5,/ 和 5/, 两种写法；也支持附点在减时线后（6/.）
  while (i < tokens.length) {
    if (tokens[i].type === 'OCTAVE_UP') {
      octave++;
      i++;
    } else if (tokens[i].type === 'OCTAVE_DOWN') {
      octave--;
      i++;
    } else if (tokens[i].type === 'DOT') {
      dot = true;
      i++;
    } else {
      break;
    }
  }

  const duration: Duration = {
    base: underlineResult.base,
    dots: dot ? 1 : 0,
  };

  return {
    note: {
      type: 'note',
      pitch,
      octave,
      accidental,
      duration,
      dot,
    },
    nextIndex: i,
  };
}

/**
 * 消费连续的减时线，返回对应的基础时值
 * 无下划线=四分音符(4)，一个=八分(8)，两个=十六分(16)
 */
function consumeUnderlines(tokens: Token[], startIndex: number): { base: 1 | 2 | 4 | 8 | 16; nextIndex: number } {
  let i = startIndex;
  let underlineCount = 0;

  while (i < tokens.length && tokens[i].type === 'UNDERLINE') {
    underlineCount++;
    i++;
  }

  let base: 1 | 2 | 4 | 8 | 16 = 4; // 默认四分音符
  if (underlineCount === 1) base = 8;
  if (underlineCount >= 2) base = 16;

  return { base, nextIndex: i };
}

/**
 * 计算音符的时值（以"拍"为单位）
 */
function calculateBeats(note: NoteElement, beatValue: number): number {
  // 换气记号不占时间
  if (note.type === 'breath') {
    return 0;
  }

  const { base, dots } = note.duration;
  
  // 倚音不占独立时间
  if (note.type === 'note' && note.isGrace) {
    return 0;
  }

  // 基础时值：beatValue/base
  // 例如 4/4 拍中，beatValue=4
  // 四分音符(base=4): 4/4 = 1 拍
  // 八分音符(base=8): 4/8 = 0.5 拍
  // 二分音符(base=2): 4/2 = 2 拍
  let beats = beatValue / base;

  // 附点延长 50%
  if (dots > 0) {
    beats *= (1 + 0.5 * dots);
  }

  return beats;
}

/**
 * 验证小节时值是否符合拍号
 */
function validateMeasureBeats(
  measures: Measure[],
  timeSignature: TimeSignature
): ParseError[] {
  const errors: ParseError[] = [];
  const expectedBeats = timeSignature.beats;
  const beatValue = timeSignature.beatValue;

  for (const measure of measures) {
    let totalBeats = 0;
    
    for (const note of measure.notes) {
      totalBeats += calculateBeats(note, beatValue);
    }

    // 允许小数误差（浮点运算）
    const diff = Math.abs(totalBeats - expectedBeats);
    if (diff > 0.001) {
      errors.push({
        message: `小节 ${measure.number} 时值不符：期望 ${expectedBeats} 拍，实际 ${totalBeats.toFixed(2)} 拍`,
        position: { line: 1, column: 0, offset: measure.sourceRange?.from ?? 0 },
        length: (measure.sourceRange?.to ?? 0) - (measure.sourceRange?.from ?? 0),
      });
    }
  }

  return errors;
}

/**
 * 解析简谱文本，返回 Score AST
 */
export function parse(source: string): ParseResult {
  try {
    const tokens = tokenize(source);
    const metadata = parseMetadata(tokens);
    const { measures, errors: parseErrors } = parseBody(tokens);

    if (measures.length === 0) {
      return {
        score: null,
        errors: [
          {
            message: '未找到任何音符',
            position: { line: 1, column: 1, offset: 0 },
            length: 0,
          },
        ],
      };
    }

    // 验证小节时值
    const beatErrors = validateMeasureBeats(measures, metadata.timeSignature);

    return {
      score: { metadata, measures },
      errors: [...parseErrors, ...beatErrors],
    };
  } catch (err) {
    return {
      score: null,
      errors: [
        {
          message: `解析失败: ${(err as Error).message}`,
          position: { line: 1, column: 1, offset: 0 },
          length: 0,
        },
      ],
    };
  }
}
