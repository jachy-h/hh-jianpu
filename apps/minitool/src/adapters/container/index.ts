interface LaunchOptions { readonly miniToolEnv?: { readonly buildVersion?: number }; }
interface Rect { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; }
interface WindowInfo {
  readonly windowWidth: number; readonly windowHeight: number; readonly safeArea?: Rect;
  readonly menuButtons?: { readonly back?: Rect | null; readonly me?: Rect | null; readonly share?: Rect | null };
}
export interface MiniToolBridge {
  getLaunchOptions?: () => Promise<LaunchOptions>;
  getStorage?: (options: { key: string }) => Promise<{ data: string | null }>;
  setStorage?: (options: { key: string; data: string }) => Promise<unknown>;
  getWindowInfo?: () => Promise<WindowInfo>;
}
declare global { interface Window { xhs?: { launchOptions?: LaunchOptions; miniTool?: MiniToolBridge }; } }

/** 桥接请求必须有界，失败不能阻塞首次选曲。 */
export function bounded<T>(request: Promise<T>, ms = 2500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('客户端响应超时')), ms);
    request.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

/** 启动参数同步优先，忽略 buildVersion 末三位编译号。 */
export async function clientVersion(): Promise<number> {
  const xhs = window.xhs;
  let build = xhs?.launchOptions?.miniToolEnv?.buildVersion;
  if (!build && typeof xhs?.miniTool?.getLaunchOptions === 'function') {
    try { build = (await bounded(xhs.miniTool.getLaunchOptions())).miniToolEnv?.buildVersion; } catch { return 0; }
  }
  return Math.floor((Number(build) || 0) / 1000);
}

/** 为原生按钮与安全区留出空间；低版本使用 CSS 基线。返回监听清理函数。 */
export function observeContainer(): () => void {
  let generation = 0;
  let disposed = false;
  const update = async () => {
    const request = ++generation;
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    const bridge = window.xhs?.miniTool;
    if (await clientVersion() < 9490 || typeof bridge?.getWindowInfo !== 'function') return;
    try {
      const info = await bounded(bridge.getWindowInfo());
      if (disposed || request !== generation) return;
      const safe = info.safeArea;
      const buttons = info.menuButtons;
      if (safe && Number.isFinite(safe.left) && Number.isFinite(info.windowWidth - safe.right)) {
        document.documentElement.style.setProperty('--safe-area-inset-left', `${Math.max(0, safe.left)}px`);
        document.documentElement.style.setProperty('--safe-area-inset-right', `${Math.max(0, info.windowWidth - safe.right)}px`);
      }
      const occupied = [safe?.top ?? 0, buttons?.back?.bottom ?? 0, buttons?.me?.bottom ?? 0, buttons?.share?.bottom ?? 0];
      if (occupied.every(Number.isFinite)) document.documentElement.style.setProperty('--container-top-space', `${Math.max(...occupied)}px`);
      if (safe && Number.isFinite(info.windowHeight - safe.bottom)) {
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${Math.max(0, info.windowHeight - safe.bottom)}px`);
      }
    } catch { /* 保留基线布局。 */ }
  };
  void update(); window.addEventListener('resize', update);
  return () => { disposed = true; generation++; window.removeEventListener('resize', update); };
}
