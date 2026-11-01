import React, { useState } from 'react';
import { MagneticArcMenu } from './MagneticArcMenu';
import './demo.css';

const icons: Record<string, string> = { 编辑: '✎', 复制: '⧉', 分享: '↗', 收藏: '☆', 更多: '···' };
const MagneticArcMenuDemo: React.FC = () => {
  const [count, setCount] = useState(5);
  const [lastAction, setLastAction] = useState('等待操作');
  return <main className="arc-demo"><header><a href="#/">← 返回首页</a><span>INTERACTION LAB / 01</span></header><section className="arc-demo-intro"><p>COMPONENT STUDY</p><h1>轻轻靠近，<br /><em>操作自然展开。</em></h1><p>将指针移到按钮上，探索弧形菜单。<br />也可以点击按钮，或使用键盘操作。</p></section><section className="arc-demo-stage"><div className="arc-demo-orbit" /><div className="arc-demo-control"><MagneticArcMenu debug items={Object.entries({ ...icons, '较长的选项文字': '✦' }).slice(0, count).map(([label, icon]) => ({ id: label, label, icon, onClick: () => setLastAction(`已选择「${label}」`) }))} /></div><span className="arc-demo-caption">选项数量：{[3, 4, 5, 6].map(n => <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={count === n} style={{ margin: 4, fontWeight: count === n ? 700 : 400 }}>{n}</button>)}</span></section><footer><span>MAGNETIC ARC MENU</span><span aria-live="polite">{lastAction}</span></footer></main>;
};
export default MagneticArcMenuDemo;
