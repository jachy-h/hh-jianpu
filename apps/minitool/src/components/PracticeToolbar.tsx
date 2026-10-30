import React, { useState } from 'react';
import { getScoreVoices } from '@hh-jianpu/core';
import type { PlaybackStatus, Score } from '@hh-jianpu/core';
import { ArcPicker } from './ArcPicker';
import { OptionPicker } from './OptionPicker';
import { MetronomeCat } from '@hh-jianpu/score-view';
import type { PracticePreference } from '../practice';

interface PracticeToolbarProps {
  score: Score | null;
  preference: PracticePreference;
  ready: boolean;
  busy: boolean;
  remaining: number;
  status: PlaybackStatus;
  beat: number;
  beatTick: number;
  loop: { startMeasure: number; endMeasure: number | null } | null;
  onPreference: (patch: Partial<PracticePreference>, stop?: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  onClearLoop: () => void;
}

const TEMPO_VALUES = Array.from({ length: 181 }, (_, index) => 40 + index);
const WARMUP_VALUES = [0, 4, 8];
const formatTempo = (value: number) => `${value} BPM`;
const formatWarmup = (value: number) => value === 0 ? '无' : `${value} 拍`;

/** 按阅读宽度重排全部操作，不滚动或裁切控件。 */
export const PracticeToolbar: React.FC<PracticeToolbarProps> = ({ score, preference: pref, ready, busy, remaining, status, beat, beatTick, loop, onPreference, onPlay, onStop, onClearLoop }) => {
  const [openPicker, setOpenPicker] = useState<'tempo' | 'warmup' | null>(null);
  return <footer className="practice-toolbar" aria-label="播放与练习操作"><div className="toolbar-row">
    <MetronomeCat enabled={pref.metronome} running={(pref.metronome && status === 'playing') || (busy && remaining > 0)} tick={beatTick} beat={beat} tempo={pref.tempo} disabled={!ready}
      onToggle={() => onPreference({ metronome: !pref.metronome }, true)} />
    <div className="toolbar-speed"><ArcPicker title="速度" values={TEMPO_VALUES} value={pref.tempo} format={formatTempo} triggerText={formatTempo(pref.tempo)} open={openPicker === 'tempo'} disabled={!ready}
      onOpen={open => setOpenPicker(open ? 'tempo' : null)} onChange={tempo => onPreference({ tempo })} /></div>
    <div className="toolbar-transport">
      <button className="toolbar-play" disabled={!ready} onClick={onPlay} aria-label={busy ? '取消预备' : status === 'playing' ? '暂停播放' : status === 'paused' ? '继续播放' : '开始播放'}>
        <span aria-hidden="true">{busy ? remaining || '…' : status === 'playing' ? 'Ⅱ' : '▶'}</span>
        {busy ? '取消' : status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '播放'}
      </button>
      <button className="toolbar-stop" onClick={onStop} aria-label="停止播放">■</button>
    </div>
    <div className="toolbar-warmup"><OptionPicker title="预备拍" values={WARMUP_VALUES} value={pref.warmup} format={formatWarmup} triggerText={`预备 ${formatWarmup(pref.warmup)}`} open={openPicker === 'warmup'} disabled={!ready}
      onOpen={open => setOpenPicker(open ? 'warmup' : null)} onChange={warmup => onPreference({ warmup }, true)} /></div>
    {score?.secondaryVoice && <fieldset className="toolbar-voices" disabled={!ready} aria-label="声部开关">
      {getScoreVoices(score).map(voice => <label key={voice.id} className="toolbar-voice"><input type="checkbox" checked={voice.id === 'upper' ? !pref.upperMuted : !pref.lowerMuted} onChange={event => onPreference(voice.id === 'upper' ? { upperMuted: !event.target.checked } : { lowerMuted: !event.target.checked }, true)} /><span>{voice.name}</span></label>)}
    </fieldset>}
    {loop && <button className="toolbar-loop" onClick={onClearLoop} aria-label="清除循环选段">{loop.endMeasure ? `A${loop.startMeasure}–B${loop.endMeasure}` : `A${loop.startMeasure} · 选 B`} <span aria-hidden="true">×</span></button>}
  </div></footer>;
};
