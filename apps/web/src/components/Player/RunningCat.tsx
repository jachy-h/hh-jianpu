import React from 'react';

interface RunningCatProps {
  /** SVG 高度，默认 28 */
  size?: number;
  /** 填充色，默认 #1a1a1a（近黑） */
  color?: string;
  /** 眼睛高光色，默认 #5ce0d8（绿松石） */
  eyeColor?: string;
  /** 是否在父容器内横向往返奔跑（需父元素 position: relative） */
  running?: boolean;
}

/**
 * 跑动小猫 — 纯 SVG + CSS 动画，零依赖
 *
 * 一只侧身奔跑的黑色小猫：
 * - 四肢交替蹬地（对角步态）
 * - 尾巴左右摇摆
 * - 身体微弹跳
 * - 胡须前后摆动
 *
 * 两种模式：
 * - 默认：原地跑动（适合按钮内）
 * - running：在父容器内横向往返穿越
 */
const RunningCat: React.FC<RunningCatProps> = ({
  size = 28,
  color = '#1a1a1a',
  eyeColor = '#5ce0d8',
  running = false,
}) => {
  const cat = (
    <svg
      viewBox="0 0 56 36"
      width={size}
      height={Math.round(size * 36 / 56)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rc-svg"
      role="img"
      aria-label="加载中"
    >
      {/* ═══ 身体 + 头（整组弹跳） ═══ */}
      <g className="rc-body">
        {/* 躯干 */}
        <ellipse cx="20" cy="19" rx="10" ry="7" fill={color} />
        {/* 头 */}
        <circle cx="38" cy="14" r="7.5" fill={color} />
        {/* 鼻吻 */}
        <ellipse cx="44" cy="15" rx="3.2" ry="2.5" fill={color} />
        {/* 脖子连接 */}
        <path d="M 28 17 Q 32 13, 33 15" fill={color} />

        {/* ── 耳朵 ── */}
        <path className="rc-ear" d="M 33 8 L 35 1 L 37 7" fill={color} />
        <path className="rc-ear" d="M 39 7 L 42 0.5 L 43 7" fill={color} />
        {/* 左耳内衬 */}
        <path d="M 34 7 L 35.5 3 L 36 7" fill="#3a3a3a" />

        {/* ── 眼睛 ── */}
        <ellipse cx="40" cy="13" rx="1.6" ry="1.9" fill="white" />
        <ellipse cx="40.8" cy="13" rx="0.8" ry="1.5" fill={color} />
        <circle cx="41.3" cy="12.2" r="0.5" fill="white" opacity="0.9" />

        {/* ── 鼻子 ── */}
        <path d="M 45.5 14.5 L 44.8 13.8 L 46.2 13.8 Z" fill="#e88b8b" />

        {/* ── 嘴巴 ── */}
        <path d="M 45.5 15 Q 44.5 16.2, 43 15.5" stroke="#3a3a3a" strokeWidth="0.4" fill="none" />

        {/* ── 胡须（前后摆动） ── */}
        <g className="rc-whisker">
          <line x1="44.5" y1="14.5" x2="54" y2="11.5" stroke={color} strokeWidth="0.35" opacity="0.45" />
          <line x1="44.5" y1="15.2" x2="54" y2="15.2" stroke={color} strokeWidth="0.35" opacity="0.45" />
          <line x1="44.5" y1="15.9" x2="54" y2="18.9" stroke={color} strokeWidth="0.35" opacity="0.45" />
        </g>
      </g>

      {/* ═══ 尾巴（S 曲线，左右摇摆） ═══ */}
      <path
        className="rc-tail"
        d="M 10 16 C 5 11, 1 7, 3 3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ═══ 四条腿（对角步态：前左↔后右，前右↔后左） ═══ */}
      {/* 前腿-左 */}
      <line className="rc-leg-fl" x1="26" y1="25" x2="28" y2="33"
            stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      {/* 前腿-右 */}
      <line className="rc-leg-fr" x1="28" y1="25" x2="30" y2="33"
            stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      {/* 后腿-左 */}
      <line className="rc-leg-bl" x1="15" y1="25" x2="13" y2="33"
            stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      {/* 后腿-右 */}
      <line className="rc-leg-br" x1="17" y1="25" x2="15" y2="33"
            stroke={color} strokeWidth="2.8" strokeLinecap="round" />

      {/* ═══ 肉垫 ═══ */}
      <circle cx="28" cy="33.5" r="1.2" fill={color} opacity="0.6" />
      <circle cx="30" cy="33.5" r="1.2" fill={color} opacity="0.6" />
    </svg>
  );

  if (running) {
    return (
      <div className="rc-runner" aria-hidden="true">
        <div className="rc-runner-inner">
          {cat}
        </div>
      </div>
    );
  }

  return cat;
};

export default RunningCat;
