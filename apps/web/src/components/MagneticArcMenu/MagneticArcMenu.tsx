import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, useMotionValue, useMotionValueEvent, useSpring, type MotionStyle, type MotionValue } from 'motion/react';
import './MagneticArcMenu.css';

export interface ArcMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

export interface MagneticArcMenuProps {
  items: ArcMenuItem[];
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  magneticRange?: number;
  magneticStrength?: number;
  closeDelay?: number;
  disabled?: boolean;
  className?: string;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  debug?: boolean;
}

interface MagneticItemProps {
  item: ArcMenuItem; point: { x: number; y: number }; index: number; open: boolean;
  pointerX: MotionValue<number>; pointerY: MotionValue<number>; range: number; strength: number;
  reduced: boolean | null; onSelect: () => void; onMeasure: (id: string, width: number, height: number) => void; debug: boolean;
}

const MagneticItem: React.FC<MagneticItemProps> = ({ item, point, index, open, pointerX, pointerY, range, strength, reduced, onSelect, onMeasure, debug }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observer = new ResizeObserver(entries => { const box = entries[0]?.borderBoxSize?.[0]; onMeasure(item.id, box?.inlineSize ?? button.offsetWidth, box?.blockSize ?? button.offsetHeight); });
    observer.observe(button);
    return () => observer.disconnect();
  }, [item.id, onMeasure]);
  const positionRef = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 380, damping: 28 });
  const y = useSpring(0, { stiffness: 380, damping: 28 });
  const scale = useSpring(1, { stiffness: 380, damping: 28 });
  const emphasis = useMotionValue(0);
  const update = () => {
    const rect = positionRef.current?.getBoundingClientRect();
    if (!rect || !open || item.disabled || reduced) { x.set(0); y.set(0); scale.set(1); emphasis.set(0); return; }
    const dx = pointerX.get() - rect.left; const dy = pointerY.get() - rect.top;
    const distance = Math.hypot(dx, dy);
    const influence = Math.max(0, 1 - distance / Math.max(1, range));
    const offset = Math.min(3, Math.max(0, strength)) * influence;
    x.set(distance ? dx / distance * offset : 0); y.set(distance ? dy / distance * offset : 0);
    scale.set(1 + influence * 0.03); emphasis.set(influence);
  };
  useMotionValueEvent(pointerX, 'change', update);
  useMotionValueEvent(pointerY, 'change', update);
  useEffect(() => { if (!open) { x.set(0); y.set(0); scale.set(1); emphasis.set(0); } }, [open, x, y, scale, emphasis]);
  return <motion.div ref={positionRef} className="magnetic-arc-position" initial={false}
    animate={{ x: open ? point.x : 0, y: open ? point.y : 0, opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }}
    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: open ? 360 : 500, damping: open ? 29 : 38, delay: open ? index * 0.03 : 0 }}>
    <motion.button ref={buttonRef} type="button" className={`magnetic-arc-item ${debug ? 'arc-debug-item' : ''}`} disabled={item.disabled} tabIndex={open ? 0 : -1}
      style={{ x, y, scale, '--emphasis': emphasis } as MotionStyle} onClick={onSelect}>
      <span className="magnetic-arc-icon">{item.icon}</span><span className="magnetic-arc-label">{item.label}</span>
    </motion.button>
  </motion.div>;
};

