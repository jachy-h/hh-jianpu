/** 点击反馈采用 800ms 背景淡出；键盘导航保留背景式焦点提示。 */
export function installInteractionFeedback(root: HTMLElement): void {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
  root.addEventListener('pointerdown', () => root.classList.remove('keyboard-navigation'), true);
  root.addEventListener('keydown', event => {
    if (event.key === 'Tab') root.classList.add('keyboard-navigation');
  }, true);
  root.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest('button,[role="button"],label');
    if (!element || !root.contains(element) || element.hasAttribute('disabled')) return;
    clearTimeout(timers.get(element));
    element.classList.remove('tap-highlight');
    // 单次用户点击重启动画，不在绘制或滚动循环中读取布局。
    element.getBoundingClientRect();
    element.classList.add('tap-highlight');
    timers.set(element, setTimeout(() => { element.classList.remove('tap-highlight'); timers.delete(element); }, 850));
  });
}
