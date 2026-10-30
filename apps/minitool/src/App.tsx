import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parse, Player } from '@hh-jianpu/core';
import type { PlaybackStatus } from '@hh-jianpu/core';
import { SCORE_CATEGORIES } from '@hh-jianpu/score-library';
import { ScoreView } from '@hh-jianpu/score-view';
import { createNativeRuntime } from './adapters/audio/runtime';
import { MINITOOL_CONFIG } from './config';
import { observeContainer } from './adapters/container';
import { createShareImage, shareScoreToNote } from './adapters/container/share';
import { ReadingViewport } from './components/ReadingViewport';
import { PracticeToolbar } from './components/PracticeToolbar';
import { AuthorInvitation } from './components/AuthorInvitation';
import { defaultPreference } from './practice';
import type { PracticePreference } from './practice';

const CATALOGUE = SCORE_CATEGORIES.flatMap(category => category.scores.map(score => ({ ...score, category, key: `${category.id}/${score.id}` })));
const DEFAULT_SELECTION = CATALOGUE.find(item => item.id === 'twinkle')?.key ?? CATALOGUE[0]?.key ?? '';

const App: React.FC = () => {
  const [player] = useState(() => new Player({ instruments: [{ id: 'triangle', label: '合成音' }], runtime: async () => createNativeRuntime() }));
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [preference, setPreference] = useState<PracticePreference>(defaultPreference(120));
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [indices, setIndices] = useState<number[]>([]);
  const [beat, setBeat] = useState(0);
  const [beatTick, setBeatTick] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const shareRequest = useRef(0);
  const [page, setPage] = useState<'list' | 'score'>('list');
  const [highlightedSelection, setHighlightedSelection] = useState<string | null>(null);
  const [landscape, setLandscape] = useState(false);
  const [loop, setLoop] = useState<{ startMeasure: number; endMeasure: number | null } | null>(null);
  const request = useRef(0);
  const selected = CATALOGUE.find(item => item.key === selection);
  const parsed = useMemo(() => parse(selected?.source ?? ''), [selected]);
  const score = parsed.score;
  const pref = preference;

  useEffect(() => {
    const lifecycle = request;
    const sharingLifecycle = shareRequest;
    const cleanup = observeContainer();
    setReady(true);
    player.setStatusChangeCallback(value => {
      setStatus(value);
      if (value !== 'playing') setBeat(0);
      if (value === 'idle') { setBusy(false); setRemaining(0); }
    });
    player.setNoteHighlightCallback((index, active) => setIndices(active ?? (index < 0 ? [] : [index])));
    player.setBeatCallback(value => { setBeat(value); setBeatTick(previous => previous + 1); });
    const hide = () => { request.current++; player.stop(); setBusy(false); setRemaining(0); };
    const visibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    return () => { lifecycle.current++; sharingLifecycle.current++; cleanup(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); player.dispose(); };
  }, [player]);

  useEffect(() => {
    player.stop(); setLoop(null); setIndices([]); setBeat(0); setError('');
    if (score) player.loadScore(score);
  }, [score, player]);
  useEffect(() => { player.setTempo(pref.tempo); }, [player, pref.tempo, score]);
  useEffect(() => { player.setMetronomeEnabled(pref.metronome); }, [player, pref.metronome]);
  useEffect(() => { player.setVoiceMuted('upper', pref.upperMuted); player.setVoiceMuted('lower', pref.lowerMuted); }, [player, pref.upperMuted, pref.lowerMuted]);
  useEffect(() => { player.setLoopRange(loop?.endMeasure ? { startMeasure: loop.startMeasure, endMeasure: loop.endMeasure } : null); }, [loop, player]);
  const handleStop = () => { request.current++; player.stop(); setBusy(false); setRemaining(0); setBeat(0); };
  const handleSelect = (key: string) => {
    handleStop();
    const item = CATALOGUE.find(entry => entry.key === key);
    setPreference(defaultPreference(parse(item?.source ?? '').score?.metadata.tempo ?? 120));
    setSelection(key);
    setHighlightedSelection(key);
  };
  const handleBackToList = () => { shareRequest.current++; sharingRef.current = false; setSharing(false); handleStop(); setPage('list'); };
  const handlePreference = (patch: Partial<PracticePreference>, stop = false) => {
    if (stop) handleStop();
    setPreference(previous => ({ ...previous, ...patch }));
  };
  const handlePlay = async () => {
    if (busy) { handleStop(); return; }
    if (status === 'playing') { player.pause(); return; }
    if (!score || parsed.errors.length) return;
    const generation = ++request.current;
    setError(''); setBusy(true);
    const play = async () => {
      if (generation !== request.current) return;
      setRemaining(0);
      try { await player.play(); } catch (cause) { if (generation === request.current) { player.stop(); setError(cause instanceof Error ? cause.message : '音频播放失败，请重试'); } }
      if (generation === request.current) setBusy(false);
    };
    try {
      if (status !== 'paused' && pref.warmup > 0) await player.startMetronomeWarmup(pref.warmup, () => { void play(); }, setRemaining);
      else await play();
    } catch (cause) {
      if (generation === request.current) { player.stop(); setBusy(false); setRemaining(0); setError(cause instanceof Error ? cause.message : '音频初始化失败'); }
    }
  };
  const handleShare = async () => {
    if (sharingRef.current || !selected || !score) return;
    sharingRef.current = true;
    const generation = ++shareRequest.current;
    setSharing(true);
    setError('');
    try {
      if (typeof window.xhs?.miniTool?.postNote !== 'function') throw new Error('请在支持发布笔记的小红书客户端中使用');
      handleStop();
      const image = await createShareImage(selected.name, score);
      if (generation !== shareRequest.current) return;
      await shareScoreToNote(selected.name, image);
    } catch {
      if (generation === shareRequest.current) setError('未能打开笔记发布页，请在小红书客户端中重试。');
    } finally {
      if (generation === shareRequest.current) { sharingRef.current = false; setSharing(false); }
    }
  };
  const handleMeasure = (measure: number) => {
    handleStop();
    setLoop(previous => !previous || previous.endMeasure !== null ? { startMeasure: measure, endMeasure: null }
      : { startMeasure: Math.min(previous.startMeasure, measure), endMeasure: Math.max(previous.startMeasure, measure) });
  };


  return <div className="minitool">
    {page === 'list' && <header className="masthead"><div className="brand"><span className="brand-mark" aria-hidden="true">7<span>+</span></span><div><p className="eyebrow">HA HA JIAN PU / PRACTICE</p><h1>哈哈简谱<span>随身谱本</span></h1></div></div><button className="help-button" onClick={() => setHelp(!help)} aria-expanded={help}>练习指南 <span aria-hidden="true">{help ? '−' : '+'}</span></button></header>}
    {page === 'list' && help && <aside className="help-panel"><h2>选一首，慢慢练。</h2><p>先选分类和曲谱，再点击播放。可调整速度、打开节拍器或预备拍。点谱面小节设置起点 A，再点结束小节设置 B，播放时循环这段；清除后恢复谱面反复。</p><p>双声部曲谱可分别静音。数字下方短线表示减时，弧线表示连音，短横线延长前音。切谱会停止播放并清空选段。内置曲谱只读。</p><p>每次打开曲谱时恢复默认练习设置。</p></aside>}
    {page === 'list' ? <section className="library list-page" aria-label="内置曲谱选择"><div className="section-label"><span>选择曲目</span><span>{CATALOGUE.length} 首内置谱</span></div><div className="catalogue-list">{SCORE_CATEGORIES.filter(category => category.scores.length).map(category => <section className="catalogue-group" key={category.id}><h2>{category.name}<span>{category.scores.length} 首</span></h2><div className="catalogue-items">{category.scores.map(item => { const key = `${category.id}/${item.id}`; return <button className={`catalogue-item${highlightedSelection === key ? ' selected' : ''}`} key={key} disabled={!ready} onClick={() => { handleSelect(key); setPage('score'); }}><span>{item.name}</span><span aria-hidden="true">›</span></button>; })}</div></section>)}</div><AuthorInvitation /></section> : <ReadingViewport landscape={landscape}><nav className="score-nav"><button onClick={handleBackToList}>‹ 曲目</button><strong>{selected?.name}</strong><button onClick={() => setLandscape(value => !value)}>{landscape ? '竖向阅读' : '横向阅读'}</button><button className="share-button" onClick={() => { void handleShare(); }} disabled={sharing || !selected} aria-label={sharing ? '正在打开笔记发布页' : '发笔记'} title={sharing ? '正在打开笔记发布页' : '发笔记'}>{sharing ? '生成中…' : '发笔记'}</button></nav><div className="sheet score-sheet">{score && !parsed.errors.length ? <div className="score-canvas"><ScoreView score={score} currentNoteIndex={indices[0] ?? -1} activeNoteIndices={indices} noteFontSize={21} onMeasureClick={handleMeasure} loopSelection={loop} respectSourceLineBreaks={false} compactHeader isPlaying={status === 'playing'} followResumeDelayMs={MINITOOL_CONFIG.followResumeDelayMs} /></div> : <div className="empty-state">曲谱暂时无法读取。{parsed.errors[0] && <p>{parsed.errors[0].message}</p>}</div>}</div>
      <PracticeToolbar score={score} preference={pref} ready={ready && !!score && !parsed.errors.length} busy={busy} remaining={remaining} status={status} beat={beat} beatTick={beatTick} loop={loop}
        onPreference={handlePreference} onPlay={() => { void handlePlay(); }} onStop={handleStop} onClearLoop={() => { handleStop(); setLoop(null); }} />
      {error && <div className="reading-notice" role="status">{error}</div>}
    </ReadingViewport>}
    {page === 'list' && error && <div className="notice" role="status">{error}</div>}
  </div>;
};
export default App;
