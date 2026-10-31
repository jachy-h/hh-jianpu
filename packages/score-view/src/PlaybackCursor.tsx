import React, { useEffect, useState } from 'react';
import { resolveTimeCursor } from '@hh-jianpu/core';
import type { PlaybackPosition, ScoreLayout, TimeCursor } from '@hh-jianpu/core';
import { startCursorAnimation } from './cursor-animation.js';
import { RunningCat } from './RunningCat.js';

interface PlaybackCursorProps {
  readonly layout: ScoreLayout;
  readonly status: 'idle' | 'playing' | 'paused';
  readonly readPosition: () => PlaybackPosition | null;
  readonly onPosition: (position: TimeCursor) => void;
}

/** 独立动画层，逐帧更新不会触发整张谱面重新渲染。 */
export const PlaybackCursor: React.FC<PlaybackCursorProps> = ({ layout, status, readPosition, onPosition }) => {
  const [cursor, setCursor] = useState<TimeCursor | null>(null);
  useEffect(() => {
    const update = () => {
      const position = readPosition();
      const next = position ? resolveTimeCursor(layout, position.measureNumber, position.writtenBeat) : null;
      setCursor(next);
      if (next) onPosition(next);
    };
    if (status === 'idle') { setCursor(null); return; }
    if (status === 'paused') { update(); return; }
    return startCursorAnimation({
      request: callback => requestAnimationFrame(callback),
      cancel: id => cancelAnimationFrame(id),
      isHidden: () => document.hidden,
      subscribe: callback => {
        document.addEventListener('visibilitychange', callback);
        return () => document.removeEventListener('visibilitychange', callback);
      },
    }, update);
  }, [layout, status, readPosition, onPosition]);
  return cursor ? <>
    <line x1={cursor.x} x2={cursor.x} y1={cursor.top} y2={cursor.bottom + 15}
      stroke="#2563EB" strokeWidth={2} opacity={0.75} pointerEvents="none" aria-hidden="true" />
    <RunningCat x={cursor.x} y={cursor.bottom + 15} isPlaying={status === 'playing'} />
  </> : null;
};
