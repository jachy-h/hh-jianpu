/** SVG 本地坐标映射至上方弧线，保证横向旋转后仍按阅读坐标选择。 */
export function arcValueIndex(x: number, y: number, count: number): number {
  let angle = Math.atan2(y - 126, x - 132) * 180 / Math.PI;
  if (angle > 0) angle = x < 132 ? -160 : -20;
  return Math.round(Math.max(0, Math.min(1, (angle + 160) / 140)) * Math.max(0, count - 1));
}

export function arcPoint(index: number, count: number, radius = 96) {
  const angle = (-160 + index / Math.max(1, count - 1) * 140) * Math.PI / 180;
  return { x: 132 + radius * Math.cos(angle), y: 126 + radius * Math.sin(angle) };
}

/** 首次按下必须命中弧线或端点的 16px 触摸容差；中央数字与留白不启动拖动。 */
export function isArcHit(x: number, y: number): boolean {
  const angle = Math.atan2(y - 126, x - 132) * 180 / Math.PI;
  if (angle >= -160 && angle <= -20 && Math.abs(Math.hypot(x - 132, y - 126) - 96) <= 16) return true;
  return [arcPoint(0, 2), arcPoint(1, 2)].some(point => Math.hypot(x - point.x, y - point.y) <= 16);
}

/** 精确输入归一化；空白或非法值不修改当前速度。 */
export function precisePickerValue(text: string, values: readonly number[], current: number): number {
  const value = Math.round(Number(text));
  if (!text.trim() || !Number.isFinite(value)) return current;
  return values.reduce((best, option) => Math.abs(option - value) < Math.abs(best - value) ? option : best, values[0]);
}
