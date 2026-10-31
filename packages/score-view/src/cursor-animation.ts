/** 视觉帧调度与页面可见性端口，便于验证暂停与清理。 */
export interface CursorAnimationEnvironment {
  readonly request: (callback: () => void) => number;
  readonly cancel: (id: number) => void;
  readonly isHidden: () => boolean;
  readonly subscribe: (callback: () => void) => () => void;
}

/** 播放时跟随帧更新，后台停止调度，恢复后读取最新位置。 */
export function startCursorAnimation(environment: CursorAnimationEnvironment, update: () => void): () => void {
  let frame: number | null = null;
  let disposed = false;
  const tick = () => {
    frame = null;
    if (disposed || environment.isHidden()) return;
    update();
    frame = environment.request(tick);
  };
  const visibility = () => {
    if (frame !== null) environment.cancel(frame);
    frame = null;
    if (!environment.isHidden()) tick();
  };
  const unsubscribe = environment.subscribe(visibility);
  tick();
  return () => {
    disposed = true;
    if (frame !== null) environment.cancel(frame);
    unsubscribe();
  };
}
