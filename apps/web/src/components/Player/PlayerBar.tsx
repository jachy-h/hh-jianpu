import React, { useEffect, useRef, useState } from "react";
import type { PlaybackStatus } from "@hh-jianpu/core";
import { PLAYBACK_INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from '../../services/playbackInstruments';

const DELAY_BEATS = [0, 4, 8, 16] as const;
const FONT_SIZES = [
  { label: "中杯", value: 18 },
  { label: "大杯", value: 24 },
  { label: "超大杯", value: 30 },
] as const;

interface PlayerBarProps {
  playButtonRef?: React.RefObject<HTMLButtonElement>;
  status: PlaybackStatus;
  voices?: { id: 'upper' | 'lower'; name: string }[];
  mutedVoices?: ('upper' | 'lower')[];
  onVoiceMutedChange?: (id: 'upper' | 'lower', muted: boolean) => void;
  isLoading?: boolean;
  instrumentId?: string;
  onInstrumentChange?: (id: string) => void;
  practiceSpeed?: number;
  onPracticeSpeedChange?: (speed: number) => void;
  playDelay: number;
  isMetronomeActive?: boolean;
  countdownValue?: number;
  noteFontSize: number;
  respectSourceLineBreaks: boolean;
  layoutMode: 'natural' | 'aligned';
  onLayoutModeChange: (mode: 'natural' | 'aligned') => void;
  onRespectSourceLineBreaksChange: (value: boolean) => void;
  collapsed?: boolean;
  pinned?: boolean;
  onNoteFontSizeChange: (size: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPlayDelayChange: (beats: number) => void;
  loopSelection?: { startMeasure: number; endMeasure: number | null } | null;
  onClearLoopSelection?: () => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playButtonRef,
  status,
  voices,
  mutedVoices = [],
  onVoiceMutedChange,
  isLoading = false,
  instrumentId = DEFAULT_INSTRUMENT_ID,
  onInstrumentChange,
  practiceSpeed = 1,
  onPracticeSpeedChange,
  playDelay,
  isMetronomeActive = false,
  countdownValue = 0,
  noteFontSize,
  respectSourceLineBreaks,
  layoutMode,
  onLayoutModeChange,
  onRespectSourceLineBreaksChange,
  collapsed = false,
  pinned = true,
  onNoteFontSizeChange,
  onPlay,
  onPause,
  onStop,
  onPlayDelayChange,
  loopSelection = null,
  onClearLoopSelection,
}) => {
  const [isPinned, setIsPinned] = useState(pinned);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (settingsOpen) dialog?.showModal();
    return () => dialog?.close();
  }, [settingsOpen]);
  const isCollapsed = collapsed && !isPinned;

  const handlePlayClick = () => {
    if (isCollapsed) return;
    if (isMetronomeActive) {
      onPlay();
    } else if (status === "playing") {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-center gap-2 px-2 py-2 bg-white/80 backdrop-blur border-t border-barline transition-transform duration-300 ease-in-out ${
        isCollapsed ? "translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Pin 按钮 - 左上角 */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`absolute left-3 p-1 rounded transition-all duration-300 ${
          isPinned ? "text-highlight rotate-[-30deg]" : "text-gray-400 hover:text-gray-600 rotate-[-30deg] hover:rotate-[-20deg]"
        }`}
        title={isPinned ? "取消固定" : "固定控制条"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      </button>

      {/* 按钮区域右移，留出pin按钮空间 */}
      <div className="ml-7 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <button
          onClick={onStop}
          className="p-2 rounded-lg hover:bg-gray-100 text-ink"
          title="停止"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <rect x="4" y="4" width="12" height="12" rx="2" />
          </svg>
        </button>

        <button
          ref={playButtonRef}
          disabled={isLoading}
          aria-busy={isLoading}
          onClick={handlePlayClick}
          className={`grid h-10 w-10 shrink-0 place-items-center p-2.5 rounded-full text-white shadow-md ${
            isMetronomeActive ? "bg-amber-500 hover:bg-amber-600" : "bg-highlight hover:bg-blue-700"
          }`}
          title={isLoading ? "音色准备中" : isMetronomeActive ? "点击取消倒计时" : status === "playing" ? "暂停" : "播放"}
        >
          <span role="status" className="sr-only">{isLoading ? '音色准备中' : ''}</span>
          {isLoading ? (
            <svg className="animate-spin" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : isMetronomeActive && countdownValue > 0 ? (
            <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{countdownValue}</span>
          ) : status === "playing" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="7,4 20,12 7,20" />
            </svg>
          )}
        </button>

        <label className="flex items-center gap-1 text-xs text-played">
          音色
          <select aria-label="播放音色" value={instrumentId}
            onChange={(event) => onInstrumentChange?.(event.target.value)}
            className="rounded bg-gray-100 px-1 py-0.5 text-ink">
            {PLAYBACK_INSTRUMENTS.map(instrument => <option key={instrument.id} value={instrument.id} disabled={instrument.disabled}>{instrument.label}{instrument.disabled ? '（暂不可用）' : ''}</option>)}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <span className="text-xs text-played select-none">延迟:</span>
          {DELAY_BEATS.map((beats) => (
            <button
              key={beats}
              onClick={() => onPlayDelayChange(beats)}
              className={`px-1.5 py-0.5 text-xs rounded ${
                playDelay === beats ? "bg-highlight text-white" : "bg-gray-100 text-played hover:bg-gray-200"
              }`}
            >
              {beats === 0 ? "无" : `${beats}拍`}
            </button>
          ))}
        </div>

        {voices?.map(voice => <button key={voice.id} type="button"
          aria-pressed={!mutedVoices.includes(voice.id)}
          aria-label={`${voice.name}声部${mutedVoices.includes(voice.id) ? '已静音' : '发声中'}`}
          onClick={() => onVoiceMutedChange?.(voice.id, !mutedVoices.includes(voice.id))}
          className={`rounded border px-2 py-1 text-xs ${mutedVoices.includes(voice.id) ? 'border-barline text-played' : 'border-blue-200 bg-blue-50 text-highlight'}`}>
          {voice.name} {mutedVoices.includes(voice.id) ? '静音' : '发声'}
        </button>)}
        <label className="flex items-center gap-1 text-xs text-played">
          练习速度
          <select aria-label="练习速度倍率" value={practiceSpeed} onChange={(event) => onPracticeSpeedChange?.(Number(event.target.value))} className="rounded bg-gray-100 px-1 py-0.5 text-ink">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </label>
        <button type="button" title="排版设置" aria-label="排版设置" onClick={() => setSettingsOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg text-played hover:bg-gray-100 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlight">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 3.12-.08-.02a1.7 1.7 0 0 0-1.8.64l-.05.07h-3.6l-.03-.08a1.7 1.7 0 0 0-1.53-1.02 1.7 1.7 0 0 0-1.53 1.02l-.04.08H5.76l-.05-.07a1.7 1.7 0 0 0-1.8-.64l-.08.02-1.8-3.12.06-.06A1.7 1.7 0 0 0 2.43 15l-.08-.03v-3.6l.08-.04a1.7 1.7 0 0 0 .34-1.87l-.06-.06 1.8-3.12.08.02a1.7 1.7 0 0 0 1.8-.64l.05-.07h3.6l.04.08a1.7 1.7 0 0 0 3.06 0l.03-.08h3.6l.05.07a1.7 1.7 0 0 0 1.8.64l.08-.02 1.8 3.12-.06.06a1.7 1.7 0 0 0 .34 1.87l.08.04v3.6Z" transform="translate(1 -1) scale(.92)"/></svg>
        </button>
        {settingsOpen && <dialog ref={dialogRef} aria-labelledby="layout-settings-title" onCancel={event => { event.preventDefault(); setSettingsOpen(false); }}
          className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-barline bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/40">
          <div className="flex items-start justify-between border-b border-barline px-6 py-5">
            <div><h2 id="layout-settings-title" className="text-lg font-semibold">排版设置</h2><p className="mt-1 text-sm text-played">调整曲谱的排列方式</p></div>
            <button type="button" aria-label="关闭设置" onClick={() => setSettingsOpen(false)} className="rounded px-2 py-1 text-played hover:bg-stone-100">✕</button>
          </div>
          <div className="space-y-5 px-6 py-5">
            <fieldset><legend className="mb-3 text-sm font-semibold">排版模式</legend>
              <div className="grid gap-2">
                {([{ value: 'natural', label: '自然排版', description: '根据内容和节奏灵活分配空间' }, { value: 'aligned', label: '小节对齐', description: '各行对应小节和相同拍点对齐' }] as const).map(option =>
                  <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${layoutMode === option.value ? 'border-blue-300 bg-blue-50' : 'border-barline hover:bg-stone-50'}`}>
                    <input type="radio" name="layout-mode" value={option.value} checked={layoutMode === option.value} onChange={() => onLayoutModeChange(option.value)} className="mt-1 accent-blue-600" />
                    <span><span className="block text-sm font-medium">{option.label}</span><span className="mt-1 block text-xs text-played">{option.description}</span></span>
                  </label>)}
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-barline pt-4"><span><span className="block text-sm font-medium">按源码换行</span><span className="mt-1 block text-xs text-played">保留谱文中指定的换行位置</span></span><input type="checkbox" checked={respectSourceLineBreaks} onChange={event => onRespectSourceLineBreaksChange(event.target.checked)} className="h-4 w-4 accent-blue-600" /></label>
          </div>
        </dialog>}
        <div className="flex items-center gap-1">
          {FONT_SIZES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onNoteFontSizeChange(value)}
              className={`px-1.5 py-0.5 text-xs rounded ${
                noteFontSize === value ? "bg-highlight text-white" : "bg-gray-100 text-played hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-xs ${loopSelection ? 'border border-blue-200 bg-blue-50 font-semibold text-highlight' : 'text-played'}`} role="status">
          <span>
            {loopSelection
              ? loopSelection.endMeasure === null
                ? `已选循环起点：第 ${loopSelection.startMeasure} 小节，请再点击终点小节`
                : `已设置循环：第 ${loopSelection.startMeasure}–${loopSelection.endMeasure} 小节（按书写顺序）`
              : '点击小节设置循环段'}
          </span>
          {loopSelection && (
            <button type="button" onClick={onClearLoopSelection} className="rounded border border-red-200 bg-red-50 px-2 py-1 font-semibold text-error hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500" title="清除循环">清除循环</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
