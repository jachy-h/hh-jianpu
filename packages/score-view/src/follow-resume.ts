/** 活动、按住拖动及播放暂停均可重置的跟随恢复计时器。 */
export function createFollowResumeTimer(delay: number, resume: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let enabled = false;
  let held = false;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const activity = () => {
    clear();
    if (enabled && !held) timer = setTimeout(resume, delay);
  };
  return {
    activity,
    enable: (value: boolean) => { enabled = value; activity(); },
    hold: (value: boolean) => { held = value; activity(); },
    dispose: clear,
  };
}
