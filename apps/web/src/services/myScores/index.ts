/**
 * 我的谱谱 - 存储服务
 *
 * 主存储：localStorage（同步，始终可用）
 * 副存储：本地文件系统（通过 File System Access API，用户选择目录后启用）
 *
 * 策略：所有读写优先走 localStorage 保证速度与兼容性；
 *       若用户已选择本地目录，每次写入后异步同步一份 JSON 文件到该目录。
 */

import { getActiveDirectoryHandle } from '../storageLocation';

const STORAGE_KEY = 'hh-jianpu-my-scores';

// 文件名合法化（去除特殊字符，保留常用中英文、数字、下划线、短横线）
function safeFileName(title: string): string {
  return title.replace(/[^\w\u4e00-\u9fa5\-]/g, '_').slice(0, 64) + '.jsonc';
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

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// CRUD 操作
// ============================================================

/** 加载所有已保存曲谱（最新在前） */
export function loadMyScores(): MyScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MyScore[];
  } catch {
    return [];
  }
}

function persistMyScores(scores: MyScore[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // 忽略存储失败（如隐私模式/空间不足）
  }
  // 异步同步到文件系统（fire-and-forget）
  syncToFileSystem(scores);
}

// ============================================================
// 文件系统同步
// ============================================================


/**
 * 将每个曲谱单独写入本地目录，文件名为标题（.json），内容为 JSON 字符串
 * 若同名则覆盖，若标题为空则跳过
 */
async function syncToFileSystem(scores: MyScore[]): Promise<void> {
  try {
    const handle = await getActiveDirectoryHandle();
    if (!handle) return;
    for (const score of scores) {
      if (!score.title) continue;
      const fileName = safeFileName(score.title);
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      const content = JSON.stringify(score, null, 2);
      const fullContent = `// 请在 http://hh-jianpu.jinyu.cool/ 中导入使用\n\n${content}`;

      await writable.write(fullContent);
      await writable.close();
    }
  } catch {
    // 静默忽略：权限变更、目录被删除等情况不中断主流程
  }
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
export async function scanScoresFromFileSystem(): Promise<MyScore[]> {
  try {
    const handle = await getActiveDirectoryHandle();
    if (!handle) return loadMyScores();

    const scanned: MyScore[] = [];

    // FileSystemDirectoryHandle 是 AsyncIterable<[string, FileSystemHandle]>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [, entry] of handle as any) {
      const fileEntry = entry as FileSystemHandle;
      if (fileEntry.kind !== 'file' || !fileEntry.name.endsWith('.jsonc')) continue;
      try {
        const file = await (fileEntry as FileSystemFileHandle).getFile();
        const text = await file.text();
        // 去掉文件头注释行（第一行 // 注释 + 紧随的空行）
        const jsonStr = text.replace(/^\/\/[^\n]*\n\n?/, '');
        const score = JSON.parse(jsonStr) as Partial<MyScore>;
        if (score?.id && score?.source && score?.title) {
          scanned.push(score as MyScore);
        }
      } catch {
        // 跳过格式错误的文件
      }
    }

    if (scanned.length === 0) return loadMyScores();

    // 合并规则：ID 相同时保留 updatedAt 较新的版本
    const existing = loadMyScores();
    const mergeMap = new Map<string, MyScore>(existing.map((s) => [s.id, s]));
    for (const s of scanned) {
      const ex = mergeMap.get(s.id);
      if (!ex || s.updatedAt > ex.updatedAt) {
        mergeMap.set(s.id, s);
      }
    }
    const merged = Array.from(mergeMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // 忽略存储失败
    }
    return merged;
  } catch {
    return loadMyScores();
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
