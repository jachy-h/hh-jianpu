import React from 'react';
import { PickerPopover } from './PickerPopover';

interface OptionPickerProps {
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

/** 少量离散选项直接展示为方块，点击后立即选择并收起。 */
export const OptionPicker: React.FC<OptionPickerProps> = ({ title, values, value, format, triggerText, open, disabled, onOpen, onChange }) => (
  <PickerPopover title={title} triggerText={triggerText} triggerLabel={`${title}：${format(value)}`} open={open} disabled={disabled} onOpen={onOpen}>
    <div className="option-picker-grid" role="group" aria-label={title}>
      {values.map(option => <button key={option} type="button" data-picker-focus={option === value ? '' : undefined} aria-pressed={option === value} onClick={event => {
        onChange(option); onOpen(false);
        // 关闭后回到入口，避免键盘焦点丢到页面正文。
        event.currentTarget.closest('.arc-picker')?.querySelector<HTMLButtonElement>('.arc-picker-trigger')?.focus();
      }}>{format(option)}</button>)}
    </div>
  </PickerPopover>
);
