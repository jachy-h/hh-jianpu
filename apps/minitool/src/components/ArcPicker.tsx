import React, { useEffect, useRef, useState } from 'react';
import { arcPoint, arcValueIndex, isArcHit, precisePickerValue } from './arc-values';
import { PickerPopover } from './PickerPopover';

interface ArcPickerProps {
  title: string;
  values: readonly number[];
  value: number;
  format: (value: number) => string;
  triggerText: string;
  open: boolean;
  disabled?: boolean;
  onOpen: (open: boolean) => void;
  onChange: (value: number) => void;
}

/** 弧线起手才启动拖动；中央数字独立提供精确输入。 */
export const ArcPicker: React.FC<ArcPickerProps> = ({ title, values, value, format, triggerText, open, disabled, onOpen, onChange }) => {
  const slider = useRef<SVGSVGElement>(null);
  const numberInput = useRef<HTMLInputElement>(null);
  const drag = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const latest = useRef(value);
  latest.current = value;
  const editing = draft !== null;
  useEffect(() => {
    if (editing) { numberInput.current?.focus(); numberInput.current?.select(); }
  }, [editing]);
  const index = Math.max(0, values.indexOf(value));
  const start = arcPoint(0, values.length);
  const end = arcPoint(values.length - 1, values.length);
  const thumb = arcPoint(index, values.length);
  const needleAngle = -70 + index / Math.max(1, values.length - 1) * 140;
  const mood = value < 80 ? '舒缓' : value < 120 ? '从容' : value < 160 ? '轻快' : '急促';
  const selectValue = (selected: number) => {
    if (selected !== latest.current) { latest.current = selected; onChange(selected); }
  };
  const select = (next: number) => selectValue(values[Math.max(0, Math.min(values.length - 1, next))]);
  const commit = () => {
    if (draftRef.current === null) return;
    const selected = precisePickerValue(draftRef.current, values, latest.current);
    draftRef.current = null; setDraft(null);
    selectValue(selected);
  };
  const handleOpen = (next: boolean) => {
    if (!next) { commit(); drag.current = null; setDragging(false); }
    onOpen(next);
  };
  const localPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  };
  return <PickerPopover title={title} triggerText={triggerText} triggerLabel={`${title}：${format(value)}`} open={open} disabled={disabled} onOpen={handleOpen}>
    <div className={`arc-picker-dial tempo-dial${dragging ? ' is-dragging' : ''}`}>
      <svg ref={slider} data-picker-focus viewBox="0 0 264 152" width="264" height="152" role="slider" tabIndex={0} aria-label={title} aria-valuemin={values[0]} aria-valuemax={values[values.length - 1]} aria-valuenow={value} aria-valuetext={format(value)}
        onPointerDown={event => {
          if (event.button !== 0) return;
          const point = localPointer(event);
          if (!point || !isArcHit(point.x, point.y)) return;
          event.preventDefault(); commit();
          drag.current = event.pointerId; setDragging(true); slider.current?.focus();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          select(arcValueIndex(point.x, point.y, values.length));
        }}
        onPointerMove={event => {
          if (drag.current !== event.pointerId) return;
          const point = localPointer(event);
          if (point) select(arcValueIndex(point.x, point.y, values.length));
        }}
        onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }} onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onKeyDown={event => {
          const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
          if (delta || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            select(event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : index + delta);
          }
        }}>
        <path className="arc-picker-track tempo-track" d={`M ${start.x} ${start.y} A 96 96 0 0 1 ${end.x} ${end.y}`} />
        <path className="arc-picker-progress tempo-progress" d={`M ${start.x} ${start.y} A 96 96 0 0 1 ${thumb.x} ${thumb.y}`} />
        {Array.from({ length: 25 }, (_, tick) => {
          // 间距逐渐变密，提示从舒缓到急促的节奏变化。
          const position = Math.pow(tick / 24, 0.72) * 24;
          const a = arcPoint(position, 25, tick % 4 === 0 ? 104 : 108), b = arcPoint(position, 25, 113);
          return <line key={tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`arc-picker-tick${tick % 4 === 0 ? ' major' : ''}`} />;
        })}
        <g className="tempo-needle" style={{ transform: `rotate(${needleAngle}deg)` }} aria-hidden="true">
          <path d="M 132 126 L 130.5 51 L 132 44 L 133.5 51 Z" />
        </g>
        <g className="arc-picker-thumb" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}><circle r="5" /><circle r="2" className="arc-picker-thumb-dot" /></g>
        <circle cx="132" cy="129" r="5" className="tempo-pulse" style={{ animationDuration: `${60 / value}s` }} aria-hidden="true" />
        <text x="22" y="145" className="arc-picker-bound">{format(values[0])}</text>
        <text x="242" y="145" textAnchor="end" className="arc-picker-bound">{format(values[values.length - 1])}</text>
      </svg>
      <div className="arc-picker-number">
        {draft === null ? <button type="button" aria-label={`精确输入${title}`} onClick={() => { draftRef.current = String(value); setDraft(String(value)); }}>{format(value)}</button>
          : <label><input ref={numberInput} type="text" inputMode="numeric" aria-label={`${title}精确数值`} value={draft}
            onChange={event => { draftRef.current = event.target.value; setDraft(event.target.value); }} onBlur={commit}
            onKeyDown={event => {
              event.stopPropagation();
              if (event.key === 'Enter') { event.preventDefault(); commit(); slider.current?.focus(); }
              if (event.key === 'Escape') { event.preventDefault(); draftRef.current = null; setDraft(null); slider.current?.focus(); }
            }} /><span>BPM</span></label>}
      </div>
    </div>
    <div className="tempo-mood" aria-hidden="true"><span>舒缓</span><span>{mood} · {value} BPM</span><span>轻快</span></div>
    <p>弧线上按住拖动 · 点击数字精确输入</p>
  </PickerPopover>;
};
