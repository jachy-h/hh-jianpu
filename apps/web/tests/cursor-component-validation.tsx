import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { parse, type PlaybackPosition } from '@hh-jianpu/core';
import { ScoreView } from '@hh-jianpu/score-view';

const target = document.querySelector<HTMLDivElement>('#score')!;
const result = document.querySelector<HTMLPreElement>('#result')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;
const score = parse('Q 1 - 0 2 | 3 4 5 6 |').score!;
button.onclick = async () => {
  const originalRequest = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = id => { frames.delete(id); };
  const root = createRoot(target);
  let beat = 0;
  const read = (): PlaybackPosition => ({ playbackBeat: beat, writtenBeat: beat, measureNumber: 1, occurrence: 0, session: 1 });
  const render = (status: 'idle' | 'playing' | 'paused', mode: 'time' | 'natural' = 'time', font = 18, reader = true) => {
    flushSync(() => root.render(<ScoreView score={score} width={900} measuresPerLine={1} noteFontSize={font} layoutMode={mode}
      currentNoteIndex={status === 'idle' ? -1 : 0} playbackStatus={status} isPlaying={status === 'playing'}
      readPlaybackPosition={reader ? read : undefined} />));
  };
  const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  const line = () => target.querySelector<SVGLineElement>('line[stroke="#2563EB"][aria-hidden="true"]');
  const x = () => Number(line()?.getAttribute('x1'));
  const report: Record<string, boolean> = {};
  try {
    render('playing'); await settle();
    const firstX = x();
    const note = [...target.querySelectorAll('text')].find(item => item.textContent === '1');
    report.started = Boolean(line()) && frames.size === 1;
    const catFrames = () => [...target.querySelectorAll<SVGImageElement>('.running-cat__frame')];
    report.catRunning = catFrames().length === 4 && catFrames().every(frame => getComputedStyle(frame).animationPlayState === 'running');
    report.catAtLineBottom = Boolean(line()) && catFrames().every(frame =>
      Math.abs(Number(frame.getAttribute('y')) + 12.5 * 1.5 - Number(line()!.getAttribute('y2'))) < 0.01);
    report.catEnlarged = catFrames().every(frame => Number(frame.getAttribute('width')) > 50 && Number(frame.getAttribute('height')) > 45);
    const nextLineStart = [...target.querySelectorAll<SVGLineElement>('line[stroke="#D6D3D1"]')]
      .map(item => Number(item.getAttribute('y1')) - 8)
      .find(y => y > Number(line()!.getAttribute('y2')));
    report.catClearsNextLine = nextLineStart !== undefined && catFrames().every(frame =>
      Number(frame.getAttribute('y')) + Number(frame.getAttribute('height')) < nextLineStart);
    beat = 0.5;
    const callback = [...frames.values()][0]; frames.clear();
    flushSync(() => callback(0)); await settle();
    report.advanced = x() > firstX && frames.size === 1;
    report.staticNotePreserved = note === [...target.querySelectorAll('text')].find(item => item.textContent === '1');
    render('paused'); await settle();
    const pausedX = x();
    report.pause = Boolean(line()) && frames.size === 0 && pausedX > firstX;
    report.catPaused = catFrames().length === 4 && catFrames().every(frame => getComputedStyle(frame).animationPlayState === 'paused');
    render('paused', 'time', 30); await settle();
    report.relayout = Boolean(line()) && x() !== pausedX && frames.size === 0;
    render('playing'); await settle();
    report.resume = Boolean(line()) && frames.size === 1;
    render('playing', 'natural'); await settle();
    report.modeSwitch = !line() && frames.size === 0;
    render('playing', 'time', 18, false); await settle();
    report.compatibility = !line() && frames.size === 0;
    render('playing');
    render('idle'); await settle();
    report.stop = !line() && catFrames().length === 0 && frames.size === 0;
    render('playing');
    flushSync(() => root.unmount());
    report.unmount = frames.size === 0;
    result.textContent = JSON.stringify({ passed: Object.values(report).every(Boolean), report }, null, 2);
  } catch (error) {
    result.textContent = JSON.stringify({ passed: false, report, error: String(error) }, null, 2);
    flushSync(() => root.unmount());
  } finally {
    window.requestAnimationFrame = originalRequest;
    window.cancelAnimationFrame = originalCancel;
  }
};
