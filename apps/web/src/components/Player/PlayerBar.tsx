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
  isLoading?: boolean;
  playDelay: number;
  isMetronomeActive?: boolean;
  countdownValue?: number;
  noteFontSize: number;
  /** 编辑器聚焦时禁用控制条 */
  disabled?: boolean;
  onNoteFontSizeChange: (size: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPlayDelayChange: (beats: number) => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playButtonRef,
  status,
  isLoading = false,
  playDelay,
  isMetronomeActive = false,
  countdownValue = 0,
  noteFontSize,
  disabled = false,
  onNoteFontSizeChange,
  onPlay,
  onPause,
  onStop,
  onPlayDelayChange,
}) => {
  const handlePlayClick = () => {
    if (disabled) return;
    if (isMetronomeActive) {
      onPlay();
    } else if (status === 'playing') {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div className={`relative flex items-center justify-center gap-6 px-6 py-3 bg-white/80 backdrop-blur border-t border-barline transition-opacity ${disabled ? 'opacity-50' : ''}`}>
      {/* 磁带 loading 动画 */}
      {(isLoading || disabled) && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
          <div className="loader" />
        </div>
      )}

      {/* 停止 */}
      <button
        onClick={disabled ? undefined : onStop}
        disabled={disabled}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-ink disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? "点击编辑区域外启用控制" : "停止"}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="4" y="4" width="12" height="12" rx="2" />
        </svg>
      </button>

      {/* 播放/暂停 */}
      <button
        ref={playButtonRef}
        onClick={handlePlayClick}
        disabled={isLoading || disabled}
        className={`p-3 rounded-full text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
          isMetronomeActive
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-highlight hover:bg-blue-700'
        }`}
        title={
          disabled ? "点击编辑区域外启用控制" :
          isLoading ? '加载中…' :
          isMetronomeActive ? '点击取消倒计时' :
          status === 'playing' ? '暂停' : '播放'
        }
      >
        {disabled || isLoading ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse">
            <polygon points="7,4 20,12 7,20" />
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
      <div className={`flex items-center gap-1.5 ${disabled ? 'pointer-events-none' : ''}`}>
        <span className="text-xs text-played select-none">延迟:</span>
        {DELAY_BEATS.map((beats) => (
          <button
            key={beats}
            onClick={() => !disabled && onPlayDelayChange(beats)}
            disabled={disabled}
            className={`px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
      <div className={`flex items-center gap-1 ${disabled ? 'pointer-events-none' : ''}`}>
        {FONT_SIZES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => !disabled && onNoteFontSizeChange(value)}
            disabled={disabled}
            className={`px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              noteFontSize === value
                ? 'bg-highlight text-white'
                : 'bg-gray-100 text-played hover:bg-gray-200'
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
