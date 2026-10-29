import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getScoreVoices, parse, Player } from '@hh-jianpu/core';
import type { PlaybackStatus } from '@hh-jianpu/core';
import { SCORE_CATEGORIES } from '@hh-jianpu/score-library';
import { ScoreView } from '@hh-jianpu/score-view';
import { createNativeRuntime } from './adapters/audio/runtime';
import { observeContainer } from './adapters/container';
import { preferenceStore } from './adapters/storage';
import type { Preferences, PracticePreference } from './adapters/storage';

const CATALOGUE = SCORE_CATEGORIES.flatMap(category => category.scores.map(score => ({ ...score, category, key: `${category.id}/${score.id}` })));
const DEFAULT_SELECTION = CATALOGUE.find(item => item.id === 'twinkle')?.key ?? CATALOGUE[0]?.key ?? '';
const defaultPreference = (tempo: number): PracticePreference => ({ tempo: Math.max(40, Math.min(220, tempo)), metronome: true, warmup: 0, upperMuted: false, lowerMuted: false });

const App: React.FC = () => {
  const [player] = useState(() => new Player({ instruments: [{ id: 'triangle', label: '合成音' }], runtime: async () => createNativeRuntime() }));
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [preferences, setPreferences] = useState<Preferences>({ version: 1, updatedAt: 0, selection: DEFAULT_SELECTION, scores: {} });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [indices, setIndices] = useState<number[]>([]);
  const [beat, setBeat] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [help, setHelp] = useState(false);
  const [page, setPage] = useState<'list' | 'score'>('list');
  const [landscape, setLandscape] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loop, setLoop] = useState<{ startMeasure: number; endMeasure: number | null } | null>(null);
  const store = useRef<Awaited<ReturnType<typeof preferenceStore>> | null>(null);
  const writes = useRef(Promise.resolve());
  const request = useRef(0);
  const selected = CATALOGUE.find(item => item.key === selection);
  const parsed = useMemo(() => parse(selected?.source ?? ''), [selected]);
  const score = parsed.score;
  const pref = preferences.scores[selection] ?? defaultPreference(score?.metadata.tempo ?? 120);

  useEffect(() => {
    let disposed = false;
    const lifecycle = request;
    const cleanup = observeContainer();
    void preferenceStore().then(async backend => {
      store.current = backend;
      const saved = await backend.read();
      if (disposed) return;
      if (saved) {
        setPreferences(saved);
        setSelection(CATALOGUE.some(item => item.key === saved.selection) ? saved.selection : DEFAULT_SELECTION);
      }
    }).catch(() => { if (!disposed) { store.current = null; setStorageError(true); } }).then(() => { if (!disposed) setReady(true); });
    player.setStatusChangeCallback(value => {
      setStatus(value);
      if (value === 'idle') { setBusy(false); setRemaining(0); }
    });
    player.setNoteHighlightCallback((index, active) => setIndices(active ?? (index < 0 ? [] : [index])));
    player.setBeatCallback(value => setBeat(value));
    const hide = () => { request.current++; player.stop(); setBusy(false); setRemaining(0); };
    const visibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    return () => { disposed = true; lifecycle.current++; cleanup(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); player.dispose(); };
  }, [player]);

  useEffect(() => {
    player.stop(); setLoop(null); setIndices([]); setBeat(0); setError('');
    if (score) player.loadScore(score);
  }, [score, player]);
  useEffect(() => { player.setTempo(pref.tempo); }, [player, pref.tempo, score]);
  useEffect(() => { player.setMetronomeEnabled(pref.metronome); }, [player, pref.metronome]);
  useEffect(() => { player.setVoiceMuted('upper', pref.upperMuted); player.setVoiceMuted('lower', pref.lowerMuted); }, [player, pref.upperMuted, pref.lowerMuted]);
  useEffect(() => { player.setLoopRange(loop?.endMeasure ? { startMeasure: loop.startMeasure, endMeasure: loop.endMeasure } : null); }, [loop, player]);
  useEffect(() => {
    if (!ready || !store.current) return;
    const data: Preferences = { ...preferences, selection, updatedAt: Date.now() };
    const timer = setTimeout(() => {
      writes.current = writes.current.then(async () => { const saved = await store.current!.write(data); setStorageError(!saved); }).catch(() => setStorageError(true));
    }, 350);
    return () => clearTimeout(timer);
  }, [preferences, selection, ready]);

  const handleStop = () => { request.current++; player.stop(); setBusy(false); setRemaining(0); setBeat(0); };
  const handleSelect = (key: string) => { handleStop(); setSelection(key); };
  const handlePreference = (patch: Partial<PracticePreference>, stop = false) => {
    if (stop) handleStop();
    setPreferences(previous => ({ ...previous, scores: { ...previous.scores, [selection]: { ...pref, ...patch } } }));
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
  const handleMeasure = (measure: number) => {
    handleStop();
    setLoop(previous => !previous || previous.endMeasure !== null ? { startMeasure: measure, endMeasure: null }
      : { startMeasure: Math.min(previous.startMeasure, measure), endMeasure: Math.max(previous.startMeasure, measure) });
  };


  return <div className="minitool">
    <header className="masthead"><div className="brand"><span className="brand-mark" aria-hidden="true">7<span>+</span></span><div><p className="eyebrow">HA HA JIAN PU / PRACTICE</p><h1>随身谱本<span>哈哈简谱</span></h1></div></div><button className="help-button" onClick={() => setHelp(!help)} aria-expanded={help}>练习指南 <span aria-hidden="true">{help ? '−' : '+'}</span></button></header>
    {help && <aside className="help-panel"><h2>选一首，慢慢练。</h2><p>先选分类和曲谱，再点击播放。可调整速度、打开节拍器或预备拍。点谱面小节设置起点 A，再点结束小节设置 B，播放时循环这段；清除后恢复谱面反复。</p><p>双声部曲谱可分别静音。数字下方短线表示减时，弧线表示连音，短横线延长前音。切谱会停止播放并清空选段。内置曲谱只读。</p><p>练习偏好保存在当前客户端；重要内容不依赖此缓存长期保存。</p></aside>}
    {page === 'list' ? <section className="library list-page" aria-label="内置曲谱选择"><div className="section-label"><span>选择曲目</span><span>{CATALOGUE.length} 首内置谱</span></div><div className="catalogue-list">{SCORE_CATEGORIES.filter(category => category.scores.length).map(category => <section className="catalogue-group" key={category.id}><h2>{category.name}<span>{category.scores.length} 首</span></h2><div className="catalogue-items">{category.scores.map(item => { const key = `${category.id}/${item.id}`; return <button className={`catalogue-item${selection === key ? ' selected' : ''}`} key={key} disabled={!ready} onClick={() => { handleSelect(key); setPage('score'); }}><span>{item.name}</span><span aria-hidden="true">›</span></button>; })}</div></section>)}</div></section> : <main className={`score-page${landscape ? ' landscape-reading' : ''}`}><nav className="score-nav"><button onClick={() => { handleStop(); setPage('list'); setLandscape(false); }}>‹ 曲目</button><strong>{selected?.name}</strong><button onClick={() => setLandscape(value => !value)}>{landscape ? '竖向阅读' : '横向阅读'}</button><button onClick={() => setSettingsOpen(value => !value)}>设置</button></nav><div className="score-status">{remaining ? `预备 ${remaining}` : status === 'playing' ? '正在演奏' : status === 'paused' ? '已暂停' : '准备练习'}</div><div className="sheet score-sheet">{score && !parsed.errors.length ? <div className="score-canvas"><ScoreView score={score} currentNoteIndex={indices[0] ?? -1} activeNoteIndices={indices} noteFontSize={21} onMeasureClick={handleMeasure} loopSelection={loop} respectSourceLineBreaks={false} width={landscape ? Math.max(window.innerWidth, window.innerHeight) : undefined} /></div> : <div className="empty-state">曲谱暂时无法读取。{parsed.errors[0] && <p>{parsed.errors[0].message}</p>}</div>}<div className="sheet-caption">点小节设置 A / B · {selected?.attribution || '内置曲谱 · 离线练习'}</div></div>
    {settingsOpen && <fieldset className="practice" disabled={!ready} aria-label="播放练习设置"><div className="tempo"><label htmlFor="tempo">练习速度 <strong>{pref.tempo}<small>BPM</small></strong></label><input id="tempo" aria-label="练习速度" type="range" min="40" max="220" step="1" value={pref.tempo} onChange={event => handlePreference({ tempo: Number(event.target.value) })} /></div><div className="practice-options"><label className="check"><input type="checkbox" checked={pref.metronome} onChange={event => handlePreference({ metronome: event.target.checked }, true)} />节拍器</label><label className="warmup">预备拍<select value={pref.warmup} onChange={event => handlePreference({ warmup: Number(event.target.value) }, true)}><option value="0">无</option><option value="4">4 拍</option><option value="8">8 拍</option></select></label>{score?.secondaryVoice && <div className="voices" aria-label="声部静音">{getScoreVoices(score).map(voice => <label className="check" key={voice.id}><input type="checkbox" checked={voice.id === 'upper' ? !pref.upperMuted : !pref.lowerMuted} onChange={event => handlePreference(voice.id === 'upper' ? { upperMuted: !event.target.checked } : { lowerMuted: !event.target.checked }, true)} />{voice.name}</label>)}</div>}</div></fieldset>}
    </main>}
    <footer className="player-dock"><div className="dock-inner"><div className="playback-info"><span className="eyebrow">{loop?.endMeasure ? 'A / B LOOP' : 'READY TO PRACTICE'}</span><span>{loop ? loop.endMeasure ? `第 ${loop.startMeasure}—${loop.endMeasure} 小节循环` : `A：第 ${loop.startMeasure} 小节，待选 B` : '跟着谱面，找到自己的节奏'}</span>{loop && <button className="clear-loop" onClick={() => { handleStop(); setLoop(null); }}>清除选段</button>}</div><div className="transport-buttons"><button className="stop-button" aria-label="停止播放" onClick={handleStop}><span aria-hidden="true">■</span></button><button className="play-button" disabled={!ready || !score || !!parsed.errors.length} onClick={() => { void handlePlay(); }} aria-label={busy ? '取消预备' : status === 'playing' ? '暂停播放' : status === 'paused' ? '继续播放' : '开始播放'}><span aria-hidden="true">{busy ? remaining || '…' : status === 'playing' ? 'Ⅱ' : '▶'}</span><span>{busy ? '取消' : status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '播放'}</span></button></div></div><div className="beat-track" aria-label={`当前节拍 ${beat || 0}`} aria-hidden="true">{Array.from({ length: score?.metadata.timeSignature.beats ?? 4 }, (_, i) => <i key={i} className={beat === i + 1 && status === 'playing' ? 'active' : ''} />)}</div></footer>
    {(error || storageError) && <div className="notice" role="status">{error || '偏好未能保存，本次仍可继续练习。'}</div>}
  </div>;
};
export default App;
