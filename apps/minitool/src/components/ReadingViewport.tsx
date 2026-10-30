import React, { useEffect, useRef, useState } from 'react';

/** 在物理安全区域内旋转整个阅读界面，谱面和工具栏共用逻辑尺寸。 */
export const ReadingViewport: React.FC<{ landscape: boolean; children: React.ReactNode }> = ({ landscape, children }) => {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  const rotated = landscape && size.height > size.width;
  const logicalWidth = rotated ? size.height : size.width;
  return <div className="reading-viewport" ref={viewport}>
    <main className={`reading-surface${logicalWidth >= 600 ? ' reading-wide' : ''}`} style={rotated ? {
      width: size.height, height: size.width,
      transform: `translateX(${size.width}px) rotate(90deg)`,
    } : undefined}>{children}</main>
  </div>;
};
