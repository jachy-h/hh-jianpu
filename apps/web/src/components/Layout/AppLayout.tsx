import React from 'react';
import type { ViewMode } from '../../store/useStore';
import { EXAMPLES, EXAMPLE_KEYS } from '../../examples';
import { ImageImportButton } from '../ImageImport';
import FeedbackWidget from '../Feedback/FeedbackWidget';

interface AppLayoutProps {
  mode: ViewMode;
  title?: string;
  onModeToggle: () => void;
  onLoadExample: (key: string) => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  onImageImportClick: () => void;
  onMyScoresClick: () => void;
  myScoresCount: number;
  isAutoSaving: boolean;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  mode,
  title,
  onModeToggle,
  onLoadExample,
  onHelpClick,
  onSettingsClick,
  onImageImportClick,
  onMyScoresClick,
  myScoresCount,
  isAutoSaving,
  children,
}) => {
  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-barline bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-ink tracking-tight">
            🎵 hh-jianpu
          </h1>
          {mode === 'play' && title && (
            <span className="text-sm text-played">— {title}</span>
          )}
          {/* 自动保存指示 */}
          {isAutoSaving && (
            <span className="text-xs text-gray-400 animate-pulse">保存中…</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 我的谱谱按钮 */}
          <button
            onClick={onMyScoresClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-gray-50 transition-colors relative"
            title="我的谱谱"
          >
            <span>🎼</span>
            <span className="hidden sm:inline">我的谱谱</span>
            {myScoresCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] rounded-full px-1">
                {myScoresCount > 99 ? '99+' : myScoresCount}
              </span>
            )}
          </button>

          {/* 示例曲谱选择（仅编辑模式） */}
          {mode === 'edit' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-played">示例:</span>
              {EXAMPLE_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => onLoadExample(key)}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-highlight transition-colors"
                >
                  {EXAMPLES[key].name}
                </button>
              ))}
            </div>
          )}

          {/* 图片识别按钮（仅编辑模式） */}
          {mode === 'edit' && (
            <ImageImportButton onClick={onImageImportClick} />
          )}

          {/* 设置按钮（暂时禁用） */}
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline text-gray-300 cursor-not-allowed"
            title="暂不可用"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">设置</span>
          </button>

          {/* 帮助按钮 */}
          <button
            onClick={onHelpClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-blue-50 transition-colors text-blue-600"
            title="查看编写说明"
          >
            <span>❓</span>
            <span className="hidden sm:inline">帮助</span>
          </button>

          {/* 模式切换 */}
          <button
            onClick={onModeToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-barline hover:bg-gray-50 transition-colors"
          >
            {mode === 'edit' ? (
              <>
                <span>▶</span>
                <span>演奏模式</span>
              </>
            ) : (
              <>
                <span>✏️</span>
                <span>编辑模式</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* 右下角悬浮反馈组件 */}
      <FeedbackWidget />
    </div>
  );
};

export default AppLayout;
