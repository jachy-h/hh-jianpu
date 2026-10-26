/**
 * 我的谱谱 - 存储服务
 *
 * 主存储：localStorage（同步，始终可用）
 * 副存储：本地文件系统（通过 File System Access API，用户选择目录后启用）
 *
 * 策略：所有读写优先走 localStorage 保证速度与兼容性；
 *       若用户已选择本地目录，每次写入后异步同步一份 JSON 文件到该目录。
 */

import { getActiveDirectoryHandle, getStorageLocation } from '../storageLocation';

const STORAGE_KEY = 'hh-jianpu-my-scores';

// 稳定 ID 的可逆文件名编码；备份导入仅接受字母、数字、下划线与短横线。
function safeFileName(id: string): string {
  return `${encodeURIComponent(id).replace(/\./g, '%2E')}.jsonc`;
}

const MANIFEST_FILE = 'hh-jianpu-manifest.json';
let filesystemSyncQueue: Promise<void> = Promise.resolve();
let lastFilesystemSyncError: string | null = null;
export type FilesystemSyncStatus = 'idle' | 'saving' | 'saved' | 'error';
export interface FilesystemSyncState {
  readonly status: FilesystemSyncStatus;
  readonly error: string | null;
  readonly lastSavedAt: number | null;
}
let filesystemSyncState: FilesystemSyncState = { status: 'idle', error: null, lastSavedAt: null };
const filesystemSyncListeners = new Set<(state: FilesystemSyncState) => void>();

function setFilesystemSyncState(state: FilesystemSyncState): void {
  filesystemSyncState = state;
  filesystemSyncListeners.forEach((listener) => listener(state));
}

export function getFilesystemSyncState(): FilesystemSyncState {
  return filesystemSyncState;
}

export function subscribeFilesystemSync(listener: (state: FilesystemSyncState) => void): () => void {
  filesystemSyncListeners.add(listener);
  return () => filesystemSyncListeners.delete(listener);
}

export async function retryFilesystemSync(): Promise<void> {
  await syncToFileSystem(loadMyScores());
}

export function getFilesystemSyncError(): string | null {
  return lastFilesystemSyncError;
}

// ============================================================
// 数据结构
// ============================================================

export interface MyScore {
  readonly id: string;
  title: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface FilesystemScanResult {
  readonly scores: MyScore[];
  /** 同一曲谱 ID 在浏览器与目录中的内容不同时，保留下来的副本数量。 */
  readonly conflictCopies: number;
}

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function serializeMyScoresBackup(scores: MyScore[] = loadMyScores()): string {
  return JSON.stringify({ format: 'hh-jianpu-backup', version: 1, exportedAt: Date.now(), scores }, null, 2);
}

export function importMyScoresBackup(text: string): { imported: number; skipped: number } {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || !('format' in parsed) || !('version' in parsed) || !('scores' in parsed)) {
    throw new Error('备份文件格式不正确');
  }
  const backup = parsed as { format: unknown; version: unknown; scores: unknown };
  if (backup.format !== 'hh-jianpu-backup' || backup.version !== 1 || !Array.isArray(backup.scores)) {
    throw new Error('不支持此备份格式或版本');
  }

  const existing = loadMyScores();
  const byId = new Map(existing.map((score) => [score.id, score]));
  let imported = 0;
  let skipped = 0;
  for (const item of backup.scores) {
    if (!isBackupScore(item)) {
      skipped++;
      continue;
    }
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      imported++;
    } else if (current.source === item.source && current.title === item.title) {
      skipped++;
    } else {
      const duplicate: MyScore = {
        ...item,
        id: generateId(),
        title: `${item.title}（导入副本）`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      byId.set(duplicate.id, duplicate);
      imported++;
    }
  }
  if (imported > 0) {
    persistMyScores(Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt));
  }
  return { imported, skipped };
}

function isBackupScore(value: unknown): value is MyScore {
  if (typeof value !== 'object' || value === null) return false;
  const score = value as Partial<MyScore>;
  return typeof score.id === 'string' && /^[A-Za-z0-9_-]+$/.test(score.id) &&
    typeof score.title === 'string' && typeof score.source === 'string' &&
    typeof score.createdAt === 'number' && Number.isFinite(score.createdAt) &&
    typeof score.updatedAt === 'number' && Number.isFinite(score.updatedAt);
}

// ============================================================
// CRUD 操作
// ============================================================

