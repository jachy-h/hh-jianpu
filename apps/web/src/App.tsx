import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MyScoresPage from './pages/MyScoresPage';
import EditorPage from './pages/EditorPage';
import HelpPage from './pages/HelpPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页：我的谱谱列表 */}
        <Route path="/" element={<MyScoresPage />} />

        {/* 编辑器：新建 or 打开指定曲谱 */}
        <Route path="/edit" element={<EditorPage />} />
        <Route path="/edit/:id" element={<EditorPage />} />

        {/* 帮助页 */}
        <Route path="/help" element={<HelpPage />} />

        {/* 其他路由重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
