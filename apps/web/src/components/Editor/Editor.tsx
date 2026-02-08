import React, { useRef, useEffect } from 'react';
import type { ParseError } from '@as-nmn/core';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  parseErrors?: ParseError[];
}

/**
 * 简谱文本编辑器
 * MVP 阶段使用原生 textarea + 背景层实现错误高亮
 */
const Editor: React.FC<EditorProps> = ({ value, onChange, parseErrors = [] }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // 同步滚动（行号列也需要同步垂直滚动）
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // 渲染带高亮的文本
  const renderHighlightedText = () => {
    const lines = value.split('\n');
    const errorLines = new Set(parseErrors.map((err) => err.position.line));

    return lines
      .map((line, index) => {
        const lineNumber = index + 1;
        const hasError = errorLines.has(lineNumber);
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/ /g, '&nbsp;');

        if (hasError) {
          return `<div class="error-line">${escapedLine || '&nbsp;'}</div>`;
        }
        return `<div>${escapedLine || '&nbsp;'}</div>`;
      })
      .join('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-xs text-played px-3 py-2 border-b border-barline select-none">
        简谱源码
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* 行号列 */}
        <div
          ref={highlightRef}
          className="line-numbers flex-shrink-0 w-12 pt-4 pb-4 pr-2 text-right text-sm font-mono text-played border-r border-barline overflow-auto select-none"
          style={{ lineHeight: '1.5' }}
        >
          {value.split('\n').map((_, index) => (
            <div key={index} className={parseErrors.some(err => err.position.line === index + 1) ? 'text-error font-semibold' : ''}>
              {index + 1}
            </div>
          ))}
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 relative overflow-hidden">
          {/* 错误高亮层 */}
          <div
            className="absolute inset-0 p-4 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none"
            style={{
              color: 'transparent',
              lineHeight: '1.5',
            }}
            dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
          />

          {/* 文本编辑器 */}
          <textarea
            ref={textareaRef}
            className="editor-area absolute inset-0 w-full h-full p-4 bg-transparent text-ink border-none outline-none resize-none font-mono text-sm"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={`标题: 曲名\n调号: C\n拍号: 4/4\n速度: 120\n\n1 2 3 4 | 5 6 7 1' |`}
            spellCheck={false}
            style={{
              lineHeight: '1.5',
            }}
          />
        </div>
      </div>

      {/* 错误高亮样式 */}
      <style>{`
        .error-line {
          background-color: rgba(220, 38, 38, 0.1);
          border-bottom: 2px solid rgba(220, 38, 38, 0.5);
        }
      `}</style>
    </div>
  );
};

export default Editor;
