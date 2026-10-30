import React, { useEffect, useRef, useState } from 'react';
import type { PlaybackStatus } from '@hh-jianpu/core';
import { useStore } from '../../store/useStore';
import { MetronomeCat } from '@hh-jianpu/score-view';
import './metronome-cat.css';

interface MetronomeProps {
  tempo: number;
  status: PlaybackStatus;
  onTempoChange: (bpm: number) => void;
}

const Metronome: React.FC<MetronomeProps> = ({ tempo, status, onTempoChange }) => {
  const player = useStore((s) => s.player);
  const stop = useStore((s) => s.stop);
  const countdownValue = useStore((s) => s.countdownValue);
  const isMetronomeActive = useStore((s) => s.isMetronomeActive);

  const [currentBeat, setCurrentBeat] = useState(0);
  const [tick, setTick] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const clampPosition = (x: number, y: number) => {
    const rect = panelRef.current?.getBoundingClientRect();
    return { x: Math.max(0, Math.min(x, window.innerWidth - (rect?.width ?? 0))),
      y: Math.max(40, Math.min(y, Math.max(40, window.innerHeight - (rect?.height ?? 0)))) };
  };

  useEffect(() => {
    const resize = () => setPosition(value => value ? clampPosition(value.x, value.y) : value);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const isPlaying = status === 'playing';

  useEffect(() => {
    player.setMetronomeEnabled(true);
    player.setBeatCallback((beat) => {
      setCurrentBeat(beat);
      setTick(value => value + 1);
    });
    return () => {
      player.setBeatCallback(null);
    };
  }, [player]);

  useEffect(() => {
    if (!isPlaying && !isMetronomeActive) {
      setCurrentBeat(0);
    }
  }, [isPlaying, isMetronomeActive]);

  useEffect(() => {
    if (isMetronomeActive && countdownValue > 0) {
      setCurrentBeat(countdownValue);
    }
  }, [isMetronomeActive, countdownValue]);

  const shouldShowBeat = (isPlaying && currentBeat > 0) || (isMetronomeActive && countdownValue > 0);

  return (
    <div ref={panelRef} className={`fixed z-50 flex flex-col items-end gap-2 ${position ? '' : 'bottom-24 right-6'}`}
      style={position ? { left: position.x, top: position.y } : undefined}
      onPointerDown={event => {
        if (event.button !== 0 || !(event.target as Element).closest('.cat-metronome')) return;
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x, dy = event.clientY - current.y;
        if (!current.moved && Math.hypot(dx, dy) < 5) return;
        if (!current.moved) { current.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
        setPosition(clampPosition(current.left + dx, current.top + dy));
      }}
      onPointerUp={event => { if (drag.current?.id === event.pointerId) { suppressClick.current = drag.current.moved; drag.current = null; window.setTimeout(() => { suppressClick.current = false; }, 0); } }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = false; }}
      onKeyDown={event => {
        if (!(event.target as Element).closest('.cat-metronome')) return;
        const offsets: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition(clampPosition(rect.left + offset[0], rect.top + offset[1]));
      }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur rounded-xl shadow-lg border transition-all ${
          isPlaying || isMetronomeActive ? 'border-highlight shadow-highlight/20' : 'border-barline'
        }`}
      >
        <MetronomeCat enabled={enabled} running={shouldShowBeat && (enabled || isMetronomeActive)} beat={currentBeat} tick={tick} tempo={tempo} disabled={false} onToggle={() => {
          stop();
          player.setMetronomeEnabled(!enabled);
          setEnabled(!enabled);
        }} />

        <div className="flex items-center gap-2">
          <input
            type="range"
            min={40}
            max={240}
            value={tempo}
            onChange={(e) => onTempoChange(parseInt(e.target.value, 10))}
            className="w-20 accent-highlight"
          />
          <span className="text-sm font-mono text-ink w-8 text-right">{tempo}</span>
        </div>
      </div>
    </div>
  );
};

export default Metronome;
