import React, { useEffect, useState } from 'react';
import type { PlaybackStatus } from '@hh-jianpu/core';
import { useStore } from '../../store/useStore';

interface MetronomeProps {
  tempo: number;
  status: PlaybackStatus;
  onTempoChange: (bpm: number) => void;
}

const Metronome: React.FC<MetronomeProps> = ({ tempo, status, onTempoChange }) => {
  const player = useStore((s) => s.player);
  const score = useStore((s) => s.score);
  const countdownValue = useStore((s) => s.countdownValue);
  const isMetronomeActive = useStore((s) => s.isMetronomeActive);

  const [currentBeat, setCurrentBeat] = useState(0);
  const [, setBeatsPerMeasure] = useState(4);

  const isPlaying = status === 'playing';

  useEffect(() => {
    if (score?.metadata?.timeSignature?.beats) {
      setBeatsPerMeasure(score.metadata.timeSignature.beats);
    }
  }, [score]);

  useEffect(() => {
    player.setBeatCallback((beat, bpm) => {
      setCurrentBeat(beat);
      setBeatsPerMeasure(bpm);
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
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur rounded-xl shadow-lg border transition-all ${
          isPlaying || isMetronomeActive ? 'border-highlight shadow-highlight/20' : 'border-barline'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            shouldShowBeat
              ? currentBeat === 1 || countdownValue === 1
                ? 'bg-highlight text-white scale-110'
                : 'bg-blue-200 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {shouldShowBeat ? currentBeat : '♩'}
        </div>

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
