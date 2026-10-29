import React, { useState } from "react";
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
