import React from 'react';
import type { PlaybackStatus } from '@hh-jianpu/core';

const DELAY_BEATS = [0, 4, 8, 16] as const;
const FONT_SIZES = [
  { label: '中杯', value: 18 },
  { label: '大杯', value: 24 },
  { label: '超大杯', value: 30 },
] as const;

interface PlayerBarProps {
  playButtonRef?: React.RefObject<HTMLButtonElement>;
  status: PlaybackStatus;
  tempo: number;
  isLoading?: boolean;
  playDelay: number;
  isMetronomeActive?: boolean;
  countdownValue?: number;
  showTempoControl?: boolean;
  noteFontSize: number;
  onNoteFontSizeChange: (size: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onTempoChange: (bpm: number) => void;
  onPlayDelayChange: (beats: number) => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playButtonRef,
  status,
  tempo,
  isLoading = false,
  playDelay,
  isMetronomeActive = false,
  countdownValue = 0,
  showTempoControl = true,
  noteFontSize,
  onNoteFontSizeChange,
  onPlay,
  onPause,
  onStop,
  onTempoChange,
  onPlayDelayChange,
}) => {
  // 倒计时期间：再次点击/按空格 → 停止倒计时
  const handlePlayClick = () => {
    if (isMetronomeActive) {
      onPlay(); // play() 内部检测到 isMetronomeActive 会停止倒计时
    } else if (status === 'playing') {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div className="flex items-center justify-center gap-6 px-6 py-3 bg-white/80 backdrop-blur border-t border-barline">
      {/* 停止 */}
      <button
        onClick={onStop}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-ink"
        title="停止"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="4" y="4" width="12" height="12" rx="2" />
        </svg>
      </button>

      {/* 播放/暂停 */}
      <button
        ref={playButtonRef}
        onClick={handlePlayClick}
        disabled={isLoading}
        className={`p-3 rounded-full text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
          isMetronomeActive
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-highlight hover:bg-blue-700'
        }`}
        title={
          isLoading ? '加载中…' :
          isMetronomeActive ? '点击取消倒计时' :
          status === 'playing' ? '暂停' : '播放'
        }
      >
        {isLoading ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="32" />
          </svg>
        ) : isMetronomeActive && countdownValue > 0 ? (
          <span className="w-6 h-6 flex items-center justify-center text-lg font-bold leading-none">
            {countdownValue}
          </span>
        ) : status === 'playing' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7,4 20,12 7,20" />
          </svg>
        )}
      </button>

      {/* 延迟设置 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-played select-none">延迟:</span>
        {DELAY_BEATS.map((beats) => (
          <button
            key={beats}
            onClick={() => onPlayDelayChange(beats)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              playDelay === beats
                ? 'bg-highlight text-white'
                : 'bg-gray-100 text-played hover:bg-gray-200'
            }`}
          >
            {beats === 0 ? '无' : `${beats}拍`}
          </button>
        ))}
      </div>

      {/* 字体大小 */}
      <div className="flex items-center gap-1">
        {FONT_SIZES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onNoteFontSizeChange(value)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              noteFontSize === value
                ? 'bg-highlight text-white'
                : 'bg-gray-100 text-played hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 速度控制（可选） */}
      {showTempoControl && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-played select-none">♩=</span>
          <input
            type="range"
            min={40}
            max={240}
            value={tempo}
            onChange={(e) => onTempoChange(parseInt(e.target.value, 10))}
            className="w-28 accent-highlight"
          />
          <span className="text-sm font-mono text-ink w-8 text-right">{tempo}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
