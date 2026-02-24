// ============================================================
// jianpu-language.ts — 简谱 DSL 的 CodeMirror 6 语言支持
// 使用 StreamLanguage，不依赖 lezer grammar，轻量可维护
// ============================================================

import { StreamLanguage, LanguageSupport, StringStream } from '@codemirror/language';

// ============================================================
// 解析状态
// ============================================================
interface JianpuState {
  /** 元信息头已结束（空行之后） */
  metaDone: boolean;
  /** 当前行 token 类型：meta / lyrics / melody / body */
  lineKind: 'meta' | 'lyrics' | 'melody' | 'body';
  /** 当前行是否已消费 C/Q 前缀 */
  prefixConsumed: boolean;
}

// ============================================================
// 元信息关键字集合（与 tokenizer.ts 保持同步）
// ============================================================
const META_KEYS = new Set(['标题', '调号', '拍号', '速度', 'title', 'key', 'time', 'tempo']);

function isMetaKey(word: string): boolean {
  return META_KEYS.has(word) || META_KEYS.has(word.toLowerCase());
}

// ============================================================
// StreamLanguage 定义
// ============================================================
const jianpuLanguage = StreamLanguage.define<JianpuState>({
  name: 'jianpu',

  startState(): JianpuState {
    return { metaDone: false, lineKind: 'meta', prefixConsumed: false };
  },

  /**
   * 核心 tokenizer：每次调用消费一个 token，返回 highlight tag
   */
  token(stream, state): string | null {
    // ── 行首处理 ──────────────────────────────────────────────
    if (stream.sol()) {
      state.prefixConsumed = false;

      // 空白行：如果还在元信息头，标记元信息结束
      if (stream.eol()) {
        if (!state.metaDone) {
          state.metaDone = true;
        }
        return null;
      }

      if (!state.metaDone) {
        // 检查当前行是否为合法的元信息行
        const rest = stream.string;
        const metaMatch = rest.match(/^([\u4e00-\u9fa5a-zA-Z]+)\s*[:：]/);
        if (metaMatch && isMetaKey(metaMatch[1])) {
          state.lineKind = 'meta';
        } else {
          // 不匹配元信息时，元信息头结束，当作 body 处理
          state.metaDone = true;
          state.lineKind = classifyBodyLine(rest);
        }
      } else {
        state.lineKind = classifyBodyLine(stream.string);
      }
    }

    // 跳过空白（不消费换行）
    if (stream.eatSpace()) return null;
    if (stream.eol()) return null;

    // ── 元信息行 ──────────────────────────────────────────────
    if (state.lineKind === 'meta') {
      return tokenizeMeta(stream);
    }

    // ── 歌词行 ────────────────────────────────────────────────
    if (state.lineKind === 'lyrics') {
      // 消费 C 标记
      if (!state.prefixConsumed) {
        if (stream.eat('C')) {
          state.prefixConsumed = true;
          return 'keyword'; // 对应 tags.keyword
        }
      }
      // 剩余歌词内容：整行消费为字符串
      stream.skipToEnd();
      return 'string'; // 对应 tags.string
    }

    // ── 旋律行：消费 Q 后按 body 处理 ────────────────────────
    if (state.lineKind === 'melody') {
      if (!state.prefixConsumed) {
        if (stream.eat('Q')) {
          state.prefixConsumed = true;
          return 'keyword';
        }
      }
      // Q 之后按 body token 规则处理
      return tokenizeBody(stream);
    }

    // ── 普通 body 行 ──────────────────────────────────────────
    return tokenizeBody(stream);
  },

  blankLine(state): void {
    // 空行触发：重置行状态
    if (!state.metaDone) {
      state.metaDone = true;
    }
    state.lineKind = 'body';
    state.prefixConsumed = false;
  },

  copyState(state): JianpuState {
    return { ...state };
  },

  // 将返回的字符串 tag 名映射到 @lezer/highlight tags
  languageData: {
    commentTokens: { line: '//' },
  },
});

// ============================================================
// 辅助：判断 body 行类型
// ============================================================
function classifyBodyLine(line: string): 'lyrics' | 'melody' | 'body' {
  const trimmed = line.trimStart();
  if (trimmed === 'C' || trimmed.startsWith('C ')) return 'lyrics';
  if (trimmed === 'Q' || trimmed.startsWith('Q ')) return 'melody';
  return 'body';
}

// ============================================================
// 辅助：tokenize 元信息行的一个 token
// ============================================================
function tokenizeMeta(stream: StringStream): string | null {
  const ch = stream.peek();
  if (ch == null) return null;

  // 匹配 key（中文或英文词）
  if (stream.match(/^[\u4e00-\u9fa5a-zA-Z]+/)) {
    return 'definitionKeyword'; // → tags.definitionKeyword（紫色）
  }
  // 冒号分隔符
  if (ch === ':' || ch === '：') {
    stream.next();
    return 'punctuation'; // → tags.punctuation
  }
  // 值（冒号后剩余内容）
  stream.skipToEnd();
  return 'string'; // → tags.string（绿色）
}

// ============================================================
// 辅助：tokenize 普通 body 行的一个 token
// ============================================================
function tokenizeBody(stream: StringStream): string | null {
  const ch = stream.peek();
  if (ch == null) return null;

  // 音符 1-7
  if (ch >= '1' && ch <= '7') {
    stream.next();
    return 'number'; // → tags.number（ink）
  }

  // 休止符 0
  if (ch === '0') {
    stream.next();
    return 'atom'; // → tags.atom（played 灰）
  }

  // 延长线 -
  if (ch === '-') {
    stream.next();
    return 'operator'; // → tags.operator
  }

  // 小节线 |
  if (ch === '|') {
    stream.next();
    return 'separator'; // → tags.separator（barline 色）
  }

  // 减时线 /
  if (ch === '/') {
    stream.next();
    return 'modifier'; // → tags.modifier（琥珀）
  }

  // 附点 .
  if (ch === '.') {
    stream.next();
    return 'modifier';
  }

  // 升号 #
  if (ch === '#') {
    stream.next();
    return 'modifier';
  }

  // 降号 b（只在后跟 1-7 时高亮；否则作为普通字符）
  if (ch === 'b') {
    const next = stream.string[stream.pos + 1];
    if (next !== undefined && next >= '1' && next <= '7') {
      stream.next();
      return 'modifier';
    }
    stream.next();
    return null;
  }

  // 高八度 '
  if (ch === "'") {
    stream.next();
    return 'modifier';
  }

  // 低八度 ,
  if (ch === ',') {
    stream.next();
    return 'modifier';
  }

  // 圆滑线 ( )
  if (ch === '(' || ch === ')') {
    stream.next();
    return 'punctuation';
  }

  // 换气符 v V
  if (ch === 'v' || ch === 'V') {
    stream.next();
    return 'meta'; // → tags.meta（天蓝）
  }

  // 波音 ~
  if (ch === '~') {
    stream.next();
    return 'meta';
  }

  // 倚音前缀 ^
  if (ch === '^') {
    stream.next();
    return 'annotation'; // → tags.annotation
  }

  // 识别不了的字符：消费掉，不给 tag（让错误 Decoration 接管显示）
  stream.next();
  return null;
}

// ============================================================
// 导出：LanguageSupport（包含 language + highlight extension）
// ============================================================
export function jianpu(): LanguageSupport {
  return new LanguageSupport(jianpuLanguage);
}
