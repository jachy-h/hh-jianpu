// ============================================================
// Tokenizer — 将简谱文本拆分为 Token 流
// ============================================================

export type TokenType =
  | 'METADATA_KEY'   // 标题:, 调号:, 拍号:, 速度:
  | 'METADATA_VALUE' // 元信息值
  | 'NOTE'           // 1-7
  | 'REST'           // 0
  | 'TIE'            // -
  | 'BARLINE'        // |
  | 'OCTAVE_UP'      // ' (高八度标记)
  | 'OCTAVE_DOWN'    // , (低八度标记)
  | 'UNDERLINE'      // / (减时线)
  | 'DOT'            // . 后缀（附点）
  | 'SHARP'          // #
  | 'FLAT'           // b (在音符前)
  | 'SLUR_START'     // ( 圆滑线开始
  | 'SLUR_END'       // ) 圆滑线结束
  | 'BREATH'         // v 换气记号
  | 'GRACE_PREFIX'   // ^ 倚音前缀
  | 'TRILL'          // ~ 波音记号
  | 'MELODY_MARKER'  // Q 旋律标记
  | 'LYRICS_MARKER'  // C 歌词标记
  | 'LYRICS_TEXT'    // 歌词内容
  | 'NEWLINE'        // 换行
  | 'EOF'            // 结束
  | 'ERROR';         // 无法识别

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  offset: number;
  /** 此 token 前是否有空格/制表符（用于连音组分隔判断） */
  hasSpaceBefore?: boolean;
}

/** 元信息关键字映射 */
const METADATA_KEYS = new Set(['标题', '调号', '拍号', '速度', 'title', 'key', 'time', 'tempo']);

