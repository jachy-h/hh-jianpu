import React, { useCallback, useEffect, useRef, useState } from 'react';
import ButtonTip from '../ui/ButtonTip';

/** AI 识谱 Prompt 的静态资源地址，随 Vite base 部署。 */
const PROMPT_URL = `${import.meta.env.BASE_URL}prompts/hh-jianpu-transcribe.md`;
const COPY_RESET_MS = 3000;

type CopyState = 'idle' | 'loading' | 'copied' | 'error';

const BUTTON_LABELS: Record<CopyState, string> = {
  idle: '复制 Prompt',
  loading: '复制中…',
  copied: '已复制',
  error: '复制失败',
};

const SHORT_LABELS: Record<CopyState, string> = {
  idle: 'Prompt',
  loading: '…',
  copied: '已复制',
  error: '失败',
};

const TIPS: Record<CopyState, string> = {
  idle: '复制 AI 识谱 Prompt，与简谱截图一起发给 AI 即可生成源码',
  loading: '正在读取 Prompt…',
  copied: '已复制，粘贴给 AI 并附上简谱截图即可',
  error: '复制失败，请检查网络或浏览器剪贴板权限后重试',
};

/**
 * 顶栏「复制 Prompt（BETA）」按钮
 * 首次点击时读取静态 Prompt，之后复用内存缓存；复制结果短暂显示在按钮上。
 */
const PromptCopyButton: React.FC = () => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const promptRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const handleCopy = useCallback(async () => {
    if (copyState === 'loading') return;
    clearTimeout(resetTimerRef.current);
    setCopyState('loading');
    try {
      if (!promptRef.current) {
        const response = await fetch(PROMPT_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        promptRef.current = await response.text();
      }
      await navigator.clipboard.writeText(promptRef.current);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    resetTimerRef.current = setTimeout(() => setCopyState('idle'), COPY_RESET_MS);
  }, [copyState]);

  return (
    <ButtonTip
      tipContent={TIPS[copyState]}
      position="bottom"
      onClick={() => void handleCopy()}
      variant="nude"
      aria-label={`复制 AI 识谱 Prompt（Beta）：${BUTTON_LABELS[copyState]}`}
      className="flex shrink-0 items-center gap-1 rounded-full border border-barline bg-white px-2.5 py-1 text-xs text-stone-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <span className="hidden sm:inline">{BUTTON_LABELS[copyState]}</span>
      <span className="sm:hidden">{SHORT_LABELS[copyState]}</span>
      <span className="rounded bg-amber-100 px-1 py-px text-[9px] font-semibold leading-none tracking-wide text-amber-700">
        BETA
      </span>
    </ButtonTip>
  );
};

export default PromptCopyButton;
