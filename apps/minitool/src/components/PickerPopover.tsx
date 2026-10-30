import React, { useEffect, useRef } from 'react';

interface PickerPopoverProps {
  title: string;
  triggerText: string;
  triggerLabel: string;
  open: boolean;
  disabled?: boolean;
  onOpen: (open: boolean) => void;
  children: React.ReactNode;
}

/** 共用定位、外部点击关闭和键盘焦点管理，选择内容由调用方提供。 */
export const PickerPopover: React.FC<PickerPopoverProps> = ({ title, triggerText, triggerLabel, open, disabled, onOpen, children }) => {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  useEffect(() => {
    if (!open) return;
    const focusTarget = panel.current?.querySelector<HTMLElement | SVGSVGElement>('[data-picker-focus]');
    (focusTarget ?? panel.current)?.focus();
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) onOpenRef.current(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [open]);
  const close = () => { onOpen(false); trigger.current?.focus(); };
  return <div ref={root} className="arc-picker">
    <button type="button" ref={trigger} className="arc-picker-trigger" disabled={disabled} aria-label={triggerLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => onOpen(!open)}>{triggerText}</button>
    {open && <div ref={panel} className="arc-picker-panel" role="dialog" aria-label={`调整${title}`} tabIndex={-1} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    }}>
      <div className="arc-picker-heading"><span>{title}</span><button type="button" onClick={close}>完成</button></div>
      {children}
    </div>}
  </div>;
};
