/**
 * 我的谱谱 - localStorage 存储服务
 */

const STORAGE_KEY = 'hh-jianpu-my-scores';

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
