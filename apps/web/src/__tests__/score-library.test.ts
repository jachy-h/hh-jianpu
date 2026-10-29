import { describe, expect, it } from 'vitest';
import { createLayout, parse } from '@hh-jianpu/core';
import { SCORE_CATEGORIES, DEFAULT_SCORE_SOURCE, getLibraryScore, loadScoreLibrary } from '../services/scoreLibrary';

const category = (id: string, order = 10, enabled = true): string => JSON.stringify({ id, name: id, order, enabled });
const loadTemplates = (files: Record<string, string>) => loadScoreLibrary({
  ...Object.fromEntries(Object.entries(files).map(([path, text]) => [`test/${path}`, text])),
  'test/category.jsonc': category('test'),
})[0].scores;
import { ALL_SCORE_CATEGORIES as allCategories } from '@hh-jianpu/score-library';
const bambooLessons = SCORE_CATEGORIES.find(item => item.id === 'bamboo')!.scores;

const template = (id: string): string => JSON.stringify({ id, name: id, source: '1 2 3 4 ||' });

describe('公共曲谱资源库', () => {
  it('练习(2)在宽度足够时按源码显示五小节和六小节，窄屏保留第二行起点', () => {
    const lesson = getLibraryScore('bamboo', 'bamboo-practice-2')!;
    const result = parse(lesson.source);
    expect(result.errors).toEqual([]);
    const score = result.score!;
    expect(score.measures.filter(measure => measure.lineBreakBefore).map(measure => measure.number)).toEqual([6]);
    const wide = createLayout(score, { width: 1100 });
    expect(wide.lines.map(line => line.measures.map(item => item.measure.number)))
      .toEqual([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]]);
    const narrow = createLayout(score, { width: 360 });
    expect(narrow.lines.length).toBeGreaterThan(2);
    expect(narrow.lines.some(line => line.measures[0].measure.number === 6)).toBe(true);
  });

  it('自动加载所有 JSONC 文件，且全部曲谱没有解析诊断', () => {
    expect(bambooLessons.length).toBeGreaterThan(0);
    for (const lesson of allCategories.flatMap(item => item.scores)) {
      const result = parse(lesson.source);
      expect(result.errors, lesson.id).toEqual([]);
      expect(result.score, lesson.id).not.toBeNull();
    }
  });

  it('完整保留练习(1)的元信息、十二小节、反复和换气', () => {
    const lesson = bambooLessons.find(item => item.id === 'bamboo-practice-1')!;
    expect(lesson.name).toBe('练习(1)');
    const score = parse(lesson.source).score!;
    expect(score.metadata).toMatchObject({ title: '练习(1)', key: 'C', tempo: 80, timeSignature: { beats: 4, beatValue: 4 } });
    expect(score.measures).toHaveLength(12);
    expect(score.measures[4].repeatEnd).toBe(true);
    expect(score.measures[11].finalBarline).toBe(true);
    expect(score.measures.flatMap(measure => measure.notes).filter(note => note.type === 'breath')).toHaveLength(10);
    expect(lesson.source.split('\n').filter(line => line.startsWith('Q '))).toEqual([
      'Q 1 - - - |v 2 - - - |v 3 - - - |v 2 - - - |v',
      'Q 1 - - - :|| 3 - - - |v 1 - - - |v 2 - - - |v',
      'Q 3 - - - |v 1 - - - |v 3 - - - |v 1 - - - ||',
    ]);
  });

  it('支持 JSONC 注释、尾随逗号和逐行谱文，字符串中的注释符号不会被删除', () => {
    const lessons = loadTemplates({ 'lesson.jsonc': `{
      // 曲目说明
      "id": "lesson", "name": "练习", /* 块注释 */
      "attribution": "https://example.com/scores", "source": ["1 2 3 4 ||", "// 注释",],
    }` });
    expect(lessons[0].source).toBe('1 2 3 4 ||\n// 注释');
    expect(lessons[0].attribution).toBe('https://example.com/scores');
  });

  it('按文件名自然排序，不依赖模块导入顺序', () => {
    expect(loadTemplates({ '10.jsonc': template('ten'), '2.jsonc': template('two'), '1.jsonc': template('one') }).map(item => item.id))
      .toEqual(['one', 'two', 'ten']);
  });

  it('无效 JSONC、字段和重复 ID 的错误包含文件名', () => {
    for (const content of ['{', '{}', '{"id":"x","name":"x","source":[1]}', '{"id":"x","name":"x","source":[]}']) {
      expect(() => loadTemplates({ 'broken.jsonc': content })).toThrow('broken.jsonc');
    }
    expect(() => loadTemplates({ '1.jsonc': template('same'), '2.jsonc': template('same') })).toThrow('test/2.jsonc: 重复的曲谱 id');
  });

  it('自动发现新分类，按配置排序，并允许不同分类使用相同曲谱 ID', () => {
    const library = loadScoreLibrary({
      'new/category.jsonc': category('flute', 30), 'new/1.jsonc': template('one'),
      'old/category.jsonc': category('examples', 10), 'old/1.jsonc': template('one'),
      'empty/category.jsonc': category('empty', 20, false),
    });
    expect(library.map(item => item.id)).toEqual(['examples', 'empty', 'flute']);
    expect(library[1]).toMatchObject({ enabled: false, scores: [] });
    expect(library.filter(item => item.enabled).map(item => item.id)).toEqual(['examples', 'flute']);
    expect(library[2].scores[0].id).toBe('one');
    expect(loadScoreLibrary({})).toEqual([]);
  });

  it('分类缺失、重复 ID 或非法配置时指出对应文件', () => {
    expect(() => loadScoreLibrary({ 'missing/1.jsonc': template('one') })).toThrow('missing/category.jsonc');
    expect(() => loadScoreLibrary({ 'a/category.jsonc': category('same'), 'b/category.jsonc': category('same') })).toThrow('重复的分类 id');
    for (const config of ['{', '{}', '{"id":"x","name":"x","order":"10","enabled":true}', '{"id":"x","name":"x","order":10,"enabled":"true"}']) {
      expect(() => loadScoreLibrary({ 'invalid/category.jsonc': config })).toThrow('invalid/category.jsonc');
    }
  });

  it('默认小星星和资源查找使用稳定 ID，未知 ID 不会命中原型属性', () => {
    expect(DEFAULT_SCORE_SOURCE).toBe(getLibraryScore('examples', 'twinkle')!.source);
    expect(parse(DEFAULT_SCORE_SOURCE).score!.metadata.title).toBe('小星星');
    expect(getLibraryScore('missing', 'twinkle')).toBeUndefined();
    expect(getLibraryScore('examples', 'toString')).toBeUndefined();
  });
});
