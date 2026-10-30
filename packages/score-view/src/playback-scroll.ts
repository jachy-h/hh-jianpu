/** 使用谱面的逻辑坐标计算滚动，不受外层 CSS 旋转影响。 */
export function playbackScrollTop(lineY: number, viewportHeight: number, scrollHeight: number): number {
  return Math.max(0, Math.min(scrollHeight - viewportHeight, lineY - viewportHeight / 3));
}

/** 反复、循环及跨行跳转直接定位，避免动画扫过未播放的谱面。 */
export function isPlaybackJump(previousMeasure: number, measure: number, previousLine: number, line: number): boolean {
  return measure < previousMeasure || measure > previousMeasure + 1 || Math.abs(line - previousLine) > 1;
}
