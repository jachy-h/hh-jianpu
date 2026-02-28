// ============================================================
// Editor.tsx — 基于 CodeMirror 6 的简谱编辑器
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { ParseError } from '@hh-jianpu/core';
import { AUTO_SAVE_DELAY_MS } from '../../config';
import TextTip from '../ui/TextTip';

import { EditorView, lineNumbers, highlightActiveLine, keymap, hoverTooltip } from '@codemirror/view';
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

import { jianpu } from './jianpu-language';
import { jianpuTheme } from './jianpu-theme';
import { ButtonTip } from '../ui';

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
}

/** 将自动保存间隔为可读字符串，如 "1秒" 或 "1000ms" */
function formatDelay(ms: number): string {
  return ms >= 1000 ? `${ms / 1000}秒` : `${ms}ms`;
}

/**
 * 简谱文本编辑器（CodeMirror 6）
 */
const Editor: React.FC<EditorProps> = ({ value, onChange, parseErrors = [], isAutoSaving = false, lastSavedAt = null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  // 记录上一次由内部变更产生的值，避免 value prop 变化时重复写回 EditorView
  const internalValueRef = useRef<string>(value);

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
            <TextTip
              tipContent="点击编辑器查看详细信息"
              color="#DC2626"
              position="top"
            >
              {parseErrors.length} 个错误
            </TextTip>
          )}
        </span>
      </div>

      {/* CodeMirror 容器：fill 剩余空间 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      />
    </div>
  );
};

export default React.memo(Editor);

