// ============================================================
// jianpu-theme.ts — 简谱编辑器 CodeMirror 主题
// 颜色体系与项目 tailwind.config.js 保持一致
// ============================================================

import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

// ============================================================
// 项目色系常量（与 tailwind.config.js 同步）
// ============================================================
const C = {
  paper: '#FAFAF9',
  ink: '#1C1917',
  highlight: '#2563EB',
  played: '#94A3B8',
  error: '#DC2626',
  barline: '#D6D3D1',
  // 扩展色（语法高亮专用）
  metaKey: '#7C3AED',   // 紫：元信息关键字
  metaVal: '#059669',   // 绿：元信息值 / 歌词
  modifier: '#D97706',  // 琥珀：减时线、升降号、附点、八度
  deco: '#0EA5E9',      // 天蓝：圆滑线、倚音、波音、换气
  muted: '#64748B',     // 暗灰：延长线
  lineNum: '#A8A29E',   // 行号色
  activeLine: '#F4F4F0',// 当前行背景
  cursor: '#1C1917',
  selection: 'rgba(37,99,235,0.15)',
};

// ============================================================
// 基础编辑器主题（布局 + 字体 + 光标 + 选区）
// ============================================================
export const jianpuBaseTheme = EditorView.theme({
  // 最外层容器
  '&': {
    height: '100%',
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    backgroundColor: C.paper,
    color: C.ink,
  },

  // 滚动容器
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.6',
    overflow: 'auto',
  },

  // 内容区域
  '.cm-content': {
    padding: '12px 0',
    caretColor: C.cursor,
  },

  // 光标
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: C.cursor,
    borderLeftWidth: '2px',
  },

  // 选区
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: C.selection,
  },

  // 当前行高亮
  '.cm-activeLine': {
    backgroundColor: C.activeLine,
  },

  // 行号槽
  '.cm-gutters': {
    backgroundColor: C.paper,
    color: C.lineNum,
    border: 'none',
    borderRight: `1px solid ${C.barline}`,
    fontSize: '12px',
    minWidth: '2.8em',
    userSelect: 'none',
  },

  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px',
    minWidth: '2em',
    textAlign: 'right',
  },

  // 错误行行号
  '.cm-gutterElement.cm-gutter-error': {
    color: C.error,
    fontWeight: '600',
  },

  // 搜索匹配
  '.cm-searchMatch': {
    backgroundColor: 'rgba(217,119,6,0.2)',
    outline: `1px solid ${C.modifier}`,
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(37,99,235,0.25)',
  },

  // fold placeholder
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: C.played,
  },

  // 滚动条（webkit）
  '.cm-scroller::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    background: C.barline,
    borderRadius: '3px',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    background: C.played,
  },
}, { dark: false });

// ============================================================
// 语法高亮主题
// 对应 jianpu-language.ts 中 token() 返回的字符串 tag 名
// CodeMirror 会在 DOM 上生成 cm-{tagName} 的 class
// ============================================================
export const jianpuHighlightTheme = EditorView.theme({
  // 元信息关键字（标题/调号/…）
  '.cm-definitionKeyword': { color: C.metaKey, fontWeight: '600' },

  // 元信息值 / 歌词文本
  '.cm-string': { color: C.metaVal },

  // 音符 1-7（主体内容，使用默认墨色）
  '.cm-number': { color: C.ink, fontWeight: '500' },

  // 休止符 0
  '.cm-atom': { color: C.played },

  // 延长线 -
  '.cm-operator': { color: C.muted },

  // 小节线 |
  '.cm-separator': { color: C.barline },

  // 减时线 / 、升降号 # b、八度标记 ' ,、附点 .
  '.cm-modifier': { color: C.modifier },

  // 歌词行 / 旋律行的 C Q 前缀
  '.cm-keyword': { color: C.metaKey, fontWeight: '600' },

  // 圆滑线括号 ( )
  '.cm-punctuation': { color: C.deco },

  // 换气 v，波音 ~
  '.cm-meta': { color: C.deco },

  // 倚音前缀 ^
  '.cm-annotation': { color: C.deco },

  // ── 错误 Decoration ───────────────────────────────────────
  // 精确错误区间：下划波浪线
  '.cm-jianpu-error': {
    textDecoration: 'underline wavy',
    textDecorationColor: C.error,
  },

  // 整行错误背景（比波浪线更柔和）
  '.cm-jianpu-error-line': {
    backgroundColor: 'rgba(220,38,38,0.06)',
  },

  // 错误悬浮提示框
  '.cm-jianpu-tooltip': {
    padding: '4px 8px',
    fontSize: '12px',
    color: C.error,
    backgroundColor: 'rgba(220,38,38,0.08)',
    border: `1px solid rgba(220,38,38,0.25)`,
    borderRadius: '4px',
    maxWidth: '360px',
    whiteSpace: 'pre-wrap',
  },
});

// ============================================================
// 导出组合 extension
// ============================================================
export function jianpuTheme(): Extension {
  return [jianpuBaseTheme, jianpuHighlightTheme];
}