/**
 * 将简谱源文本分词为 Token 数组
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  // 先按行处理元信息头
  const lines = source.split('\n');
  let bodyStartLine = 0;

  // 解析元信息头
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].trim();
    if (lineText === '') {
      if (tokens.some(t => t.type === 'METADATA_KEY')) {
        bodyStartLine = i + 1;
        break;
      }
      continue;
    }

    const metaMatch = lineText.match(/^([\u4e00-\u9fa5a-zA-Z]+)\s*[:：]\s*(.+)$/);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      if (METADATA_KEYS.has(key) || METADATA_KEYS.has(metaMatch[1])) {
        tokens.push({
          type: 'METADATA_KEY',
          value: metaMatch[1],
          line: i + 1,
          column: 1,
          offset: pos,
        });
        tokens.push({
          type: 'METADATA_VALUE',
          value: metaMatch[2].trim(),
          line: i + 1,
          column: metaMatch[1].length + 2,
          offset: pos + metaMatch[1].length + 1,
        });
        bodyStartLine = i + 1;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // 解析音符主体
  const bodyLines = lines.slice(bodyStartLine);
  line = bodyStartLine + 1;

  // 计算 bodyLines 在原始源文本中的起始 offset（元信息行每行 length + \n）
  pos = 0;
  for (let i = 0; i < bodyStartLine; i++) {
    pos += lines[i].length + 1;
  }

  for (const bodyLine of bodyLines) {
    column = 1;
    let hasSpaceBeforeNext = false; // 跟踪是否遇到过空格
    
    // 检测旋律行（Q 开头）- 跳过 Q 标记但继续解析音符
    let contentOffset = 0; // lineContent[0] 在 bodyLine 中的偏移量
    let lineContent = bodyLine;
    if (bodyLine.trim().startsWith('Q ') || bodyLine.trim() === 'Q') {
      tokens.push({
        type: 'MELODY_MARKER',
        value: 'Q',
        line,
        column: 1,
        offset: pos
      });
      // 移除 Q 标记，继续解析剩余内容，同时记录裁剪的字节数
      const pIndex = bodyLine.indexOf('Q');
      const afterQ = bodyLine.substring(pIndex + 1);
      contentOffset = pIndex + 1 + (afterQ.length - afterQ.trimStart().length);
      lineContent = afterQ.trimStart();
      // 如果 P 后面没有内容，跳到下一行
      if (!lineContent) {
        tokens.push({
          type: 'NEWLINE',
          value: '\n',
          line,
          column: bodyLine.length + 1,
          offset: pos + bodyLine.length
        });
        line++;
        pos += bodyLine.length + 1;
        continue;
      }
    }
    
    // 检测歌词行（C 开头）
    if (lineContent.trim().startsWith('C ') || lineContent.trim() === 'C') {
      tokens.push({
        type: 'LYRICS_MARKER',
        value: 'C',
        line,
        column: 1,
        offset: pos
      });
      
      const lyricsText = lineContent.trim().substring(1).trim();
      if (lyricsText) {
        tokens.push({
          type: 'LYRICS_TEXT',
          value: lyricsText,
          line,
          column: bodyLine.indexOf(lyricsText) + 1,
          offset: pos + bodyLine.indexOf(lyricsText)
        });
      }
      
      tokens.push({
        type: 'NEWLINE',
        value: '\n',
        line,
        column: bodyLine.length + 1,
        offset: pos + bodyLine.length
      });
      
      line++;
      pos += bodyLine.length + 1;
      continue;
    }
    
    // 解析音符内容（使用处理后的 lineContent）
    // baseOffset：lineContent[i] 在原始源文本中的实际字节偏移
    const baseOffset = pos + contentOffset;
    for (let i = 0; i < lineContent.length; i++) {
      const ch = lineContent[i];

      // 记录空格
      if (ch === ' ' || ch === '\t') {
        hasSpaceBeforeNext = true;
        column++;
        continue;
      }

      // 音符 1-7
      if (ch >= '1' && ch <= '7') {
        tokens.push({ 
          type: 'NOTE', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 休止符
      else if (ch === '0') {
        tokens.push({ 
          type: 'REST', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 延长线
      else if (ch === '-') {
        tokens.push({ 
          type: 'TIE', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 小节线
      else if (ch === '|') {
        tokens.push({ 
          type: 'BARLINE', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 圆滑线开始
      else if (ch === '(') {
        tokens.push({ 
          type: 'SLUR_START', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 圆滑线结束
      else if (ch === ')') {
        tokens.push({ 
          type: 'SLUR_END', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 高八度（'）可以在数字或下划线后面
      else if (ch === "'") {
        // 向后查找：跳过连续的单引号
        let lookAhead = i + 1;
        while (lookAhead < lineContent.length && lineContent[lookAhead] === "'") {
          lookAhead++;
        }
        
        // 向前查找：检查前面是否有数字或下划线（可能跳过其他单引号）
        let lookBehind = i - 1;
        while (lookBehind >= 0 && lineContent[lookBehind] === "'") {
          lookBehind--;
        }
        const prevCh = lookBehind >= 0 ? lineContent[lookBehind] : '';
        
        // 在数字或减时线后面，才是高八度标记
        if ((prevCh >= '1' && prevCh <= '7') || prevCh === '/') {
          tokens.push({ 
            type: 'OCTAVE_UP', 
            value: ch, 
            line, 
            column, 
            offset: baseOffset + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
          hasSpaceBeforeNext = false;
        }
        // 如果不在数字或下划线后面，就忽略这个字符（不生成token）
      }
      // 减时线
      else if (ch === '/') {
        tokens.push({ 
          type: 'UNDERLINE', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 升号
      else if (ch === '#') {
        tokens.push({ 
          type: 'SHARP', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 逗号：低八度标记（可以在数字或下划线后面）
      else if (ch === ',') {
        // 向前查找：检查前面是否有数字或下划线（可能跳过其他逗号）
        let lookBehind = i - 1;
        while (lookBehind >= 0 && lineContent[lookBehind] === ',') {
          lookBehind--;
        }
        const prevCh = lookBehind >= 0 ? lineContent[lookBehind] : '';
        
        // 在数字或减时线后面，才是低八度标记
        if ((prevCh >= '1' && prevCh <= '7') || prevCh === '/') {
          tokens.push({ 
            type: 'OCTAVE_DOWN', 
            value: ch, 
            line, 
            column, 
            offset: baseOffset + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
          hasSpaceBeforeNext = false;
        }
        // 否则忽略逗号
      }
      // 点号：附点或其他用途（下波音等）
      else if (ch === '.') {
        tokens.push({ 
          type: 'DOT', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 降号
      else if (ch === 'b') {
        const nextCh = i + 1 < lineContent.length ? lineContent[i + 1] : '';
        if (nextCh >= '1' && nextCh <= '7') {
          tokens.push({ 
            type: 'FLAT', 
            value: ch, 
            line, 
            column, 
            offset: baseOffset + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
          hasSpaceBeforeNext = false;
        }
      }
      // 换气记号
      else if (ch === 'v' || ch === 'V') {
        tokens.push({ 
          type: 'BREATH', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 波音记号
      else if (ch === '~') {
        tokens.push({ 
          type: 'TRILL', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 倚音前缀
      else if (ch === '^') {
        tokens.push({ 
          type: 'GRACE_PREFIX', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 其它字符忽略或标记错误
      else {
        tokens.push({ 
          type: 'ERROR', 
          value: ch, 
          line, 
          column, 
          offset: baseOffset + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }

      column++;
    }

    tokens.push({ type: 'NEWLINE', value: '\n', line, column, offset: pos + bodyLine.length });
    pos += bodyLine.length + 1;
    line++;
  }

  tokens.push({ type: 'EOF', value: '', line, column: 1, offset: pos });
  return tokens;
}
