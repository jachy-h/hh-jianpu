import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PlaybackStatus } from '@hh-jianpu/core';
import { useStore } from '../../store/useStore';
import { MetronomeCat } from '@hh-jianpu/score-view';
import { BeatVisualizer } from '@hh-jianpu/beat-visualizer';
import type { BeatSource, Meter } from '@hh-jianpu/beat-visualizer';
import './metronome-cat.css';

interface MetronomeProps {
  tempo: number;
  status: PlaybackStatus;
  onTempoChange: (bpm: number) => void;
}

const Metronome: React.FC<MetronomeProps> = ({ tempo, status, onTempoChange }) => {
  const player = useStore((s) => s.player);
  const signature = useStore((s) => s.score?.metadata.timeSignature);
  const [showBall, setShowBall] = useState(false);
  const [ballMode, setBallMode] = useState<'conducting' | 'bounce'>('bounce');
  const beats = signature?.beats;
  const supported = signature?.beatValue === 4 && (beats === 2 || beats === 3 || beats === 4);
  const meter = useMemo<Meter>(() => ({ beatsPerBar: supported ? beats : 4, beatUnit: 4 }), [supported, beats]);
  const source = useMemo<BeatSource>(() => {
    let previous = 0;
    let revision = 0;
    return {
      read: () => {
        const positionBeats = player.playbackBeat;
        if (positionBeats + 0.001 < previous) revision++;
        previous = positionBeats;
        return { positionBeats, bpm: Math.max(1, tempo), status: status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'stopped', revision };
      },
      subscribe: () => () => {},
    };
  }, [player, status, tempo]);
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
      <div className="beat-ball-popover">
        {showBall ? <div className="beat-ball-panel">
          <button type="button" className="beat-ball-mode beat-ball-control" aria-label={ballMode === 'conducting' ? '切换到均拍弹跳模式' : '切换到指挥模式'} title={ballMode === 'conducting' ? '切换到均拍弹跳模式' : '切换到指挥模式'} onClick={() => setBallMode(value => value === 'conducting' ? 'bounce' : 'conducting')}>
            {ballMode === 'conducting' ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 Q7 3 12 18 Q17 3 21 18"/><circle cx="12" cy="18" r="2"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20 L4 12 L20 12 L12 4 L12 20"/><circle cx="12" cy="20" r="2"/></svg>}
          </button>
          <button type="button" className="beat-ball-close beat-ball-control" aria-label="关闭节拍球" onClick={() => setShowBall(false)}>×</button>
          {supported ? <BeatVisualizer meter={meter} source={source} mode={ballMode} label="节拍球" /> : <div className="beat-ball-unsupported">节拍球暂支持 2/4、3/4、4/4</div>}
        </div> : <button type="button" className="beat-ball-open" onClick={() => setShowBall(true)}>展开节拍球</button>}
      </div>
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
