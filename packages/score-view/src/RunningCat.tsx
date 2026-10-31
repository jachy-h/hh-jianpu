import React from 'react';
import './style.css';
import frame0 from './assets/cat-run-0.png';
import frame1 from './assets/cat-run-1.png';
import frame2 from './assets/cat-run-2.png';
import frame3 from './assets/cat-run-3.png';

const FRAMES = [frame0, frame1, frame2, frame3];
/** 图片是 284×256；前爪约在距左边 252px、高 100px 处。 */
const FRAME_WIDTH = 35.5;
const FRAME_HEIGHT = 32;
const PAW_X = 31.6;
const PAW_Y = 12.5;
const DEFAULT_SCALE = 1.5;

export interface RunningCatProps {
  /** 要推的位置，位于外层 SVG 的坐标系。 */
  readonly x: number;
  readonly y: number;
  /** 以爪子为锚点缩放；默认 1.5 倍。 */
  readonly scale?: number;
  /** 暂停时保持当前动作帧。 */
  readonly isPlaying: boolean;
}

/** SVG 播放指示装饰：独立控制跑动帧，位置由调用方提供。 */
export const RunningCat: React.FC<RunningCatProps> = ({ x, y, scale = DEFAULT_SCALE, isPlaying }) => (
  <g className="running-cat" pointerEvents="none" aria-hidden="true">
    {FRAMES.map((frame, index) => <image key={frame} href={frame} x={x - PAW_X * scale} y={y - PAW_Y * scale}
      width={FRAME_WIDTH * scale} height={FRAME_HEIGHT * scale} className={`running-cat__frame running-cat__frame--${index}`}
      style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />)}
  </g>
);
