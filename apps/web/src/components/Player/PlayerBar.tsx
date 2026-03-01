import React from 'react';
import type { PlaybackStatus } from '@hh-jianpu/core';

const DELAY_PRESETS = [0, 3, 5, 10] as const;

interface PlayerBarProps {
  playButtonRef?: React.RefObject<HTMLButtonElement>;
  status: PlaybackStatus;
  tempo: number;
  isLoading?: boolean;
  playDelay: number;
  countdownValue: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onTempoChange: (bpm: number) => void;
  onPlayDelayChange: (seconds: number) => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playButtonRef,
  status,
  tempo,
  isLoading = false,
  playDelay,
  countdownValue,
  onPlay,
  onPause,
  onStop,
  onTempoChange,
  onPlayDelayChange,
}) => {
  /** 是否正在倒计时 */
  const isCounting = countdownValue > 0;

  /** 倒计时时点击播放按钮 → 取消；否则：播放/暂停 */
  const handlePlayClick = () => {
    if (isCounting) {
      onPlay(); // store 的 play() 内部检测到 countdownValue>0 时会取消
    } else if (status === 'playing') {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur border-t border-barline">
      {/* 主控制行 */}
      <div className="flex items-center justify-center gap-6 w-full">
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

        {/* 播放/暂停/倒计时 */}
        <button
          ref={playButtonRef}
          onClick={handlePlayClick}
          disabled={isLoading}
          className={`relative p-3 rounded-full text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
            isCounting ? 'bg-orange-500 hover:bg-orange-600' : 'bg-highlight hover:bg-blue-700'
          }`}
          title={
            isLoading
              ? '加载中...'
              : isCounting
              ? '取消倒计时'
              : status === 'playing'
              ? '暂停'
              : '播放'
          }
        >
          {isLoading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="animate-spin">
              <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="32" />
            </svg>
          ) : isCounting ? (
            <span className="w-6 h-6 flex items-center justify-center font-bold text-lg leading-none animate-pulse">
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

        {/* 速度控制 */}
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
      </div>

      {/* 延迟设置行 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-played select-none">延迟:</span>
        {DELAY_PRESETS.map((sec) => (
          <button
            key={sec}
            onClick={() => onPlayDelayChange(sec)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              playDelay === sec
                ? 'bg-highlight text-white'
                : 'bg-gray-100 text-played hover:bg-gray-200'
            }`}
          >
            {sec === 0 ? '无' : `${sec}s`}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlayerBar;