/** 可独立使用的弧形操作菜单；角度以度数表示，默认 100°–170°。 */
export const MagneticArcMenu: React.FC<MagneticArcMenuProps> = ({ items, radius = 120, startAngle = 100, endAngle = 170, direction = 'up', magneticRange = 75, magneticStrength = 10, closeDelay = 200, disabled = false, className = '', trigger, onOpenChange, debug = false }) => {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(-10000);
  const pointerY = useMotionValue(-10000);
  const [open, setOpen] = useState(false);
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const onMeasure = useCallback((itemId: string, width: number, height: number) => setSizes(previous => previous[itemId]?.width === width && previous[itemId]?.height === height ? previous : { ...previous, [itemId]: { width, height } }), []);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  const setMenuOpen = useCallback((value: boolean) => {
    setOpen(previous => {
      if (previous !== value) onOpenChange?.(value);
      return value;
    });
  }, [onOpenChange]);
  const cancelClose = useCallback(() => clearTimeout(timer.current), []);
  const closeLater = useCallback(() => { cancelClose(); timer.current = setTimeout(() => setMenuOpen(false), closeDelay); }, [cancelClose, closeDelay, setMenuOpen]);
  const updateOrigin = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, []);
  useEffect(() => {
    if (!open) return;
    updateOrigin();
    window.addEventListener('resize', updateOrigin);
    window.addEventListener('scroll', updateOrigin, true);
    const observer = new ResizeObserver(updateOrigin);
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateOrigin); window.removeEventListener('scroll', updateOrigin, true); };
  }, [open, updateOrigin]);
  useEffect(() => () => cancelClose(), [cancelClose]);
  useEffect(() => { if (disabled) setMenuOpen(false); }, [disabled, setMenuOpen]);
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); } };
    const handleOutside = (event: PointerEvent) => { if (!triggerRef.current?.contains(event.target as Node) && !layerRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener('keydown', handleKey); window.addEventListener('pointerdown', handleOutside);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('pointerdown', handleOutside); };
  }, [open, setMenuOpen]);
  // 使用统一弧长排列，按按钮高度留出紧凑间距，并避开触发按钮。
  const dimensions = items.map(item => sizes[item.id] ?? { width: 90, height: 40 });
  const to = Math.max(startAngle, endAngle) * Math.PI / 180;
  const spacing = Math.max(42, ...dimensions.map(size => size.height + 6));
  // 足够大的半径确保最后一个选项仍处于圆弧上升段。
  const effectiveRadius = Math.max(200, radius, (Math.max(0, items.length - 1) * spacing + 60) / (Math.PI / 2 - 0.15));
  const triggerHeight = triggerRef.current?.offsetHeight ?? 40;
  const firstDistance = triggerHeight / 2 + (dimensions[0]?.height ?? 40) / 2 + 10;
  const pointAt = (angle: number) => {
    const x = effectiveRadius * (1 + Math.cos(angle)); const y = -effectiveRadius * Math.sin(angle);
    return direction === 'down' ? { x: -x, y: -y } : direction === 'left' ? { x: y, y: -x } : direction === 'right' ? { x: -y, y: x } : { x, y };
  };
  const start = Math.min(to, Math.PI - 2 * Math.asin(Math.min(1, firstDistance / (2 * effectiveRadius))));
  const points = items.map((_, index) => pointAt(start - index * spacing / effectiveRadius));
  const collision = points.some((point, i) => points.some((other, j) => j > i && Math.abs(point.x - other.x) < (dimensions[i].width + dimensions[j].width) / 2 && Math.abs(point.y - other.y) < (dimensions[i].height + dimensions[j].height) / 2));
  const handleMove = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') { pointerX.set(event.clientX); pointerY.set(event.clientY); }
  };
  const resetMagnet = () => { pointerX.set(-10000); pointerY.set(-10000); };
  const bounds = { left: Math.min(-32, ...points.map(p => p.x - 70)), right: Math.max(32, ...points.map(p => p.x + 70)), top: Math.min(-32, ...points.map(p => p.y - 32)), bottom: Math.max(32, ...points.map(p => p.y + 32)) };
  return <>
    <button ref={triggerRef} type="button" className={`magnetic-arc-trigger ${className}`} disabled={disabled} aria-label={typeof trigger === 'string' ? trigger : "操作菜单"} aria-expanded={open} aria-controls={id} onPointerEnter={event => { if (event.pointerType === 'mouse') { cancelClose(); updateOrigin(); setMenuOpen(true); } }} onPointerLeave={event => { if (event.pointerType === 'mouse') closeLater(); }} onClick={() => { cancelClose(); updateOrigin(); setMenuOpen(!open); }}><span className={open ? 'magnetic-arc-plus is-open' : 'magnetic-arc-plus'}>{trigger ?? '+'}</span></button>
    {createPortal(<div ref={layerRef} id={id} className={`magnetic-arc-layer ${className} ${open ? 'is-open' : ''}`} style={{ left: origin.x + bounds.left, top: origin.y + bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top }} onPointerEnter={cancelClose} onPointerLeave={() => { resetMagnet(); closeLater(); }} onPointerMove={handleMove} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== triggerRef.current) closeLater(); }}>
      {debug && open && <svg aria-hidden="true" style={{ position: 'absolute', overflow: 'visible', left: -bounds.left, top: -bounds.top, pointerEvents: 'none' }}><circle cx={effectiveRadius} r={effectiveRadius} fill="none" stroke={collision ? 'red' : '#60a5fa'} strokeDasharray="4 4" /><text x="8" y="-8" fill={collision ? 'red' : '#2563eb'}>{collision ? '轻微重叠' : '无碰撞'}</text></svg>}
      {items.map((item, index) => <div key={item.id} className="magnetic-arc-anchor" style={{ left: -bounds.left, top: -bounds.top }}><MagneticItem item={item} point={points[index]} index={index} open={open} pointerX={pointerX} pointerY={pointerY} range={magneticRange} strength={magneticStrength} reduced={reducedMotion} onMeasure={onMeasure} debug={debug} onSelect={() => { item.onClick?.(); setMenuOpen(false); triggerRef.current?.focus(); }} /></div>)}
    </div>, document.body)}
  </>;
};
