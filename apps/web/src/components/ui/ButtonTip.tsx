import React, { useState, useRef, useEffect, type ButtonHTMLAttributes } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react-dom';

export interface ButtonTipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮显示的文字内容 */
  children: React.ReactNode;
  /** Tip 内容 */
  tipContent: React.ReactNode;
  /** Tip 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Tip 背景颜色 */
  tipBackgroundColor?: string;
  /** Tip 文字颜色 */
  tipTextColor?: string;
  /** 按钮基础样式类名 */
  baseClassName?: string;
  /** 自定义按钮类名 */
  className?: string;
  /** 点击事件 */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'nude';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ButtonTip - 带悬浮提示的按钮组件
 * 
 * @example
 * <ButtonTip
 *   tipContent="播放音乐"
 *   onClick={handlePlay}
 *   variant="primary"
 * >
 *   播放
 * </ButtonTip>
 */
const ButtonTip: React.FC<ButtonTipProps> = ({
  children,
  tipContent,
  position = 'bottom',
  tipBackgroundColor = '#4A4A4A',
  tipTextColor = '#F5F5F5',
  baseClassName = '',
  className = '',
  onClick,
  disabled = false,
  variant = 'ghost',
  size = 'md',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const referenceRef = useRef<HTMLButtonElement>(null);

  const { x, y, strategy, refs, update } = useFloating({
    placement: position,
    middleware: [
      offset(8),
      flip(),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (referenceRef.current) {
      refs.setReference(referenceRef.current);
    }
  }, [refs]);

  useEffect(() => {
    if (isOpen) {
      update();
    }
  }, [isOpen, update]);

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  // 合并样式类名
  const buttonClassName = `${baseClassName} ${getVariantClass(variant)} ${getSizeClass(size)} ${className}`.trim();

  return (
    <>
      <button
        ref={referenceRef}
        className={buttonClassName}
        disabled={disabled}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </button>

      {isOpen && !disabled && (
        <div
          ref={refs.setFloating}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            backgroundColor: tipBackgroundColor,
            color: tipTextColor,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {tipContent}
          {/* 小箭头 */}
          <div
            style={{
              position: 'absolute',
              width: '0',
              height: '0',
              borderStyle: 'solid',
              borderWidth: '4px',
              ...getArrowPosition(position, tipBackgroundColor),
            }}
          />
        </div>
      )}
    </>
  );
};

// 辅助函数：获取变体样式
function getVariantClass(variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'nude'): string {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors';
    case 'secondary':
      return 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded transition-colors';
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 text-gray-700 rounded transition-colors border-none';
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors';
    case 'nude':
      return '';
    default:
      return 'bg-transparent hover:bg-gray-100 text-gray-700 rounded transition-colors border-none';
  }
}

// 辅助函数：获取尺寸样式
function getSizeClass(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'md':
      return 'px-3 py-1.5 text-sm';
    case 'lg':
      return 'px-4 py-2 text-base';
    default:
      return 'px-3 py-1.5 text-sm';
  }
}

// 辅助函数：获取箭头位置和边框颜色
function getArrowPosition(position: string, color: string): React.CSSProperties {
  switch (position) {
    case 'top':
      return { 
        bottom: '-8px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        borderTopColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      };
    case 'bottom':
      return { 
        top: '-8px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        borderLeftColor: 'transparent',
      };
    case 'left':
      return { 
        right: '-8px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      };
    case 'right':
      return { 
        left: '-8px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        borderTopColor: 'transparent',
        borderRightColor: color,
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      };
    default:
      return { 
        bottom: '-8px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        borderTopColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      };
  }
}

export default ButtonTip;
