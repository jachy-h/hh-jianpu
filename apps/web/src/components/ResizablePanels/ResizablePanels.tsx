import ButtonTip from '../ui/ButtonTip';
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ResizablePanelsProps {
  left: React.ReactNode;
  right: React.ReactNode;
  minLeftWidth?: number;
  minRightWidth?: number;
  defaultLeftWidth?: number;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  left,
  right,
  minLeftWidth = 300,
  minRightWidth = 300,
  defaultLeftWidth = 50, // 默认 50%
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'preview'>('editor');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleEditor = useCallback(() => {
    setIsDragging(false);
    setIsCollapsed(value => !value);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;

      // 计算新的左侧面板百分比
      const newLeftPx = e.clientX - containerRect.left;
      const newLeftPercent = (newLeftPx / containerWidth) * 100;

      // 计算最小宽度对应的百分比
      const minLeftPercent = (minLeftWidth / containerWidth) * 100;
      const minRightPercent = (minRightWidth / containerWidth) * 100;
      const maxLeftPercent = 100 - minRightPercent;

      // 限制在合理范围内
      const clampedPercent = Math.max(
        minLeftPercent,
        Math.min(maxLeftPercent, newLeftPercent)
      );

      setLeftWidth(clampedPercent);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="h-full min-h-0 flex flex-col md:flex-row relative">
      <div className="flex shrink-0 gap-1 border-b border-barline bg-paper p-2 md:hidden" role="tablist" aria-label="编辑与预览">
        {(['editor', 'preview'] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            role="tab"
            id={`panel-tab-${panel}`}
            aria-selected={mobilePanel === panel}
            aria-controls={`panel-${panel}`}
            onClick={() => setMobilePanel(panel)}
            className={`flex-1 rounded-md px-4 py-2 text-sm transition-colors ${mobilePanel === panel ? 'bg-ink text-paper shadow-sm' : 'text-played hover:bg-stone-100'}`}
          >
            {panel === 'editor' ? '编辑简谱' : '曲谱预览'}
          </button>
        ))}
      </div>
      <div className="absolute left-2 top-2 z-20 hidden md:block">
        <ButtonTip type="button" variant="secondary" size="sm"
          tipContent={isCollapsed ? '展开编辑区' : '折叠编辑区'}
          aria-label={isCollapsed ? '展开编辑区' : '折叠编辑区'}
          aria-expanded={!isCollapsed} aria-controls="panel-editor"
          onClick={handleToggleEditor}>
          {isCollapsed ? '› 编辑' : '‹ 折叠'}
        </ButtonTip>
      </div>
      {/* 左侧面板保持挂载，展开时保留编辑状态与滚动位置。 */}
      <div
        id="panel-editor"
        aria-labelledby="panel-tab-editor"
        className={`${mobilePanel === 'editor' ? 'block' : 'hidden'} w-full flex-1 md:flex-none ${isCollapsed ? 'md:hidden' : 'md:block'} md:w-[var(--panel-width)] border-r border-barline min-h-0 md:pt-11`}
        style={{ '--panel-width': `${leftWidth}%` } as React.CSSProperties}
      >
        {left}
      </div>

      {/* 分隔线（可拖动） */}
      <div
        className={`
          hidden ${isCollapsed ? '' : 'md:flex'} shrink-0 w-1 bg-barline hover:bg-blue-400 cursor-col-resize
          transition-colors duration-150 relative group
          ${isDragging ? 'bg-blue-500' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* 拖动提示（悬停时显示） */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-12 bg-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 右侧面板 */}
      <div
        id="panel-preview"
        aria-labelledby="panel-tab-preview"
        className={`${mobilePanel === 'preview' ? 'block' : 'hidden'} w-full flex-1 md:block md:w-auto min-w-0 overflow-auto p-2 sm:p-4 min-h-0 ${isCollapsed ? 'md:pt-12' : ''}`}

      >
        {right}
      </div>
    </div>
  );
};
