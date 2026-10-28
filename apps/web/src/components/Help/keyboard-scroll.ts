interface KeyboardScrollInput {
  readonly distancePastTop: number;
  readonly keyboardWidth: number;
  readonly availableRightWidth: number;
  readonly isDesktop: boolean;
}

const PINNED_READING_DISTANCE_PX = 48;
const SLIDE_DISTANCE_PX = 320;
const RIGHT_GAP_PX = 16;

/** 内容继续向后滚动时，同一块键盘从贴顶位置平移至正文右侧，并等比例缩放。 */
export const calculateKeyboardScrollTransform = ({ distancePastTop, keyboardWidth, availableRightWidth, isDesktop }: KeyboardScrollInput) => {
  const linearProgress = isDesktop
    ? Math.max(0, Math.min(1, (distancePastTop - PINNED_READING_DISTANCE_PX) / SLIDE_DISTANCE_PX)) : 0;
  const progress = linearProgress * linearProgress * (3 - 2 * linearProgress);
  const targetScale = keyboardWidth > 0 ? Math.min(1, Math.max(1, availableRightWidth) / keyboardWidth) : 1;
  return {
    progress,
    scale: 1 + (targetScale - 1) * progress,
    translateX: (keyboardWidth + RIGHT_GAP_PX) * progress,
  };
};
