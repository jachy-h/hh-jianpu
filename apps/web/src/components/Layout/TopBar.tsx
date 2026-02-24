import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface TopBarProps {
  /** 右侧操作区内容 */
  actions?: React.ReactNode;
  /** 是否显示返回按钮 */
  backTo?: string;
  backLabel?: string;
  /** 居中/左侧副标题 */
  subtitle?: React.ReactNode;
}

/**
 * 各页面共用的顶部导航栏骨架
 * - 左侧：Logo（/）+ 可选返回按钮
 * - 中间：可选副标题
 * - 右侧：actions slot
 */
const TopBar: React.FC<TopBarProps> = ({ actions, backTo, backLabel = '返回', subtitle }) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-barline bg-white/80 backdrop-blur flex-shrink-0">
      {/* 左侧 */}
      <div className="flex items-center gap-2">
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors mr-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
        ) : null}

        <Link
          to="/"
          className="text-lg font-semibold text-ink tracking-tight hover:opacity-80 transition-opacity"
        >
          🎵 hh-jianpu
        </Link>

        {subtitle && <span className="ml-1">{subtitle}</span>}
      </div>

      {/* 右侧 */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
};

export default TopBar;