/** 加载所有已保存曲谱（最新在前） */
export function loadMyScores(): MyScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBackupScore).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function persistMyScores(scores: MyScore[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  // 异步同步到文件系统（fire-and-forget）
  void syncToFileSystem(scores);
}

// ============================================================
// 文件系统同步
// ============================================================


/**
 * 按稳定 ID 串行备份曲谱，只重写内容变化的文件，并维护删除墓碑。
 */
async function syncToFileSystem(scores: MyScore[]): Promise<void> {
  scores = scores.map((score) => ({ ...score }));
  filesystemSyncQueue = filesystemSyncQueue.then(async () => {
   setFilesystemSyncState({ ...filesystemSyncState, status: 'saving', error: null });
   try {
    const handle = await getActiveDirectoryHandle();
    if (!handle) {
      const location = await getStorageLocation();
      if (location.type === 'fileSystem') throw new Error('请重新授权所选目录的读写权限');
      lastFilesystemSyncError = null;
      setFilesystemSyncState({ status: 'idle', error: null, lastSavedAt: filesystemSyncState.lastSavedAt });
      return;
    }
    let previousIds: string[] = [];
    let previousDeletedIds: string[] = [];
    try {
      const manifestFile = await (await handle.getFileHandle(MANIFEST_FILE)).getFile();
      const manifest = JSON.parse(await manifestFile.text()) as { scoreIds?: unknown; deletedIds?: unknown };
      if (Array.isArray(manifest.scoreIds)) {
        previousIds = manifest.scoreIds.filter((id): id is string => typeof id === 'string');
      }
      if (Array.isArray(manifest.deletedIds)) {
        previousDeletedIds = manifest.deletedIds.filter((id): id is string => typeof id === 'string');
      }
    } catch {
      // First sync or a legacy directory without a manifest.
    }

    for (const score of scores) {
      const fileName = safeFileName(score.id);
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const content = JSON.stringify(score, null, 2);
      const fullContent = `// 请在 http://hh-jianpu.jinyu.cool/ 中导入使用\n\n${content}`;

      if (await (await fileHandle.getFile()).text() === fullContent) continue;
      const writable = await fileHandle.createWritable();
      await writable.write(fullContent);
      await writable.close();
    }
    const currentIds = new Set(scores.map((score) => score.id));
    const failedDeletes: string[] = [];
    for (const oldId of previousIds) {
      if (!currentIds.has(oldId)) {
        try {
          await handle.removeEntry(safeFileName(oldId));
        } catch {
          failedDeletes.push(oldId);
        }
      }
    }
    const manifestHandle = await handle.getFileHandle(MANIFEST_FILE, { create: true });
    const manifestWritable = await manifestHandle.createWritable();
    const deletedIds = new Set([...previousDeletedIds, ...previousIds.filter((id) => !currentIds.has(id)), ...failedDeletes]);
    for (const id of currentIds) deletedIds.delete(id);
    await manifestWritable.write(JSON.stringify({ version: 1, scoreIds: [...currentIds], deletedIds: [...deletedIds] }, null, 2));
    await manifestWritable.close();
    lastFilesystemSyncError = null;
    setFilesystemSyncState({ status: 'saved', error: null, lastSavedAt: Date.now() });
   } catch (error) {
    lastFilesystemSyncError = error instanceof Error ? error.message : '目录备份写入失败';
    setFilesystemSyncState({ status: 'error', error: lastFilesystemSyncError, lastSavedAt: filesystemSyncState.lastSavedAt });
   }
  });
  await filesystemSyncQueue;
}

/**
 * 将当前 localStorage 中的曲谱迁移（导出）到文件系统目录
 * 通常在用户完成目录选择后调用
 */
export async function migrateScoresToFileSystem(): Promise<void> {
  const scores = loadMyScores();
  await syncToFileSystem(scores);
}

/** 创建新曲谱，返回新建条目 */
export function createMyScore(source: string, title: string): MyScore {
  const scores = loadMyScores();
  const now = Date.now();
  const score: MyScore = {
    id: generateId(),
    title: title || '未命名曲谱',
    source,
    createdAt: now,
    updatedAt: now,
  };
  scores.unshift(score);
  persistMyScores(scores);
  return score;
}

/** 更新已有曲谱内容或标题，返回更新后条目；不存在则返回 null */
export function updateMyScore(
  id: string,
  updates: Partial<Pick<MyScore, 'source' | 'title'>>
): MyScore | null {
  const scores = loadMyScores();
  const index = scores.findIndex((s) => s.id === id);
  if (index === -1) return null;
  scores[index] = { ...scores[index], ...updates, updatedAt: Date.now() };
  persistMyScores(scores);
  return scores[index];
}

/** 删除曲谱 */
export function deleteMyScore(id: string): void {
  const scores = loadMyScores().filter((s) => s.id !== id);
  persistMyScores(scores);
}

/** 根据 ID 查找曲谱 */
export function findMyScore(id: string): MyScore | null {
  return loadMyScores().find((s) => s.id === id) ?? null;
}

/**
 * 从已选的文件系统目录扫描所有 .jsonc 文件，合并到 localStorage 并返回合并后的列表
 * 文件内容格式与 syncToFileSystem 写入的格式一致
 * 若目录不可用（无权限/未选择），退化为返回 localStorage 中的数据
 */
export async function scanScoresFromFileSystem(): Promise<FilesystemScanResult> {
  await filesystemSyncQueue;
  try {
    const handle = await getActiveDirectoryHandle();
    if (!handle) {
      if ((await getStorageLocation()).type === 'fileSystem') throw new Error('请重新授权所选目录的读写权限');
      return { scores: loadMyScores(), conflictCopies: 0 };
    }

    const scanned: MyScore[] = [];
    let managedIds: Set<string> | null = null;
    let deletedIds = new Set<string>();
    try {
      const manifestFile = await (await handle.getFileHandle(MANIFEST_FILE)).getFile();
      const manifest = JSON.parse(await manifestFile.text()) as { scoreIds?: unknown; deletedIds?: unknown };
      if (Array.isArray(manifest.scoreIds)) managedIds = new Set(manifest.scoreIds.filter((id): id is string => typeof id === 'string'));
      if (Array.isArray(manifest.deletedIds)) deletedIds = new Set(manifest.deletedIds.filter((id): id is string => typeof id === 'string'));
    } catch {
      // Legacy folders without a manifest remain importable.
    }

    // FileSystemDirectoryHandle 是 AsyncIterable<[string, FileSystemHandle]>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [, entry] of handle as any) {
      const fileEntry = entry as FileSystemHandle;
      if (fileEntry.kind !== 'file' || !fileEntry.name.endsWith('.jsonc')) continue;
      const managedId = fileEntry.name.match(/^(score-[\w-]+)\.jsonc$/)?.[1];
      if (managedId && managedIds && (!managedIds.has(managedId) || deletedIds.has(managedId))) continue;
      try {
        const file = await (fileEntry as FileSystemFileHandle).getFile();
        const text = await file.text();
        // 去掉文件头注释行（第一行 // 注释 + 紧随的空行）
        const jsonStr = text.replace(/^\/\/[^\n]*\n\n?/, '');
        const score: unknown = JSON.parse(jsonStr);
        if (isBackupScore(score) && !deletedIds.has(score.id)) scanned.push(score);
      } catch {
        // 跳过格式错误的文件
      }
    }

    if (scanned.length === 0) return { scores: loadMyScores(), conflictCopies: 0 };

    // 合并规则：ID 相同时保留 updatedAt 较新的版本
    const existing = loadMyScores();
    const mergeMap = new Map<string, MyScore>(existing.map((s) => [s.id, s]));
    let conflictCopies = 0;
    for (const s of scanned) {
      const ex = mergeMap.get(s.id);
      if (!ex) {
        mergeMap.set(s.id, s);
      } else if (ex.source !== s.source || ex.title !== s.title) {
        // 两端内容冲突时保留较新的版本为原 ID，并把另一份作为独立曲谱保存，避免静默丢稿。
        const stale = s.updatedAt > ex.updatedAt ? ex : s;
        const current = s.updatedAt > ex.updatedAt ? s : ex;
        if ([...mergeMap.values()].some((copy) => copy.id !== s.id && copy.source === stale.source && (copy.title === stale.title || copy.title === `${stale.title}（冲突副本）`))) {
          mergeMap.set(s.id, current);
          continue;
        }
        const now = Date.now();
        const conflictCopy: MyScore = {
          ...stale,
          id: generateId(),
          title: `${stale.title}（冲突副本）`,
          createdAt: now,
          updatedAt: now,
        };
        mergeMap.set(s.id, current);
        mergeMap.set(conflictCopy.id, conflictCopy);
        conflictCopies++;
      } else if (s.updatedAt > ex.updatedAt) {
        mergeMap.set(s.id, s);
      }
    }
    const merged = Array.from(mergeMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // 扫描到旧标题命名文件时，保留原文件作为恢复副本，并补写稳定 ID 文件与 manifest。
    // 后续扫描会按 ID 合并，不会重复创建曲谱。
    await syncToFileSystem(merged);
    return { scores: merged, conflictCopies };
  } catch (error) {
    lastFilesystemSyncError = error instanceof Error ? error.message : '目录恢复失败，请重试或导出备份';
    setFilesystemSyncState({ ...filesystemSyncState, status: 'error', error: lastFilesystemSyncError });
    return { scores: loadMyScores(), conflictCopies: 0 };
  }
}

/** 清除所有已保存曲谱（不可恢复，供"放弃存储"功能使用） */
export function clearAllScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}
