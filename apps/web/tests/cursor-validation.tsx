import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Tone from 'tone';
import { createLayout, parse, resolveTimeCursor } from '@hh-jianpu/core';
import { ScoreView } from '@hh-jianpu/score-view';
import { Player } from '../src/adapters/audio/synth';
import { TRIANGLE_INSTRUMENT } from '../src/adapters/audio/triangle-instrument';

const result = document.querySelector<HTMLPreElement>('#result')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;
const container = document.querySelector<HTMLDivElement>('#score')!;
const score = parse('Q ||: 1 2 3 4 :|| 5 - - - |').score!;
const layout = createLayout(score, { width: 900, layoutMode: 'time', noteFontSize: 18, lineHeight: 60 });
const notes = layout.lines[0].measures[0].notes;
const onsets: { time: number; expectedX: number; ordinal: number }[] = [];
const samples: { time: number; x: number; amplitude: number; beat: number }[] = [];
let analyser: Tone.Analyser | null = null;
const instrument = { ...TRIANGLE_INSTRUMENT, load: async (tone: typeof Tone, output: Tone.Gain) => {
  analyser = new tone.Analyser('waveform', 1024);
  output.connect(analyser);
  const bank = await TRIANGLE_INSTRUMENT.load(tone, output);
  return { ...bank, createVoice: () => {
    const voice = bank.createVoice();
    return { ...voice, noteOn: (note: Parameters<typeof voice.noteOn>[0], time: number) => {
      const ordinal = onsets.length;
      onsets.push({ time, expectedX: notes[ordinal % 4].x, ordinal });
      voice.noteOn(note, time);
    } };
  } };
} };
const player = new Player({ instruments: [instrument] });
player.loadScore(score);
player.setMetronomeEnabled(false);
let parentRenders = 0;
const root = createRoot(container);
const readPosition = () => player.getPlaybackPosition();
function render(index: number, indices: number[], status: 'idle' | 'playing' | 'paused') {
  parentRenders++;
  root.render(<ScoreView score={score} width={900} currentNoteIndex={index} activeNoteIndices={indices}
    layoutMode="time" isPlaying={status === 'playing'} playbackStatus={status} readPlaybackPosition={readPosition} />);
}
let current = -1, active: number[] = [];
player.setNoteHighlightCallback((index, indices) => { current = index; active = indices ?? []; render(current, active, player.status); });
player.setStatusChangeCallback(status => render(current, active, status));
render(current, active, 'idle');
button.onclick = async () => {
  button.disabled = true; result.textContent = '播放中：约 8 秒，途中将从 120 BPM 降至 60 BPM';
  onsets.length = 0; samples.length = 0;
  parentRenders = 0;
  try {
    player.setLoopRange(null);
    player.setTempo(120);
    await player.play();
    const context = Tone.getContext();
    const started = context.immediate();
    let changed = false;
    const speed: { before: number | null; after: number | null } = { before: null, after: null };
    let previous = player.getPlaybackPosition();
    const frame = () => {
      const time = context.immediate();
      const line = container.querySelector<SVGLineElement>('line[stroke="#2563EB"][aria-hidden="true"]');
      const values = analyser?.getValue();
      const waveform = values instanceof Float32Array ? values : values?.[0];
      let amplitude = 0;
      if (waveform) for (const value of waveform) amplitude = Math.max(amplitude, Math.abs(value));
      const position = player.getPlaybackPosition();
      if (line && position) samples.push({ time, x: Number(line.getAttribute('x1')), amplitude, beat: position.playbackBeat });
      if (!changed && time - started >= 0.8) {
        speed.before = position?.playbackBeat ?? null;
        player.setTempo(60);
        speed.after = player.getPlaybackPosition()?.playbackBeat ?? null;
        changed = true;
      }
      previous = position ?? previous;
      if (time - started < 7.4 && player.status === 'playing') { requestAnimationFrame(frame); return; }
      const comparisons = onsets.slice(0, 8).map(event => {
        // React 的 DOM 提交可能在当前 RAF 之后完成；检查起音后首个到达目标位置的画面。
        const match = samples.find(sample => sample.time >= event.time && sample.time <= event.time + 0.05
          && Math.abs(sample.x - event.expectedX) < 6);
        return { ordinal: event.ordinal, scheduled: event.time, matched: match?.time ?? null,
          latencyMs: match ? (match.time - event.time) * 1000 : null,
          errorPx: match ? match.x - event.expectedX : null };
      });
      const audible = samples.some(sample => sample.amplitude > 0.001);
      const speedJump = speed.before === null || speed.after === null ? null : Math.abs(speed.after - speed.before);
      const rate = (from: number, to: number) => {
        const interval = samples.filter(sample => sample.time - started >= from && sample.time - started <= to);
        const first = interval[0], last = interval[interval.length - 1];
        return first && last && last.time > first.time ? (last.beat - first.beat) / (last.time - first.time) : null;
      };
      const fastRate = rate(0.3, 0.7), slowRate = rate(1.5, 2.0);
      const passed = comparisons.length >= 8 && audible && speedJump !== null && speedJump < 0.03
        && fastRate !== null && fastRate > 1.8 && fastRate < 2.2 && slowRate !== null && slowRate > 0.9 && slowRate < 1.1
        && samples.length > 100 && parentRenders < 30 && comparisons.every(item => item.latencyMs !== null && item.latencyMs < 50 && item.errorPx !== null && Math.abs(item.errorPx) < 6);
      const report = { passed, audible, speedJump, fastRate, slowRate, comparisons, frames: samples.length, parentRenders, lastPosition: previous };
      player.stop();
      result.textContent = JSON.stringify(report, null, 2);
      button.disabled = false;
    };
    requestAnimationFrame(frame);
  } catch (error) { result.textContent = String(error); player.stop(); button.disabled = false; }
};

const background = document.querySelector<HTMLButtonElement>('#background')!;
const backgroundResult = document.querySelector<HTMLPreElement>('#background-result')!;
background.onclick = async () => {
  background.disabled = true;
  backgroundResult.textContent = '请切换到另一个浏览器标签页，再返回此页';
  let sawHidden = false;
  try {
    player.setTempo(60);
    player.setLoopRange({ startMeasure: 1, endMeasure: 1 });
    await player.play();
    let timeout: ReturnType<typeof setTimeout>;
    const visibility = () => {
      if (document.hidden) { sawHidden = true; return; }
      if (!sawHidden) return;
      document.removeEventListener('visibilitychange', visibility);
      clearTimeout(timeout);
      setTimeout(() => {
        const position = player.getPlaybackPosition();
        const expected = position && resolveTimeCursor(layout, position.measureNumber, position.writtenBeat);
        const line = container.querySelector<SVGLineElement>('line[stroke="#2563EB"][aria-hidden="true"]');
        const x = line ? Number(line.getAttribute('x1')) : null;
        const errorPx = expected && x !== null ? x - expected.x : null;
        backgroundResult.textContent = JSON.stringify({ passed: sawHidden && errorPx !== null && Math.abs(errorPx) < 6,
          sawHidden, position, errorPx }, null, 2);
        player.stop(); player.setLoopRange(null);
        background.disabled = false;
      }, 100);
    };
    document.addEventListener('visibilitychange', visibility);
    timeout = setTimeout(() => {
      document.removeEventListener('visibilitychange', visibility);
      backgroundResult.textContent = '未检测到后台切换，请确认浏览器标签页实际变为隐藏。';
      player.stop(); player.setLoopRange(null); background.disabled = false;
    }, 15000);
  } catch (error) { backgroundResult.textContent = String(error); player.stop(); background.disabled = false; }
};
