import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createLayout } from '@hh-jianpu/core';
import type { Score } from '@hh-jianpu/core';
import { MeasureView, createSlurSegments } from '@hh-jianpu/score-view';
import { bounded } from './index';

/** 使用谱面同一套布局与音符组件，导出完整行的开头片段。 */
export function createScoreExcerpt(score: Score): string {
  const layout = createLayout(score, { width: 720, noteFontSize: 26, marginTop: 48, respectSourceLineBreaks: false, measuresPerLine: 3 });
  const lines = layout.lines.slice(0, score.secondaryVoice ? 1 : 2);
  const last = lines[lines.length - 1];
  const height = last ? last.y + last.height + 32 : 180;
  const host = document.createElement('div');
  const root = createRoot(host);
  try {
    flushSync(() => root.render(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 720, height, viewBox: `0 0 720 ${height}` },
      ...lines.flatMap(line => [...line.measures, ...(line.secondaryMeasures ?? [])].map(measure => React.createElement(MeasureView, {
        key: `${measure.voiceId}-${measure.measure.number}`, layout: measure, currentNoteIndex: layout.allNotes.find(note => note.note.type === 'note')?.index ?? -1, noteFontSize: 26,
        joinedRepeatStart: [...line.measures, ...(line.secondaryMeasures ?? [])].some(previous => previous.voiceId === measure.voiceId && previous.measure.number === measure.measure.number - 1 && previous.measure.combinedRepeat),
        joinedRepeatEnd: Boolean(measure.measure.combinedRepeat && [...line.measures, ...(line.secondaryMeasures ?? [])].some(next => next.voiceId === measure.voiceId && next.measure.number === measure.measure.number + 1 && next.measure.repeatStart)),
      }))),
      ...createSlurSegments(layout, 26).filter(segment => segment.line < lines.length).map(segment => React.createElement('path', { key: `${segment.voiceId}-${segment.group}-${segment.line}`, d: segment.path, fill: 'none', stroke: '#1c1917', strokeWidth: 1.5 })),
    )));
    const svg = host.querySelector('svg');
    if (!svg) throw new Error('无法生成曲谱片段');
    return new XMLSerializer().serializeToString(svg);
  } finally { root.unmount(); }
}

/** 生成 3:4 练习卡，用示意高亮展示动态跟谱。 */
export async function createShareImage(name: string, score: Score): Promise<string> {
  const excerpt = new Image();
  await bounded(new Promise<void>((resolve, reject) => {
    excerpt.onload = () => resolve();
    excerpt.onerror = () => reject(new Error('无法生成曲谱片段'));
    excerpt.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createScoreExcerpt(score))}`;
  }));
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法生成分享图片');
  ctx.fillStyle = '#f5f0e5'; ctx.fillRect(0, 0, 900, 1200);
  ctx.strokeStyle = '#e4dac8'; ctx.lineWidth = 1;
  for (let y = 24; y < 1200; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
  ctx.fillStyle = '#fbf8f0'; ctx.fillRect(42, 42, 816, 1116);
  ctx.fillStyle = '#aa4936'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('♪  动态简谱 · 跟着音符一起练', 86, 135);
  ctx.textAlign = 'left'; ctx.fillStyle = '#817463'; ctx.font = '18px sans-serif'; ctx.fillText('今日，练这一首', 86, 258);
  ctx.fillStyle = '#302b28'; ctx.font = 'bold 56px serif';
  // 长曲名缩小字号，保留完整标题。
  while (ctx.measureText(name).width > 724 && Number.parseInt(ctx.font.match(/\d+/)?.[0] ?? '56') > 22) {
    const size = Number.parseInt(ctx.font.match(/\d+/)?.[0] ?? '56') - 2; ctx.font = `bold ${size}px serif`;
  }
  ctx.fillText(name, 84, 338, 724);
  ctx.fillStyle = '#817463'; ctx.font = '20px serif';
  ctx.fillText(`1=${score.metadata.key}     ${score.metadata.timeSignature.beats}/${score.metadata.timeSignature.beatValue}     ♩=${score.metadata.tempo}`, 86, 390);
  ctx.strokeStyle = '#cbbba3'; ctx.beginPath(); ctx.moveTo(86, 426); ctx.lineTo(814, 426); ctx.stroke();
  const scale = Math.min(1, 430 / excerpt.height);
  ctx.drawImage(excerpt, 90 + (720 - 720 * scale) / 2, 476 + (430 - excerpt.height * scale) / 2, 720 * scale, excerpt.height * scale);
  ctx.fillStyle = '#817463'; ctx.font = '16px sans-serif'; ctx.fillText('蓝色音符随播放移动 · 曲谱节选', 86, 920);
  ctx.fillStyle = '#aa4936'; ctx.beginPath(); ctx.arc(108, 980, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.moveTo(103, 969); ctx.lineTo(103, 991); ctx.lineTo(120, 980); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#dfd4c3'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(150, 980); ctx.lineTo(810, 980); ctx.stroke();
  ctx.strokeStyle = '#aa4936'; ctx.beginPath(); ctx.moveTo(150, 980); ctx.lineTo(350, 980); ctx.stroke();
  ctx.fillStyle = '#aa4936'; ctx.beginPath(); ctx.arc(350, 980, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#302b28'; ctx.font = '26px serif'; ctx.fillText('听着旋律，看着简谱，一起练。', 86, 1050);
  ctx.fillStyle = '#9b8e7d'; ctx.font = '16px sans-serif'; ctx.fillText('哈哈简谱 · 随身谱本', 86, 1102);
  return canvas.toDataURL('image/png');
}

/** 唤起小红书笔记编辑页，发布由用户决定。 */
export async function shareScoreToNote(name: string, image: string): Promise<void> {
  const bridge = window.xhs?.miniTool;
  if (typeof bridge?.postNote !== 'function') throw new Error('请在支持发布笔记的小红书客户端中使用');
  await bounded(bridge.postNote({
    title: Array.from(`哈哈简谱｜一起练《${name}》`).slice(0, 20).join(''),
    content: `今天用「哈哈简谱」练习《${name}》。选一首，慢慢练，一起来练习吧！\n#哈哈简谱 #简谱 #练琴日常`,
    mediaInfo: { image_resources: [{ url: image }] },
  }));
}
