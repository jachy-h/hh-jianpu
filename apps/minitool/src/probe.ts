import { createNativeRuntime } from './adapters/audio/runtime';
import type { PlaybackInstrument, PlaybackRuntime } from '@hh-jianpu/core';
const root = document.getElementById('root');
if (root) {
  root.innerHTML = '<h1>哈哈简谱 · 音频可行性实验</h1><p>点击播放四秒持续音，确认有声，再测试停止和再次播放。此页面独立于正式小工具。</p><button id="play">播放持续音</button> <button id="stop">停止</button><p id="status" role="status">等待操作</p>';
  let runtime: PlaybackRuntime | null = null;
  let voice: PlaybackInstrument | null = null;
  let request = 0;
  const status = document.getElementById('status')!;
  document.getElementById('play')!.addEventListener('click', () => {
    const generation = ++request;
    try {
      if (!runtime) runtime = createNativeRuntime();
      const current = runtime;
      void current.start().then(() => current.loadInstrument('triangle')).then(bank => {
        if (request !== generation) return;
        voice?.releaseAll(); voice = bank.createVoice();
        const time = current.now(); voice.noteOn({ id: 'probe', frequency: 261.626 }, time); voice.noteOff('probe', time + 4);
        status.textContent = '持续音播放中（四秒）';
      }).catch(error => { if (request === generation) status.textContent = String(error); });
    } catch (error) { status.textContent = String(error); }
  });
  const stop = () => { request++; voice?.releaseAll(); status.textContent = '已停止，可再次播放'; };
  document.getElementById('stop')!.addEventListener('click', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', () => { stop(); runtime?.dispose(); runtime = null; });
}
