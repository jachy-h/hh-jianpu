import { SCORE_LIBRARY_DATA } from './resources.generated.js';
export { loadScoreLibrary } from './loader.js';
export type { ScoreTemplate, ScoreCategory } from './loader.js';
import type { ScoreTemplate } from './loader.js';
export const ALL_SCORE_CATEGORIES = SCORE_LIBRARY_DATA;
const library = ALL_SCORE_CATEGORIES;
/** 已开放的分类，页面与 Store 共用同一份资源目录。 */
export const SCORE_CATEGORIES = library.filter(category => category.enabled);

/** 按分类和曲谱的稳定 ID 查找已开放资源。 */
export function getLibraryScore(categoryId: string, scoreId: string): ScoreTemplate | undefined {
  return SCORE_CATEGORIES.find(category => category.id === categoryId)?.scores.find(score => score.id === scoreId);
}

/** 优先使用小星星；移除该资源时回退到首个已开放曲目或空谱。 */
export const DEFAULT_SCORE_SOURCE = getLibraryScore('examples', 'twinkle')?.source
  ?? SCORE_CATEGORIES.flatMap(category => category.scores)[0]?.source ?? '';
