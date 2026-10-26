// ============================================================
// Editor.tsx — 基于 CodeMirror 6 的简谱编辑器
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { ParseError } from '@hh-jianpu/core';
import { AUTO_SAVE_DELAY_MS } from '../../config';
import TextTip from '../ui/TextTip';
import { TransposeModal } from '../Transpose';

import { EditorView, lineNumbers, highlightActiveLine, keymap, hoverTooltip } from '@codemirror/view';
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

import { jianpu } from './jianpu-language';
import { jianpuTheme } from './jianpu-theme';

// ============================================================
// 解析错误 Decoration Extension
// ============================================================

const setErrorsEffect = StateEffect.define<ParseError[]>();

/** 存储原始 ParseError 数组，供 hover tooltip 读取 */
const errorsState = StateField.define<ParseError[]>({
  create: () => [],
  update(errors, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorsEffect)) return e.value;
    }
    return errors;
  },
});

/** 将 ParseError 转换为文档内字节范围 */
function errorRange(
  doc: EditorState['doc'],
  err: ParseError
): { from: number; to: number } | null {
  let from: number;
  if (err.position.offset !== undefined) {
    from = Math.min(err.position.offset, doc.length);
  } else {
    const lineNo = err.position.line;
    if (lineNo < 1 || lineNo > doc.lines) return null;
    const col = err.position.column ?? 0;
    from = Math.min(doc.line(lineNo).from + col, doc.length);
  }
  const to = Math.min(from + (err.length ?? 1), doc.length);
  return { from, to };
}

const errorDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setErrorsEffect)) {
        deco = buildErrorDecorations(tr.state, effect.value);
      }
    }
    return deco;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

function buildErrorDecorations(state: EditorState, errors: ParseError[]): DecorationSet {
  if (errors.length === 0) return Decoration.none;

  const errorMark = Decoration.mark({ class: 'cm-jianpu-error' });
  const errorLineMark = Decoration.line({ class: 'cm-jianpu-error-line' });
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;

  // 收集所有 decoration range，统一排序后再写入
  // RangeSetBuilder 要求 from 严格升序，混合 line/mark 时必须先排好
  type DecoRange = { from: number; to: number; deco: typeof errorMark | typeof errorLineMark };
  const decoRanges: DecoRange[] = [];

  for (const err of errors) {
    const range = errorRange(doc, err);
    if (!range) continue;
    const { from, to } = range;

    // 整行淡红背景（line decoration: from === to === line.from）
    const line = doc.lineAt(from);
    decoRanges.push({ from: line.from, to: line.from, deco: errorLineMark });

    // 精确错误区间波浪线
    if (from < to) {
      decoRanges.push({ from, to, deco: errorMark });
    }
  }

  // 按 from 升序排序；from 相同时 line decoration（to===from）排在 mark 前面
  decoRanges.sort((a, b) => a.from - b.from || a.to - b.to);

  // 去重：相同 (from, to, class) 只保留一条（多个错误在同一行时 line deco 重复）
  let prevFrom = -1, prevTo = -1, prevDeco: DecoRange['deco'] | null = null;
  for (const { from, to, deco } of decoRanges) {
    if (from === prevFrom && to === prevTo && deco === prevDeco) continue;
    builder.add(from, to, deco);
    prevFrom = from; prevTo = to; prevDeco = deco;
  }

  return builder.finish();
}

// ============================================================
// Hover Tooltip Extension
// ============================================================
const errorHoverTooltip = hoverTooltip((view, pos) => {
  const errors = view.state.field(errorsState);
  const doc = view.state.doc;
  for (const err of errors) {
    const range = errorRange(doc, err);
    if (range && pos >= range.from && pos <= range.to) {
      return {
        pos: range.from,
        end: range.to,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-jianpu-tooltip';
          dom.textContent = err.message;
          return { dom };
        },
      };
    }
  }
  return null;
});

