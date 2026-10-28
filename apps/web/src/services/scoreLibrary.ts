import { parse, printParseErrorCode } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';

/** 内置公共曲谱模板，加载后首次编辑会创建个人副本。 */
export interface ScoreTemplate {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly attribution?: string;
}

/** 公共曲谱分类；分类 ID 与曲谱 ID 共同标识资源。 */
export interface ScoreCategory {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly enabled: boolean;
  readonly scores: readonly ScoreTemplate[];
}

function readObject(path: string, text: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const data: unknown = parse(text, errors, { allowTrailingComma: true });
  if (errors.length) {
    throw new Error(`${path}: JSONC ${printParseErrorCode(errors[0].error)}（位置 ${errors[0].offset}）`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${path}: 配置必须是一个对象`);
  return data as Record<string, unknown>;
}

/** 读取静态 JSONC 模板，按文件名自然排序，并报告文件名和配置错误。 */
function loadTemplates(files: Record<string, string>): readonly ScoreTemplate[] {
  const ids = new Set<string>();
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([path, text]) => {
    const fail = (message: string): never => { throw new Error(`${path}: ${message}`); };
    const record = readObject(path, text);
    const requiredText = (key: string): string => {
      const value = record[key];
      return typeof value === 'string' && value.trim() ? value : fail(`${key} 必须是非空字符串`);
    };
    const id = requiredText('id');
    if (ids.has(id)) fail(`重复的曲谱 id：${id}`);
    ids.add(id);
    const name = requiredText('name');
    const rawSource = record.source;
    const source = typeof rawSource === 'string' ? rawSource
      : Array.isArray(rawSource) && rawSource.every((line): line is string => typeof line === 'string')
        ? rawSource.join('\n') : fail('source 必须是字符串或字符串数组');
    if (!source.trim()) fail('source 不能为空');
    if (record.attribution !== undefined && typeof record.attribution !== 'string') fail('attribution 必须是字符串');
    return { id, name, source, ...(typeof record.attribution === 'string' ? { attribution: record.attribution } : {}) };
  });
}

/** 读取分类配置和曲谱，新增目录即可扩展分类，无需修改代码。 */
export function loadScoreLibrary(files: Record<string, string>): readonly ScoreCategory[] {
  const folders = new Map<string, Record<string, string>>();
  for (const [path, text] of Object.entries(files)) {
    const folder = path.slice(0, path.lastIndexOf('/'));
    const entries = folders.get(folder) ?? {};
    entries[path] = text;
    folders.set(folder, entries);
  }
  const ids = new Set<string>();
  return [...folders.entries()].map(([folder, entries]): ScoreCategory => {
    const path = `${folder}/category.jsonc`;
    const fail = (message: string): never => { throw new Error(`${path}: ${message}`); };
    if (!Object.prototype.hasOwnProperty.call(entries, path)) return fail('缺少分类配置');
    const record = readObject(path, entries[path]);
    const { id, name, order, enabled } = record;
    if (typeof id !== 'string' || !id.trim()) return fail('id 必须是非空字符串');
    if (typeof name !== 'string' || !name.trim()) return fail('name 必须是非空字符串');
    if (typeof order !== 'number' || !Number.isFinite(order)) return fail('order 必须是有限数字');
    if (typeof enabled !== 'boolean') return fail('enabled 必须是布尔值');
    if (ids.has(id)) return fail(`重复的分类 id：${id}`);
    ids.add(id);
    const scores = loadTemplates(Object.fromEntries(Object.entries(entries).filter(([file]) => file !== path)));
    return { id, name, order, enabled, scores };
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'en'));
}

const library = loadScoreLibrary(import.meta.glob<string>('../../resources/scores/*/*.jsonc', {
  query: '?raw',
  import: 'default',
  eager: true,
}));

/** 已开放的分类，页面与 Store 共用同一份资源目录。 */
export const SCORE_CATEGORIES = library.filter(category => category.enabled);

/** 按分类和曲谱的稳定 ID 查找已开放资源。 */
export function getLibraryScore(categoryId: string, scoreId: string): ScoreTemplate | undefined {
  return SCORE_CATEGORIES.find(category => category.id === categoryId)?.scores.find(score => score.id === scoreId);
}

/** 优先使用小星星；移除该资源时回退到首个已开放曲目或空谱。 */
export const DEFAULT_SCORE_SOURCE = getLibraryScore('examples', 'twinkle')?.source
  ?? SCORE_CATEGORIES.flatMap(category => category.scores)[0]?.source ?? '';
