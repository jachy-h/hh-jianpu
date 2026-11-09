import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createLayout, parse } from '@hh-jianpu/core';
import { ScoreView } from '@hh-jianpu/score-view';
import './layout-lab.css';

const SAMPLE = `标题：排版练习
拍号：4/4
Q 1 2 3 4 | 5/ 6/ 7 1' - | #4 3 2 1 |
C 春 天 来 了 我 们 一 起 唱 歌`;
const MODES = [{ id: 'natural', name: '自然排版' }, { id: 'aligned', name: '小节对齐' }, { id: 'time', name: '时值排版' }] as const;
const SIZES = [18, 24, 30] as const;

const LayoutLabPage: React.FC = () => {
  const [source, setSource] = useState(SAMPLE);
  const [width, setWidth] = useState(600);
  const [sourceBreaks, setSourceBreaks] = useState(true);
  const result = useMemo(() => parse(source), [source]);
  return <main className="layout-lab">
    <header className="layout-lab-header"><Link to="/labs">← 返回实验室</Link><span>HH JIANPU / LAB 03</span></header>
    <section className="layout-lab-intro"><p>NOTATION / LAYOUT STUDY</p><h1>曲谱排版实验室</h1><div>同一段旋律，观察不同排版与字号下的空间变化。</div></section>
    <section className="layout-lab-controls" aria-label="实验设置">
      <label className="layout-lab-source">曲谱源码<textarea value={source} onChange={event => setSource(event.target.value)} spellCheck={false} rows={5} /></label>
      <div className="layout-lab-options"><label>预览宽度 <strong>{width} px</strong><input type="range" min="320" max="1000" step="10" value={width} onChange={event => setWidth(Number(event.target.value))} /></label><label className="layout-lab-check"><input type="checkbox" checked={sourceBreaks} onChange={event => setSourceBreaks(event.target.checked)} />遵循源码换行</label><button type="button" onClick={() => setSource(SAMPLE)}>恢复示例</button><p>每张谱面使用相同宽度；可横向滚动查看完整内容。</p></div>
    </section>
    {result.errors.length > 0 && <p className="layout-lab-error" role="status">{result.errors.map(error => error.message).join('；')}</p>}
    {result.score && MODES.map(mode => <section className="layout-lab-section" key={mode.id}><div className="layout-lab-section-title"><h2>{mode.name}</h2><span>18 / 24 / 30 PX</span></div><div className="layout-lab-grid">{SIZES.map(size => {
      const score = result.score!;
      const layout = createLayout(score, { width, layoutMode: mode.id, noteFontSize: size, respectSourceLineBreaks: sourceBreaks, lineHeight: Math.max(60, size * 3.3), ...(mode.id === 'time' ? { lineGap: 50 } : {}) });
      const notes = layout.lines[0]?.measures.flatMap(measure => measure.notes.filter(note => !(note.note.type === 'breath' && note.note.barlineSide))) ?? [];
      const spacing = notes.length > 1 ? `${(notes[1].x - notes[0].x).toFixed(1)} px` : '—';
      return <article className="layout-lab-card" key={size}><div className="layout-lab-card-head"><strong>{size} <small>px</small></strong><span>{layout.lines.length} 行 · {Math.round(layout.width)} × {Math.round(layout.height)} px<br />首两音中心距 {spacing}</span></div><div className="layout-lab-scroll"><div className="layout-lab-score" style={{ width, height: Math.max(240, layout.height + 40) }}><ScoreView score={score} currentNoteIndex={-1} width={width} noteFontSize={size} layoutMode={mode.id} respectSourceLineBreaks={sourceBreaks} /></div></div></article>;
    })}</div></section>)}
  </main>;
};
export default LayoutLabPage;