// ============================================================
// Extensions
// ============================================================
function buildExtensions(onChange: (value: string) => void): Extension[] {
  return [
    jianpu(),
    jianpuTheme(),
    errorsState,
    errorDecorations,
    errorHoverTooltip,
    lineNumbers(),
    highlightActiveLine(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    keymap.of([{
      key: 'Tab',
      run(view) {
        view.dispatch(view.state.replaceSelection('  '));
        return true;
      },
    }]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
  ];
}

// ============================================================
// Props & Component
// ============================================================
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  parseErrors?: ParseError[];
  isAutoSaving?: boolean;
  lastSavedAt?: Date | null;
  /** 移调确认后的回调，用于将移调结果保存为新曲谱 */
  onTransposeApply?: (newSource: string, titleSuffix?: string) => void;
  /** 编辑器获得焦点时的回调 */
  onFocus?: () => void;
  /** 编辑器失去焦点时的回调 */
  onBlur?: () => void;
  /** 编辑器滚动时的回调，参数为当前可见的第一行行号（从 1 开始） */
  onScroll?: (firstVisibleLine: number) => void;
  /** 从预览点击小节时定位到的文档范围 */
  sourceRangeToLocate?: { from: number; to: number } | null;
}

/** 将自动保存间隔为可读字符串，如 "1秒" 或 "1000ms" */
function formatDelay(ms: number): string {
  return ms >= 1000 ? `${ms / 1000}秒` : `${ms}ms`;
}

/**
 * 简谱文本编辑器（CodeMirror 6）
 */
const Editor: React.FC<EditorProps> = ({ value, onChange, parseErrors = [], isAutoSaving = false, lastSavedAt = null, onTransposeApply, onFocus, onBlur, onScroll, sourceRangeToLocate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTransposeOpen, setIsTransposeOpen] = useState(false);
  const [activeErrorIndex, setActiveErrorIndex] = useState(0);
  // 记录上一次由内部变更产生的值，避免 value prop 变化时重复写回 EditorView
  const internalValueRef = useRef<string>(value);
  // 记录上一次滚动的行号，避免重复调用 onScroll
  const lastScrollLineRef = useRef<number>(1);

  const handleLocateError = () => {
    const view = viewRef.current;
    if (!view || parseErrors.length === 0) return;
    const index = activeErrorIndex % parseErrors.length;
    const range = errorRange(view.state.doc, parseErrors[index]);
    setActiveErrorIndex((index + 1) % parseErrors.length);
    if (!range) return;
    view.dispatch({
      selection: { anchor: range.from, head: Math.max(range.from, range.to) },
      effects: EditorView.scrollIntoView(range.from, { y: 'center' }),
    });
    view.focus();
  };

  // ── 初始化 EditorView（仅 mount 时创建一次）────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: buildExtensions((newVal) => {
          internalValueRef.current = newVal;
          onChange(newVal);
        }),
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 滚动事件监听（独立的 effect，避免重新创建 EditorView）────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !onScroll) return;

    const handleScroll = () => {
      const scrollTop = view.scrollDOM.scrollTop;
      const lineHeight = view.defaultLineHeight;
      const firstVisibleLine = Math.floor(scrollTop / lineHeight) + 1;
      
      // 只有当行号变化时才调用 onScroll
      if (firstVisibleLine !== lastScrollLineRef.current) {
        lastScrollLineRef.current = firstVisibleLine;
        onScroll(firstVisibleLine);
      }
    };
    
    view.scrollDOM.addEventListener('scroll', handleScroll);
    
    return () => {
      view.scrollDOM.removeEventListener('scroll', handleScroll);
    };
  }, [onScroll]);

  // ── 外部 value 变化时同步（加载示例等场景）────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (internalValueRef.current === value) return;

    internalValueRef.current = value;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  // ── ParseError → Decoration ────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({ effects: setErrorsEffect.of(parseErrors) });
  }, [parseErrors]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !sourceRangeToLocate) return;
    const from = Math.min(sourceRangeToLocate.from, view.state.doc.length);
    const to = Math.min(Math.max(from, sourceRangeToLocate.to), view.state.doc.length);
    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: 'center' }),
    });
  }, [sourceRangeToLocate]);

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="text-xs text-played px-3 py-2 border-b border-barline select-none flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>简谱源码</span>
          {/* 复制按钮 */}
          <TextTip
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={
              "text-gray-400 transition-colors" + (copied ? " text-green-500" : "")
            }
            aria-label="复制简谱源码"
            tipContent={copied ? "已复制" : "复制简谱源码"}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </TextTip>
        </div>
        <span className="flex items-center gap-2">
          {/* 移调按钮 */}
          <button
            onClick={() => setIsTransposeOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            aria-label="移调"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            移调
          </button>
          {/* 自动保存状态 */}
          {isAutoSaving ? (
            <TextTip
              tipContent={`每${formatDelay(AUTO_SAVE_DELAY_MS)}自动保存`}
              color="#9CA3AF"
              position="top"
            >
              保存中…
            </TextTip>
          ) : lastSavedAt ? (
            <TextTip
              tipContent={`每${formatDelay(AUTO_SAVE_DELAY_MS)}自动保存`}
              color="#16A34A"
              position="top"
              className="opacity-70"
            >
              已自动保存
            </TextTip>
          ) : null}
          {/* 解析错误数量 */}
          {parseErrors.length > 0 && (
            <button
              type="button"
              onClick={handleLocateError}
              className="text-red-600 hover:text-red-700 underline decoration-dotted underline-offset-2"
              aria-label={`定位第 ${activeErrorIndex + 1} 个解析错误`}
              title="点击定位到源码中的错误"
            >
              {parseErrors.length} 个错误
            </button>
          )}
        </span>
      </div>

      {/* CodeMirror 容器：fill 剩余空间 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {/* 移调弹框 */}
      <TransposeModal
        isOpen={isTransposeOpen}
        onClose={() => setIsTransposeOpen(false)}
        source={value}
        onApply={onTransposeApply ?? onChange}
      />
    </div>
  );
};

export default React.memo(Editor);

