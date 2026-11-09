import React from 'react';
import { Link } from 'react-router-dom';
import './labs.css';

const experiments = [
  { path: '/labs/layout', number: '03', title: '曲谱排版', description: '对比字号、排版模式与谱面间距。', tag: 'NOTATION' },
  { path: '/labs/beat-visualizer', number: '01', title: '节拍可视化', description: '探索节拍、节奏与动态视觉的关系。', tag: 'MUSIC' },
  { path: '/labs/magnetic-arc-menu', number: '02', title: '磁吸弧形菜单', description: '体验沿弧线展开、随指针轻盈响应的操作菜单。', tag: 'INTERACTION' },
];

const LabsPage: React.FC = () => (
  <main className="labs-page">
    <header className="labs-header"><Link to="/">← 返回首页</Link><span>HH JIANPU / LABS</span></header>
    <section className="labs-content">
      <div className="labs-intro"><p>EXPERIMENTS &amp; IDEAS</p><h1>实验室<span> / Labs</span></h1><div>一些正在探索的想法。<br />从音乐到交互，欢迎随意体验。</div></div>
      <div className="labs-list" aria-label="实验项目">
        {experiments.map(experiment => <Link className="labs-item" to={experiment.path} key={experiment.path}>
          <span className="labs-number">{experiment.number}</span><span className="labs-item-main"><span className="labs-title">{experiment.title}</span><span className="labs-description">{experiment.description}</span></span><span className="labs-tag">{experiment.tag}</span><span className="labs-arrow" aria-hidden="true">↗</span>
        </Link>)}
      </div>
    </section>
    <footer className="labs-footer"><span>MAKE ROOM FOR PLAY</span><span>实验进行中 · {String(experiments.length).padStart(2, '0')}</span></footer>
  </main>
);
export default LabsPage;
