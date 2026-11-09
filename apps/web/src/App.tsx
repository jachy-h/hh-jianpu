import React, { Suspense, lazy } from 'react';
const MagneticArcMenuDemo = lazy(() => import('./components/MagneticArcMenu/MagneticArcMenuDemo'));
const LayoutLabPage = lazy(() => import('./pages/LayoutLabPage'));
const BeatVisualizerLabPage = lazy(() => import('./pages/BeatVisualizerLabPage'));
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MyScoresPage from './pages/MyScoresPage';
import EditorPage from './pages/EditorPage';
import HelpPage from './pages/HelpPage';
import LabsPage from './pages/LabsPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* 首页：我的谱谱列表 */}
        <Route path="/" element={<MyScoresPage />} />

        {/* 编辑器：新建 or 打开指定曲谱 */}
        <Route path="/edit" element={<EditorPage />} />
        <Route path="/edit/:id" element={<EditorPage />} />

        <Route path="/labs" element={<LabsPage />} />
        <Route path="/labs/layout" element={<Suspense fallback={<div>加载中…</div>}><LayoutLabPage /></Suspense>} />
        <Route path="/lab/beat-visualizer" element={<Navigate to="/labs/beat-visualizer" replace />} />
        <Route path="/lab/magnetic-arc-menu" element={<Navigate to="/labs/magnetic-arc-menu" replace />} />
        <Route path="/labs/beat-visualizer" element={<Suspense fallback={<div>加载中…</div>}><BeatVisualizerLabPage /></Suspense>} />

        <Route path="/labs/magnetic-arc-menu" element={<Suspense fallback={<div>加载中…</div>}><MagneticArcMenuDemo /></Suspense>} />

        {/* 帮助页 */}
        <Route path="/help" element={<HelpPage />} />

        {/* 其他路由重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
