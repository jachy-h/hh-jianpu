import React, { useState, useRef, useEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react-dom';

export interface TextTipProps {
  /** 显示的文字内容 */
  children: React.ReactNode;
  /** Tip 内容 */
  tipContent: React.ReactNode;
  /** Tip 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 文字颜色 */
  color?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** Tip 背景颜色 */
  tipBackgroundColor?: string;
  /** Tip 文字颜色 */
  tipTextColor?: string;
  /** 自定义 className */
  className?: string;
}

/**
 * TextTip - 悬浮提示组件
 * 
 * @example
 * <TextTip tipContent="每 30 秒自动保存" color="text-green-600">
 *   已自动保存
 * </TextTip>
 */
const TextTip: React.FC<TextTipProps> = ({
  children,
  tipContent,
  position = 'top',
  color,
  tipBackgroundColor = '#4A4A4A',
  tipTextColor = '#F5F5F5',
  className = '',
  onClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const referenceRef = useRef<HTMLElement>(null);

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
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  return (
    <>
      <span
        ref={referenceRef}
        className={className}
        style={color ? { color } : {}}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {children}
      </span>

      {isOpen && (
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

export default TextTip;
