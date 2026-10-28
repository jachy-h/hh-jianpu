// ============================================================
// Parser — 将 Token 流解析为 Score AST
// ============================================================

import { tokenize, type Token } from './tokenizer.js';
import type {
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
  const customFields: Record<string, string> = {};

  // 基础元信息的 key（中英文）
  const baseKeys = new Set(['title', 'key', 'time', 'tempo', '标题', '调号', '拍号', '速度']);

  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'METADATA_KEY' && tokens[i + 1].type === 'METADATA_VALUE') {
      const key = tokens[i].value;
      const lowerKey = key.toLowerCase();
      const value = tokens[i + 1].value;

      switch (lowerKey) {
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
        default:
          // 所有非基础元信息都存入 custom
          if (!baseKeys.has(lowerKey)) {
            customFields[key] = value;
          }
          break;
      }
      i++; // 跳过 value token
    }
  }

  // 如果有自定义字段，添加到 metadata
  if (Object.keys(customFields).length > 0) {
    metadata.custom = customFields;
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
  
  // 同一段号的 C 行继续拼接，不同段号从曲首独立配词。
  const verses = new Map<number, LyricsSyllable[]>();
  for (let i = 0; i < lyricsTokens.length; i++) {
    const marker = lyricsTokens[i];
    if (marker.type !== 'LYRICS_MARKER') continue;
    const text = lyricsTokens[i + 1];
    if (text?.type !== 'LYRICS_TEXT') continue;
    const verse = marker.lyricVerse ?? 1;
    verses.set(verse, [...(verses.get(verse) ?? []), ...parseLyrics(text.value)]);
  }
  const verseCount = Math.max(1, ...verses.keys());
  const cursors = Array<number>(verseCount).fill(0);
  for (const measure of measures) {
    const count = measure.notes.filter(note => note.type === 'note' && !note.isGrace).length;
    const rows = Array.from({ length: verseCount }, (_, index) => {
      const syllables = (verses.get(index + 1) ?? []).slice(cursors[index], cursors[index] + count);
      cursors[index] += count;
      return { syllables };
    });
    if (rows[0].syllables.length) measure.lyrics = rows[0];
    if (verseCount > 1) measure.lyricLines = rows;
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
  let pendingRepeatStart: Token | undefined;
  let openRepeat: Token | undefined;
  const articulationPositions = new Map<Note, Token>();
  const reportRepeat = (token: Token, message: string): void => {
    errors.push({ message, position: { line: token.line, column: token.column, offset: token.offset }, length: token.value.length });
  };
  const repeatStartFields = (): Pick<Measure, 'repeatStart' | 'repeatStartRange'> => pendingRepeatStart
    ? { repeatStart: true, repeatStartRange: { from: pendingRepeatStart.offset, to: pendingRepeatStart.offset + pendingRepeatStart.value.length } } : {};

  // 过滤掉元信息和换行 Token，但保留歌词 Token
  const lyricsTokens = tokens.filter(
    t => t.type === 'LYRICS_MARKER' || t.type === 'LYRICS_TEXT'
  );
  
  const bodyTokens = tokens.flatMap((token): Token[] => token.type === 'REPEAT_BOTH'
    ? [{ ...token, type: 'REPEAT_END' }, { ...token, type: 'REPEAT_START' }] : [token]).filter(
    t => !['METADATA_KEY', 'METADATA_VALUE', 'NEWLINE', 'EOF', 'MELODY_MARKER', 'LYRICS_MARKER', 'LYRICS_TEXT', 'FRONTMATTER_SEPARATOR'].includes(t.type)
  );

  // 追踪当前小节起始 offset（不含 | 线自身）
  let measureStartOffset = bodyTokens[0]?.offset ?? 0;
  // 追踪当前小节起始行号
  let measureStartLine = bodyTokens[0]?.line ?? 1;
  // 追踪上一个已保存小节的行号，用于检测换行
  let lastSavedMeasureLine = -1;
  // 遇到 BARLINE 后等待下一个内容 token 来确定新小节的起始行号
  let pendingNewMeasure = false;
  let i = 0;
  let prefixStartIndex = 0;
  const saveCurrentMeasure = (endOffset: number): void => {
    if (currentNotes.length === 0) return;
    const lineBreakBefore = lastSavedMeasureLine !== -1 && measureStartLine !== lastSavedMeasureLine;
    measures.push({
      number: measureNumber,
      ...repeatStartFields(),
      notes: currentNotes,
      sourceRange: { from: measureStartOffset, to: endOffset },
      sourceLine: measureStartLine,
      lineBreakBefore,
    });
    lastSavedMeasureLine = measureStartLine;
    measureNumber++;
    currentNotes = [];
    pendingRepeatStart = undefined;
  };
  while (i < bodyTokens.length) {
    const token = bodyTokens[i];
    const previousType = bodyTokens[i - 1]?.type;
    const nextType = bodyTokens[i + 1]?.type;
    // 归属上一小节的线后换气不能提前确定下一小节的源码行号。
    const breathOnPreviousBarline = token.type === 'BREATH'
      && (previousType === 'BARLINE' || previousType === 'REPEAT_END')
      && nextType !== 'REPEAT_START' && nextType !== 'BARLINE' && nextType !== 'REPEAT_END'
      && measures.length > 0;

    // 遇到 BARLINE 后，用第一个内容 token 的行号作为新小节起始行号
    if (pendingNewMeasure && !breathOnPreviousBarline && token.type !== 'SLUR_START' && token.type !== 'SLUR_END') {
      if (measureStartLine !== token.line) measureStartOffset = token.offset;
      measureStartLine = token.line;
      pendingNewMeasure = false;
    }

    switch (token.type) {
      case 'REPEAT_START': {
        if (openRepeat) {
          reportRepeat(token, '暂不支持嵌套反复或重复的前反复记号');
        } else {
          // 前反复本身也是小节边界，先保存它前面的音符。
          if (currentNotes.some(note => note.type !== 'breath' || note.barlineSide !== 'start')) {
            saveCurrentMeasure(token.offset);
          }
          pendingRepeatStart = token;
          openRepeat = token;
          measureStartOffset = token.offset;
          measureStartLine = token.line;
        }
        i++;
        break;
      }
      case 'REPEAT_END':
      case 'BARLINE': {
        // 遇到小节线，保存当前小节
        saveCurrentMeasure(token.offset);
        if (token.type === 'REPEAT_END') {
          const measure = measures[measures.length - 1];
          if (pendingRepeatStart || !measure || measure.repeatEnd) {
            reportRepeat(token, '后反复记号必须结束非空反复段');
          } else {
            measure.repeatEnd = true;
            measure.repeatEndRange = { from: token.offset, to: token.offset + token.value.length };
            if (token.value === ':||:') measure.combinedRepeat = true;
            openRepeat = undefined;
          }
        }
        if (token.type === 'BARLINE' && token.value === '||' && measures.length > 0) {
          measures[measures.length - 1].finalBarline = true;
        }
        // 下一小节从 | 之后开始
        measureStartOffset = token.offset + token.value.length;
        pendingNewMeasure = true;
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
          const noteResult = parseNote(bodyTokens, noteIndex, prefixStartIndex);
          reportUnsupportedDuration(bodyTokens, noteIndex, noteResult.nextIndex, errors);
          const note = noteResult.note;
          const articulationToken = bodyTokens.slice(noteIndex + 1, noteResult.nextIndex).find(item => item.type === 'STACCATO');
          if (articulationToken) articulationPositions.set(note, articulationToken);
          note.isGrace = true; // 标记为倚音
          note.hasSpaceBefore = token.hasSpaceBefore || false;
          
          // 根据下划线数量判断类型
          if (note.duration.base === 8) {
            // 单减时线：长帚音
            note.graceType = 'long';
          } else if (note.duration.base >= 16) {
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
        const noteResult = parseNote(bodyTokens, i, prefixStartIndex);
        reportUnsupportedDuration(bodyTokens, i, noteResult.nextIndex, errors);
        const note = noteResult.note;
        const articulationToken = bodyTokens.slice(i + 1, noteResult.nextIndex).find(item => item.type === 'STACCATO');
        if (articulationToken) articulationPositions.set(note, articulationToken);
        // 记录空格信息：需要向前回溯前置修饰符（#、b、八度标记），
        // 空格可能被标记在修饰符 token 上（如 " #6" 中，空格记在 SHARP 上而非 NOTE 上）
        let noteHasSpaceBefore = bodyTokens[i]?.hasSpaceBefore || false;
        if (!noteHasSpaceBefore) {
          let checkBack = i - 1;
          while (checkBack >= 0) {
            const pt = bodyTokens[checkBack];
            if (pt.type === 'SHARP' || pt.type === 'FLAT' || pt.type === 'OCTAVE_UP' || pt.type === 'OCTAVE_DOWN' || pt.type === 'TRILL' || pt.type === 'DOT' || pt.type === 'SLUR_START') {
              if (pt.hasSpaceBefore) {
                noteHasSpaceBefore = true;
                break;
              }
              checkBack--;
            } else {
              break;
            }
          }
        }
        note.hasSpaceBefore = noteHasSpaceBefore;
        
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
        const restStart = i;
        const rest: Rest = {
          type: 'rest',
          duration: { base: 4, dots: 0 },
          hasSpaceBefore: token.hasSpaceBefore,
        };
        currentNotes.push(rest);
        i++;
        // 检查后续减时线
        const underlineResult = consumeUnderlines(bodyTokens, i);
        rest.duration.base = underlineResult.base;
        i = underlineResult.nextIndex;
        if (bodyTokens[i]?.type === 'DOT' && !bodyTokens[i]?.hasSpaceBefore) {
          rest.duration.dots = 1;
          i++;
        }
        while (bodyTokens[i]?.type === 'DOT' && !bodyTokens[i]?.hasSpaceBefore) {
          errors.push({
            message: '暂不支持双附点，请将时值拆分为多个音符或休止符',
            position: { line: bodyTokens[i].line, column: bodyTokens[i].column, offset: bodyTokens[i].offset },
            length: 1,
          });
          i++;
        }
        reportUnsupportedDuration(bodyTokens, restStart, i, errors);
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
        const previous = bodyTokens[i - 1];
        const next = bodyTokens[i + 1];
        if (next?.type === 'REPEAT_START') {
          breath.barlineSide = 'start';
        } else if (next?.type === 'BARLINE' || next?.type === 'REPEAT_END') {
          breath.barlineSide = 'end';
        } else if (previous?.type === 'REPEAT_START') {
          breath.barlineSide = 'start';
        } else if (breathOnPreviousBarline) {
          // 线后的换气归属已结束的小节，避免行首错位和末尾空小节。
          breath.barlineSide = 'end';
          measures[measures.length - 1].notes.push(breath);
          i++;
          break;
        }
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

      case 'STACCATO': {
        errors.push({
          message: '短顿音标记 ! 必须紧随一个有效音符',
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

      default: {
        // 未被音符消费的修饰符只能作为紧邻下一音符的前缀。
        let next = i + 1;
        const prefixTypes = ['SHARP', 'FLAT', 'OCTAVE_UP', 'OCTAVE_DOWN', 'TRILL', 'DOT'];
        while (prefixTypes.includes(bodyTokens[next]?.type) && !bodyTokens[next]?.hasSpaceBefore) next++;
        const isPrefix = prefixTypes.includes(token.type) && bodyTokens[next]?.type === 'NOTE'
          && !bodyTokens[next]?.hasSpaceBefore;
        const duplicateAccidental = ['SHARP', 'FLAT'].includes(token.type)
          && ['SHARP', 'FLAT'].includes(bodyTokens[i + 1]?.type)
          && !bodyTokens[i + 1]?.hasSpaceBefore;
        const excessTrill = token.type === 'TRILL' && bodyTokens[i + 1]?.type === 'TRILL'
          && bodyTokens[i + 2]?.type === 'TRILL';
        if (!isPrefix || duplicateAccidental || excessTrill) {
          errors.push({
            message: `修饰符 ${token.value} 必须紧邻有效音符`,
            position: { line: token.line, column: token.column, offset: token.offset },
            length: token.value.length,
          });
        }
        i++;
        break;
      }
    }
    // 已消费的前一音符后缀不能再次作为下一个无空格音符的前缀。
    if (['NOTE', 'REST', 'TIE', 'BREATH', 'BARLINE', 'REPEAT_START', 'REPEAT_END', 'GRACE_PREFIX'].includes(token.type)) prefixStartIndex = i;
  }

  // 最后一个小节
  if (currentNotes.length > 0) {
    const lastBodyToken = bodyTokens[bodyTokens.length - 1];
    const measureEnd = lastBodyToken
      ? lastBodyToken.offset + lastBodyToken.value.length
      : measureStartOffset;
    const lineBreakBefore = lastSavedMeasureLine !== -1 && measureStartLine !== lastSavedMeasureLine;
    measures.push({
      number: measureNumber,
      ...repeatStartFields(),
      notes: currentNotes,
      sourceRange: { from: measureStartOffset, to: measureEnd },
      sourceLine: measureStartLine,
      lineBreakBefore,
    });
  }

  if (openRepeat) reportRepeat(openRepeat, '前反复记号缺少对应的后反复记号');

  // 为所有小节识别连音组（基于空格分隔）
  assignBeamGroups(measures);

  const slurStack: Token[] = [];
  for (const token of bodyTokens) {
    if (token.type === 'SLUR_START') slurStack.push(token);
    if (token.type === 'SLUR_END') {
      if (slurStack.length > 0) slurStack.pop();
      else errors.push({ message: '圆滑线右括号没有对应的左括号', position: { line: token.line, column: token.column, offset: token.offset }, length: 1 });
    }
  }
  for (const token of slurStack) {
    errors.push({ message: '圆滑线左括号未闭合', position: { line: token.line, column: token.column, offset: token.offset }, length: 1 });
  }

  // 识别圆滑线组（基于括号）
  assignSlurGroups(measures, bodyTokens);

  // 暂不支持短顿音与倚音、波音或圆滑线组合。
  for (const measure of measures) {
    for (const [index, element] of measure.notes.entries()) {
      if (element.type !== 'note' || element.articulation !== 'staccatissimo') continue;
      const note = element;
    const combination = note.isGrace ? '短顿音暂不支持用于倚音'
      : note.trillType ? '短顿音暂不支持与波音组合'
        : note.slurGroup !== undefined ? '短顿音暂不支持与圆滑线组合'
          : measure.notes[index + 1]?.type === 'tie' ? '短顿音暂不支持与延长线组合' : undefined;
      if (combination) {
        const token = articulationPositions.get(note);
        errors.push({ message: combination, position: token
          ? { line: token.line, column: token.column, offset: token.offset }
          : { line: measure.sourceLine ?? 1, column: 1, offset: measure.sourceRange?.from ?? 0 }, length: 1 });
      }
    }
  }

  // 关联歌词到小节
  const lyricsErrors = associateLyricsToMeasures(measures, lyricsTokens);
  errors.push(...lyricsErrors);

  return { measures, errors };
}

/**
 * 识别并标记连音组
 * 规则：相邻的八分音符或八分休止符（duration.base >= 8），且中间没有空格，属于同一个连音组
 */
function assignBeamGroups(measures: Measure[]): void {
  let globalBeamGroupId = 0;
  
  for (const measure of measures) {
    const notes = measure.notes;
    let i = 0;
    
    while (i < notes.length) {
      const note = notes[i];
      
      // 只处理普通音符或休拍符且是八分音符及更短
      const isNoteOrRest = note.type === 'note' || note.type === 'rest';
      if (isNoteOrRest && note.duration.base >= 8) {
        // 找到当前连音组的范围
        const groupStart = i;
        let groupEnd = i;
        
        // 向后查找连续的八分音符及更短音符（无空格分隔，允许不同时值）
        while (groupEnd + 1 < notes.length) {
          const nextNote = notes[groupEnd + 1];
          
          // 检查下一个音符是否满足连音条件：
          // - 是普通音符或休拍符
          // - base >= 8（八分音符及更短，即有减时线）
          // - 前面没有空格
          const nextIsNoteOrRest = nextNote.type === 'note' || nextNote.type === 'rest';
          if (nextIsNoteOrRest && 
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
            if (noteInGroup.type === 'note' || noteInGroup.type === 'rest') {
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
function parseNote(tokens: Token[], startIndex: number, prefixStartIndex: number): { note: Note; nextIndex: number } {
  let i = startIndex;
  let octave = 0;
  let accidental: Note['accidental'] = undefined;
  let dot = false;
  let articulation: Note['articulation'];

  // 接受前置八度标记和变音记号作为兼容写法。
  let checkIdx = i - 1;
  while (checkIdx >= prefixStartIndex && !tokens[checkIdx + 1]?.hasSpaceBefore) {
    const prevToken = tokens[checkIdx];
    if (prevToken.type === 'SHARP') {
      accidental = 'sharp';
    } else if (prevToken.type === 'FLAT') {
      accidental = 'flat';
    } else if (prevToken.type === 'OCTAVE_UP') {
      octave++;
    } else if (prevToken.type === 'OCTAVE_DOWN') {
      octave--;
    } else if (prevToken.type === 'BARLINE' || prevToken.type === 'REPEAT_START' || prevToken.type === 'REPEAT_END' || prevToken.type === 'NOTE' || prevToken.type === 'REST' || prevToken.type === 'SLUR_START' || prevToken.type === 'GRACE_PREFIX') {
      break;
    } else {
      checkIdx--;
      continue;
    }
    checkIdx--;
  }

  // 当前 token 是 NOTE
  const pitch = parseInt(tokens[i].value, 10);
  i++;

  // 后置修饰符：八度标记、附点（减时线前）
  while (i < tokens.length && !tokens[i].hasSpaceBefore) {
    if (tokens[i].type === 'OCTAVE_UP') {
      octave++;
      i++;
    } else if (tokens[i].type === 'OCTAVE_DOWN') {
      octave--;
      i++;
    } else if (tokens[i].type === 'DOT') {
      if (dot) break;
      dot = true;
      i++;
    } else if (tokens[i].type === 'STACCATO') {
      if (articulation) break;
      articulation = 'staccatissimo';
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
  while (i < tokens.length && !tokens[i].hasSpaceBefore) {
    if (tokens[i].type === 'OCTAVE_UP') {
      octave++;
      i++;
    } else if (tokens[i].type === 'OCTAVE_DOWN') {
      octave--;
      i++;
    } else if (tokens[i].type === 'DOT') {
      if (dot) break;
      dot = true;
      i++;
    } else if (tokens[i].type === 'STACCATO') {
      if (articulation) break;
      articulation = 'staccatissimo';
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
      ...(articulation ? { articulation } : {}),
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

  while (i < tokens.length && tokens[i].type === 'UNDERLINE' && !tokens[i].hasSpaceBefore) {
    underlineCount++;
    i++;
  }

  let base: 1 | 2 | 4 | 8 | 16 = 4; // 默认四分音符
  if (underlineCount === 1) base = 8;
  if (underlineCount >= 2) base = 16;

  return { base, nextIndex: i };
}

function reportUnsupportedDuration(tokens: Token[], start: number, end: number, errors: ParseError[]): void {
  const slashes = tokens.slice(start, end).filter((token) => token.type === 'UNDERLINE');
  if (slashes.length > 2) {
    const token = slashes[2];
    errors.push({
      message: '暂不支持三条及以上减时线（小于十六分音符）',
      position: { line: token.line, column: token.column, offset: token.offset },
      length: 1,
    });
  }
  const dots = tokens.slice(start, end).filter((token) => token.type === 'DOT');
  if (tokens[end]?.type === 'DOT') dots.push(tokens[end]);
  if (dots.length > 1) {
    const token = dots[1];
    errors.push({
      message: '暂不支持双附点，请将时值拆分为多个音符或休止符',
      position: { line: token.line, column: token.column, offset: token.offset },
      length: 1,
    });
  }
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
        position: { line: measure.sourceLine ?? 1, column: 1, offset: measure.sourceRange?.from ?? 0 },
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
    const explicitMarkers = tokens.filter(t => ['MELODY_MARKER', 'LYRICS_MARKER'].includes(t.type)
      && !['Q', 'P', 'C'].includes(t.value));
    if (explicitMarkers.length > 0) return parseTwoVoices(tokens, metadata);
    const { measures, errors: parseErrors } = parseBody(tokens);

    if (measures.length === 0) {
      return {
        score: null,
        errors: [...parseErrors,
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

/** 按显式声部标记拆分 Token，保留原始源码位置与声部内的跨行分组。 */
function parseTwoVoices(tokens: Token[], metadata: Metadata): ParseResult {
  const streams: Record<'upper' | 'lower', Token[]> = { upper: [], lower: [] };
  const errors: ParseError[] = [];
  let target: 'upper' | 'lower' | null = null;
  let lineHasContent = false;
  const report = (token: Token, message: string): void => {
    errors.push({ message, position: { line: token.line, column: token.column, offset: token.offset }, length: Math.max(1, token.value.length) });
  };
  for (const token of tokens) {
    if (['METADATA_KEY', 'METADATA_VALUE', 'FRONTMATTER_SEPARATOR', 'EOF'].includes(token.type)) continue;
    if (token.type === 'NEWLINE') { target = null; lineHasContent = false; continue; }
    if (token.type === 'MELODY_MARKER' || token.type === 'LYRICS_MARKER') {
      if (token.value === 'upper' || token.value === 'lower') {
        target = token.value;
        streams[target].push(token);
      } else {
        report(token, `双声部曲谱必须使用 Q[upper]/Q[lower] 或 C[upper]/C[lower]，不支持声部「${token.value}」`);
      }
      lineHasContent = true;
      continue;
    }
    if (target) streams[target].push(token);
    else if (!lineHasContent) {
      report(token, '双声部曲谱中的旋律行必须显式指定 upper 或 lower 声部');
      lineHasContent = true;
    }
  }
  const upper = parseBody(streams.upper);
  const lower = parseBody(streams.lower);
  for (const [id, result] of [['upper', upper], ['lower', lower]] as const) {
    errors.push(...[...result.errors, ...validateMeasureBeats(result.measures, metadata.timeSignature)]
      .map(error => ({ ...error, message: `[${id}] ${error.message}` })));
    if (result.measures.length === 0) report(streams[id][0] ?? tokens[0], `[${id}] 缺少声部小节`);
  }
  if (upper.measures.length !== lower.measures.length) {
    const missing = upper.measures.length < lower.measures.length ? 'upper' : 'lower';
    const number = Math.min(upper.measures.length, lower.measures.length) + 1;
    report(streams[missing][streams[missing].length - 1] ?? tokens[0], `[${missing}] 缺少第 ${number} 小节；上下声部小节数必须一致`);
  }
  for (const [index, measure] of upper.measures.entries()) {
    const other = lower.measures[index];
    if (other && (Boolean(measure.repeatStart) !== Boolean(other.repeatStart)
      || Boolean(measure.repeatEnd) !== Boolean(other.repeatEnd))) {
      const from = other.repeatStartRange?.from ?? other.repeatEndRange?.from ?? other.sourceRange?.from ?? 0;
      errors.push({ message: `第 ${index + 1} 小节上下声部反复记号必须一致`,
        position: { line: other.sourceLine ?? 1, column: 1, offset: from }, length: 3 });
    }
  }
  return { score: upper.measures.length || lower.measures.length
    ? { metadata, measures: upper.measures, secondaryVoice: { id: 'lower', measures: lower.measures } } : null, errors };
}
