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
  | 'OCTAVE_DOWN'    // . 前缀（低八度标记）
  | 'UNDERLINE'      // _ (减时线)
  | 'DOT'            // . 后缀（附点）
  | 'SHARP'          // #
  | 'FLAT'           // b (在音符前)
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

  for (const bodyLine of bodyLines) {
    column = 1;
    let hasSpaceBeforeNext = false; // 跟踪是否遇到过空格
    
    for (let i = 0; i < bodyLine.length; i++) {
      const ch = bodyLine[i];

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
          offset: pos + i,
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
          offset: pos + i,
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
          offset: pos + i,
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
          offset: pos + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 高八度（'）在数字后
      else if (ch === "'") {
        tokens.push({ 
          type: 'OCTAVE_UP', 
          value: ch, 
          line, 
          column, 
          offset: pos + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 低八度（'）在数字前 - 暂不支持，用点号代替
      // else if (ch === "'" && i + 1 < bodyLine.length && bodyLine[i + 1] >= '1' && bodyLine[i + 1] <= '7') {
      //   tokens.push({ type: 'OCTAVE_DOWN', value: ch, line, column, offset: pos + i });
      // }
      // 减时线
      else if (ch === '_') {
        tokens.push({ 
          type: 'UNDERLINE', 
          value: ch, 
          line, 
          column, 
          offset: pos + i,
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
          offset: pos + i,
          hasSpaceBefore: hasSpaceBeforeNext 
        });
        hasSpaceBeforeNext = false;
      }
      // 点号：根据上下文判断是低八度前缀还是附点后缀
      else if (ch === '.') {
        // 向后看：如果下一个字符是数字 1-7，则为低八度前缀
        const nextCh = i + 1 < bodyLine.length ? bodyLine[i + 1] : '';
        if (nextCh >= '1' && nextCh <= '7') {
          tokens.push({ 
            type: 'OCTAVE_DOWN', 
            value: ch, 
            line, 
            column, 
            offset: pos + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
        } else {
          tokens.push({ 
            type: 'DOT', 
            value: ch, 
            line, 
            column, 
            offset: pos + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
        }
        hasSpaceBeforeNext = false;
      }
      // 降号
      else if (ch === 'b') {
        const nextCh = i + 1 < bodyLine.length ? bodyLine[i + 1] : '';
        if (nextCh >= '1' && nextCh <= '7') {
          tokens.push({ 
            type: 'FLAT', 
            value: ch, 
            line, 
            column, 
            offset: pos + i,
            hasSpaceBefore: hasSpaceBeforeNext 
          });
          hasSpaceBeforeNext = false;
        }
      }
      // 其它字符忽略或标记错误
      else {
        tokens.push({ 
          type: 'ERROR', 
          value: ch, 
          line, 
          column, 
          offset: pos + i,
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
