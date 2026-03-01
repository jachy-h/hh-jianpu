/**
 * 存储位置管理服务
 *
 * 支持两种存储位置：
 * - localStorage: 浏览器缓存（默认）
 * - fileSystem: 用户指定的本地目录（通过 File System Access API）
 *
 * 目录句柄持久化在 IndexedDB 中，浏览器重启后可恢复。
 */

// ============================================================
// 常量
// ============================================================

const IDB_DB_NAME = 'hh-jianpu-storage';
const IDB_STORE_NAME = 'handles';
const IDB_HANDLE_KEY = 'scoreDirectory';
const LS_PREF_KEY = 'hh-jianpu-storage-type';
const LS_DIR_NAME_KEY = 'hh-jianpu-storage-dir-name';

// ============================================================
// 类型
// ============================================================

export interface StorageLocation {
  readonly type: 'localStorage' | 'fileSystem';
  /** 文件系统模式下的目录名（不含完整路径；浏览器安全限制） */
  readonly directoryName?: string;
}

// ============================================================
// 兼容性检测
// ============================================================

/** 检测当前浏览器是否支持 File System Access API */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof (window as unknown as Record<string, unknown>).showDirectoryPicker === 'function'
  );
}

// ============================================================
// IndexedDB 工具（用于持久化 FileSystemDirectoryHandle）
// ============================================================

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(handle, IDB_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(IDB_HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).delete(IDB_HANDLE_KEY);
      tx.oncomplete = () => resolve();
    });
  } catch {
    // 忽略清理失败
  }
}

// ============================================================
// 权限工具
// ============================================================

/**
 * 检查/请求目录读写权限
 * @returns 是否获得权限
 */
export async function requestDirectoryPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = handle as any;
    const perm: PermissionState = await h.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    const req: PermissionState = await h.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  } catch {
    return false;
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 获取当前存储位置信息（异步，优先从 IndexedDB 恢复句柄）
 */
export async function getStorageLocation(): Promise<StorageLocation> {
  const pref = localStorage.getItem(LS_PREF_KEY);
  if (pref === 'fileSystem') {
    // 优先从 localStorage 缓存目录名（避免每次都打开 IDB）
    const cachedName = localStorage.getItem(LS_DIR_NAME_KEY);
    if (cachedName) {
      return { type: 'fileSystem', directoryName: cachedName };
    }
    const handle = await loadHandleFromIDB();
    if (handle) {
      return { type: 'fileSystem', directoryName: handle.name };
    }
  }
  return { type: 'localStorage' };
}

/**
 * 弹出目录选择器，持久化句柄
 *
 * @param currentHandle - 当前已选目录句柄（传入后 picker 默认打开该目录）
 * @throws AbortError 用户取消
 * @throws Error 浏览器不支持或权限拒绝
 */
export async function pickStorageDirectory(
  currentHandle?: FileSystemDirectoryHandle | null
): Promise<StorageLocation> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('NOT_SUPPORTED');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
    // 若存在已选句柄，打开时默认定位到该目录；否则回退到文档目录
    startIn: currentHandle ?? 'documents',
  });

  // 持久化句柄到 IndexedDB
  await saveHandleToIDB(handle);
  localStorage.setItem(LS_PREF_KEY, 'fileSystem');
  localStorage.setItem(LS_DIR_NAME_KEY, handle.name);

  return { type: 'fileSystem', directoryName: handle.name };
}

/**
 * 获取已持久化的目录句柄（不验证权限，供 pickStorageDirectory 的 startIn 使用）
 */
export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const pref = localStorage.getItem(LS_PREF_KEY);
  if (pref !== 'fileSystem') return null;
  return loadHandleFromIDB();
}

/**
 * 恢复之前选择的目录句柄并验证权限
 * @returns 句柄（如权限未授予则返回 null）
 */
export async function getActiveDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const pref = localStorage.getItem(LS_PREF_KEY);
  if (pref !== 'fileSystem') return null;

  const handle = await loadHandleFromIDB();
  if (!handle) return null;

  // 仅检查权限，不主动弹出请求（后台静默检查）
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perm: PermissionState = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
  } catch {
    // 不支持 queryPermission 的浏览器，直接返回 handle 尝试使用
    return handle;
  }

  return null;
}

/** 重置为浏览器缓存（默认） */
export async function resetStorageLocation(): Promise<void> {
  await clearHandleFromIDB();
  localStorage.removeItem(LS_PREF_KEY);
  localStorage.removeItem(LS_DIR_NAME_KEY);
}

/**
 * 放弃文件系统存储：
 * 1. 删除目录下所有 .jsonc 曲谱文件
 * 2. 清理 IDB 句柄
 * 3. 清除 localStorage 存储偏好
 * 注意：此操作不可逆，调用方应先弹出二次确认
 */
export async function abandonStorage(): Promise<void> {
  // 1. 尝试删除目录中所有 .jsonc 文件
  try {
    const handle = await loadHandleFromIDB();
    if (handle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const [name, entry] of handle as any) {
        if ((entry as FileSystemHandle).kind === 'file' && (name as string).endsWith('.jsonc')) {
          try {
            await handle.removeEntry(name as string);
          } catch {
            // 忽略单个文件删除失败
          }
        }
      }
    }
  } catch {
    // 忽略（可能因权限变更或目录已被删除）
  }

  // 2. 清理 IDB 句柄 + localStorage 偏好
  await clearHandleFromIDB();
  localStorage.removeItem(LS_PREF_KEY);
  localStorage.removeItem(LS_DIR_NAME_KEY);
}
