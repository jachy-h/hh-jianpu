import React, { useState } from "react";
import type { PlaybackStatus } from "@hh-jianpu/core";

const DELAY_BEATS = [0, 4, 8, 16] as const;
const FONT_SIZES = [
  { label: "中杯", value: 18 },
  { label: "大杯", value: 24 },
  { label: "超大杯", value: 30 },
] as const;

interface PlayerBarProps {
  playButtonRef?: React.RefObject<HTMLButtonElement>;
  status: PlaybackStatus;
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
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playButtonRef,
  status,
  playDelay,
  isMetronomeActive = false,
  countdownValue = 0,
  noteFontSize,
  collapsed = false,
  pinned = false,
  onNoteFontSizeChange,
  onPlay,
  onPause,
  onStop,
  onPlayDelayChange,
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
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-4 py-2 bg-white/80 backdrop-blur border-t border-barline transition-transform duration-300 ease-in-out ${
        isCollapsed ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`text-xl ${isPinned ? "opacity-100" : "opacity-50 hover:opacity-100"}`}
        title={isPinned ? "取消固定" : "固定控制条"}
      >
        📌
      </button>

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
        onClick={handlePlayClick}
        className={`p-2.5 rounded-full text-white shadow-md ${
          isMetronomeActive ? "bg-amber-500 hover:bg-amber-600" : "bg-highlight hover:bg-blue-700"
        }`}
        title={isMetronomeActive ? "点击取消倒计时" : status === "playing" ? "暂停" : "播放"}
      >
        {isMetronomeActive && countdownValue > 0 ? (
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
    </div>
  );
};

export default PlayerBar;