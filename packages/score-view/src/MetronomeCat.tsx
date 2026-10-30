import React from 'react';

interface MetronomeCatProps {
  enabled: boolean;
  running: boolean;
  tick: number;
  beat: number;
  tempo: number;
  disabled: boolean;
  onToggle: () => void;
}

/**
 * 参考 Cat typing 的手绘 SVG：每个真实节拍触发一次敲击，不自行循环计时。
 * 视觉参考：https://app.lottiefiles.com/animation/670d762c-11e0-47e0-b8e9-41a8c6b43353
 * 本组件为重绘，不包含原 Lottie 文件或外部运行时。
 */
export const MetronomeCat: React.FC<MetronomeCatProps> = ({ enabled, running, tick, beat, tempo, disabled, onToggle }) => (
  <button type="button" className={`toolbar-metronome cat-metronome${enabled ? ' enabled' : ''}`} aria-label="节拍器" aria-pressed={enabled} disabled={disabled} onClick={onToggle}>
    <svg className="metronome-cat-art" viewBox="0 0 120 96" width="90" height="72" aria-hidden="true" focusable="false">
      {/* 覆盖透明留白，使伸出按钮的整个 SVG 矩形都可点击；事件仅向父按钮冒泡一次。 */}
      <rect width="120" height="96" fill="transparent" pointerEvents={disabled ? 'none' : 'all'} />
      <ellipse cx="64" cy="89" rx="48" ry="3" className="cat-shadow" />
      <g key={tick} className={running && beat > 0 ? `cat-typing${tick % 2 ? ' tap-left' : ' tap-right'}` : ''} style={{ animationDuration: `${Math.min(240, 60 / tempo * 550)}ms` }}>
        <path className="cat-tail" d="M 32 76 C 15 75 7 67 11 58 C 13 53 18 57 17 61 C 16 68 25 69 33 69" />
        <path className="cat-body" d="M 23 86 L 31 43 L 35 13 L 49 34 Q 56 31 64 34 L 78 13 L 84 46 L 92 86 Z" />
        <g className="cat-face">
          <path d="M 37 30 L 38 23 L 43 32 M 69 32 L 75 23 L 77 33" className="cat-ear" />
          <circle cx="48" cy="44" r="2.2" className="cat-eye" /><circle cx="64" cy="44" r="2.2" className="cat-eye" />
          <path className="cat-muzzle" d="M 56 51 C 48 44 40 54 46 59 Q 51 63 56 57 Q 62 63 67 58 C 71 52 62 45 56 51" />
          <path d="M 53 49 L 59 49 L 56 53 Z" className="cat-nose" />
        </g>
        <g className="cat-paw cat-paw-left"><path d="M 44 63 Q 37 62 37 71 L 37 77 Q 42 81 47 76 L 48 69 Q 49 65 44 63 Z" /></g>
        <g className="cat-paw cat-paw-right"><path d="M 64 63 Q 59 64 60 70 L 61 77 Q 67 80 72 76 L 71 68 Q 70 62 64 63 Z" /></g>
        <path className="cat-chest" d="M 47 78 Q 42 78 42 84 L 49 84 Q 53 79 47 78" />
      </g>
      <path className="cat-keyboard" d="M 44 84 L 110 84 Q 114 84 114 87 Q 114 91 108 91 L 38 91 Q 34 90 36 87 Z" />
      <rect className="cat-laptop" x="63" y="55" width="50" height="32" rx="5" />
      <g className="cat-laptop-logo">
        <ellipse cx="88" cy="74" rx="5" ry="4" />
        <circle cx="81" cy="69" r="1.8" /><circle cx="86" cy="67" r="1.8" /><circle cx="91" cy="67" r="1.8" /><circle cx="96" cy="70" r="1.8" />
      </g>
      {running && beat > 0 && <circle cx="107" cy="82" r="1.6" className={beat === 1 ? 'cat-led downbeat' : 'cat-led'} />}
    </svg>
    <span className="cat-metronome-label">{running && beat > 0 ? `节拍 ${beat}` : '节拍器'}<i className="cat-toggle-mark" aria-hidden="true" /></span>
  </button>
);
