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

/**
 * 将 Token 流解析为音符序列，按小节分组
 */
function parseBody(tokens: Token[]): { measures: Measure[]; errors: ParseError[] } {
  const measures: Measure[] = [];
  const errors: ParseError[] = [];
  let currentNotes: NoteElement[] = [];
  let measureNumber = 1;

  // 过滤掉元信息和换行 Token
  const bodyTokens = tokens.filter(
    t => !['METADATA_KEY', 'METADATA_VALUE', 'NEWLINE', 'EOF'].includes(t.type)
  );

  let i = 0;
  while (i < bodyTokens.length) {
    const token = bodyTokens[i];

    switch (token.type) {
      case 'BARLINE': {
        // 遇到小节线，保存当前小节
        if (currentNotes.length > 0) {
          measures.push({ number: measureNumber, notes: currentNotes });
          measureNumber++;
          currentNotes = [];
        }
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
          const noteResult = parseNote(bodyTokens, noteIndex);
          const note = noteResult.note;
          note.isGrace = true; // 标记为倚音
          note.hasSpaceBefore = bodyTokens[noteIndex]?.hasSpaceBefore || false;
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
    measures.push({ number: measureNumber, notes: currentNotes });
  }

  // 为所有小节识别连音组（基于空格分隔）
  assignBeamGroups(measures, bodyTokens);

  // 识别圆滑线组（基于括号）
  assignSlurGroups(measures, bodyTokens);

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
        
        // 向后查找连续的相同时值音符（无空格分隔）
        while (groupEnd + 1 < notes.length) {
          const nextNote = notes[groupEnd + 1];
          
          // 检查下一个音符是否满足连音条件
          if (nextNote.type === 'note' && 
              nextNote.duration.base === note.duration.base &&
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

  // 检查前置修饰符（必须在调用前检查）
  // 向前回溯检查低八度点、高八度单引号、升降号
  let checkIdx = i - 1;
  while (checkIdx >= 0) {
    const prevToken = tokens[checkIdx];
    if (prevToken.type === 'OCTAVE_DOWN') {
      octave--;
      checkIdx--;
    } else if (prevToken.type === 'OCTAVE_UP') {
      octave++;
      checkIdx--;
    } else if (prevToken.type === 'SHARP') {
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

  // 后置修饰符：附点
  while (i < tokens.length) {
    if (tokens[i].type === 'DOT') {
      dot = true;
      i++;
    } else {
      break;
    }
  }

  // 减时线
  const underlineResult = consumeUnderlines(tokens, i);

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
    nextIndex: underlineResult.nextIndex,
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
 * 解析简谱文本，返回 Score AST
 */
export function parse(source: string): ParseResult {
  try {
    const tokens = tokenize(source);
    const metadata = parseMetadata(tokens);
    const { measures, errors } = parseBody(tokens);

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

    return {
      score: { metadata, measures },
      errors,
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
