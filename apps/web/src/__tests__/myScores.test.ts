import { parse as parseJsonc } from 'jsonc-parser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestStorage } from './test-storage';
import type { MyScore } from '../services/myScores';

const location = vi.hoisted(() => ({
  handle: null as unknown,
  type: 'localStorage',
}));
vi.mock('../services/storageLocation', () => ({
  getActiveDirectoryHandle: vi.fn(async () => location.handle),
  getStorageLocation: vi.fn(async () => ({ type: location.type })),
}));

class TestDirectory {
  readonly files = new Map<string, string>();
  readonly writes: string[] = [];
  readonly deletes: string[] = [];
  failWrites = false;
  failDeletes = false;

  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name) && !options?.create) throw new Error('NotFoundError');
    return {
      kind: 'file', name,
      getFile: async () => ({ text: async () => this.files.get(name) ?? '' }),
      createWritable: async () => ({
        write: async (text: string) => {
          if (this.failWrites) throw new Error('NotAllowedError');
          this.writes.push(name);
          this.files.set(name, text);
        },
        close: async () => undefined,
      }),
    };
  }

  async removeEntry(name: string) {
    if (this.failDeletes) throw new Error('NotAllowedError');
    this.deletes.push(name);
    this.files.delete(name);
  }

  async *[Symbol.asyncIterator]() {
    for (const name of [...this.files.keys()]) yield [name, await this.getFileHandle(name)];
  }
}

const score = (id: string, source = '1 2 3 4', updatedAt = 1): MyScore => ({ id, source, title: '同名曲谱', createdAt: 1, updatedAt });
let storage: TestStorage;
beforeEach(() => {
  vi.resetModules();
  storage = new TestStorage();
  vi.stubGlobal('localStorage', storage);
  location.handle = null;
  location.type = 'localStorage';
});

describe('备份导入', () => {
  it('版本化全量备份可往返恢复，重复项跳过，ID 冲突保留独立副本', async () => {
    const service = await import('../services/myScores');
    const original = service.createMyScore('1 2 3 4', '原谱');
    const backup = service.serializeMyScoresBackup();
    expect(service.importScoreFile(backup)).toEqual({ imported: 0, skipped: 1 });
    service.updateMyScore(original.id, { source: '5 6 7 1' });
    expect(service.importScoreFile(backup)).toEqual({ imported: 1, skipped: 0 });
    expect(service.findMyScore(original.id)?.source).toBe('5 6 7 1');
    const copy = service.loadMyScores().find((item) => item.id !== original.id);
    expect(copy?.source).toBe('1 2 3 4');
    expect(copy?.title).toContain('导入副本');
    storage.clear();
    expect(service.importScoreFile(backup)).toEqual({ imported: 1, skipped: 0 });
    expect(service.findMyScore(original.id)).toEqual(original);
  });

  it('拒绝未知版本，跳过非法条目，并向调用方报告写入失败', async () => {
    const service = await import('../services/myScores');
    expect(() => service.importScoreFile('{"format":"hh-jianpu-backup","version":2,"scores":[]}')).toThrow();
    expect(service.importScoreFile(JSON.stringify({ format: 'hh-jianpu-backup', version: 1, scores: [null, {}, score('a/b'), score('score-a')] }))).toEqual({ imported: 1, skipped: 3 });
    storage.failWritesFor = 'hh-jianpu-my-scores';
    expect(() => service.importScoreFile(service.serializeMyScoresBackup([score('score-b')]))).toThrow('Storage quota exceeded');
  });
});

describe('JSON/JSONC 曲谱文件', () => {
  it('导入曲谱库中的 JSONC 原文件，支持逐行 source、注释与尾随逗号', async () => {
    const service = await import('../services/myScores');
    const files = import.meta.glob<string>('../../../../packages/score-library/resources/scores/bamboo/001-practice-1.jsonc', { query: '?raw', import: 'default', eager: true });
    const text = Object.values(files)[0];
    expect(service.importScoreFile(text)).toEqual({ imported: 1, skipped: 0 });
    const practice = service.loadMyScores()[0];
    expect(practice.title).toBe('练习(1)');
    expect(practice.source).toContain('Q 1 - - - |v');
    expect(service.importScoreFile(text)).toEqual({ imported: 0, skipped: 1 });
  });

  it('单首下载采用公共曲谱结构，可完整恢复 ID、标题、换行和时间戳', async () => {
    const service = await import('../services/myScores');
    const original = score('score-roundtrip', '---\n标题：原谱\n---\nQ 1 2 3 4 ||\n', 123);
    const text = service.serializeScoreFile(original);
    expect(text).toMatch(/^\/\//);
    expect(parseJsonc(text)).toMatchObject({ id: original.id, name: original.title, source: original.source.split('\n') });
    expect(service.importScoreFile(text)).toEqual({ imported: 1, skipped: 0 });
    expect(service.findMyScore(original.id)).toEqual(original);
    expect(service.importScoreFile(text)).toEqual({ imported: 0, skipped: 1 });
    service.updateMyScore(original.id, { source: '5 6 7 1 ||' });
    expect(service.importScoreFile(text)).toEqual({ imported: 1, skipped: 0 });
    expect(service.findMyScore(original.id)?.source).toBe('5 6 7 1 ||');
    expect(service.loadMyScores().some(item => item.title.endsWith('（导入副本）'))).toBe(true);
    const empty = score('score-empty', '');
    expect(service.importScoreFile(service.serializeScoreFile(empty)).imported).toBe(1);
    expect(service.findMyScore(empty.id)).toEqual(empty);
  });

  it('兼容无时间戳和 ID 的单首 JSON、旧版单首存储格式及带注释备份', async () => {
    const service = await import('../services/myScores');
    expect(service.importScoreFile(JSON.stringify({ name: '普通 JSON', source: '1 2 3 4 ||' })).imported).toBe(1);
    expect(service.importScoreFile(JSON.stringify(score('score-old'))).imported).toBe(1);
    const backup = service.serializeMyScoresBackup();
    storage.clear();
    expect(service.importScoreFile(backup)).toEqual({ imported: 2, skipped: 0 });
  });

  it('正确解析字符串中的注释符号，拒绝损坏 JSONC 与非法字段且不改写已有曲谱', async () => {
    const service = await import('../services/myScores');
    const original = service.createMyScore('1 2 3 4 ||', '原谱');
    const before = service.loadMyScores();
    for (const text of ['{', '{}', '[]', '{"name":"x","source":[1]}', '{"id":"../x","name":"x","source":"1 2 3 4"}', '{"name":"x","source":"1", "createdAt":"bad"}', '{"name":"x","source":"1", "oops":}']) {
      expect(() => service.importScoreFile(text)).toThrow();
      expect(service.loadMyScores()).toEqual(before);
    }
    service.importScoreFile('/* 说明 */ {"name":"注释测试", "source":["// https://example.com", "Q 1 2 3 4 ||",],}');
    expect(service.loadMyScores().find(item => item.id !== original.id)?.source).toBe('// https://example.com\nQ 1 2 3 4 ||');
  });
});

describe('目录备份与恢复', () => {
  it('同名曲谱以 ID 分别写入，连续同步保留最新内容，并保留无关文件', async () => {
    const directory = new TestDirectory();
    directory.files.set('unrelated.jsonc', '{"personal":true}');
    location.handle = directory;
    location.type = 'fileSystem';
    const service = await import('../services/myScores');
    const a = service.createMyScore('1 2 3 4', '同名');
    const b = service.createMyScore('5 6 7 1', '同名');
    service.updateMyScore(a.id, { source: '2 2 2 2' });
    await service.retryFilesystemSync();
    expect(directory.files.get(`${a.id}.jsonc`)).toContain('2 2 2 2');
    expect(directory.files.get(`${b.id}.jsonc`)).toContain('5 6 7 1');
    service.deleteMyScore(a.id);
    await service.retryFilesystemSync();
    expect(directory.files.has(`${a.id}.jsonc`)).toBe(false);
    expect(directory.files.get('unrelated.jsonc')).toBe('{"personal":true}');
    expect(directory.deletes).not.toContain('unrelated.jsonc');
  });

  it('无变化重试不重写曲谱，重命名只更新稳定 ID 文件', async () => {
    const directory = new TestDirectory();
    location.handle = directory;
    const service = await import('../services/myScores');
    const a = service.createMyScore('1 2 3 4', '原题');
    await service.retryFilesystemSync();
    const initialWrites = directory.writes.filter((name) => name === `${a.id}.jsonc`).length;
    await service.retryFilesystemSync();
    expect(directory.writes.filter((name) => name === `${a.id}.jsonc`)).toHaveLength(initialWrites);
    service.updateMyScore(a.id, { title: '新题' });
    await service.retryFilesystemSync();
    expect(directory.files.get(`${a.id}.jsonc`)).toContain('新题');
    expect([...directory.files.keys()].filter((name) => name.endsWith('.jsonc'))).toEqual([`${a.id}.jsonc`]);
  });

  it('删除失败的 ID 写入墓碑，扫描时连旧标题文件也不会复活', async () => {
    const directory = new TestDirectory();
    location.handle = directory;
    const service = await import('../services/myScores');
    const a = service.createMyScore('1 2 3 4', '旧标题');
    await service.retryFilesystemSync();
    directory.files.set('旧标题.jsonc', JSON.stringify(a));
    directory.failDeletes = true;
    service.deleteMyScore(a.id);
    await service.retryFilesystemSync();
    const manifest = JSON.parse(directory.files.get('hh-jianpu-manifest.json')!);
    expect(manifest.deletedIds).toContain(a.id);
    expect((await service.scanScoresFromFileSystem()).scores).toHaveLength(0);
  });

  it('旧标题文件迁移保留原文件，并将内容冲突的两个版本都保存', async () => {
    const directory = new TestDirectory();
    directory.files.set('旧标题.jsonc', JSON.stringify(score('score-a', '1 2 3 4', 2)));
    storage.setItem('hh-jianpu-my-scores', JSON.stringify([score('score-a', '5 6 7 1', 1)]));
    location.handle = directory;
    const service = await import('../services/myScores');
    const first = await service.scanScoresFromFileSystem();
    expect(first.conflictCopies).toBe(1);
    expect(first.scores).toHaveLength(2);
    expect(service.findMyScore('score-a')?.source).toBe('1 2 3 4');
    expect(first.scores.find((item) => item.id !== 'score-a')?.source).toBe('5 6 7 1');
    expect(directory.files.has('旧标题.jsonc')).toBe(true);
    expect(directory.files.has('score-a.jsonc')).toBe(true);
    expect(directory.files.has('hh-jianpu-manifest.json')).toBe(true);
    const second = await service.scanScoresFromFileSystem();
    expect(second.conflictCopies).toBe(0);
    expect(second.scores).toHaveLength(2);
  });

  it('权限丢失和写入失败显示目录错误，重试成功后恢复且不影响浏览器副本', async () => {
    location.type = 'fileSystem';
    const service = await import('../services/myScores');
    const a = service.createMyScore('1 2 3 4', '本地副本');
    await service.retryFilesystemSync();
    expect(service.getFilesystemSyncState().status).toBe('error');
    expect(service.getFilesystemSyncState().lastSavedAt).toBeNull();
    expect(service.findMyScore(a.id)?.source).toBe('1 2 3 4');
    const directory = new TestDirectory();
    directory.failWrites = true;
    location.handle = directory;
    await service.retryFilesystemSync();
    expect(service.getFilesystemSyncState().status).toBe('error');
    directory.failWrites = false;
    await service.retryFilesystemSync();
    expect(service.getFilesystemSyncState().status).toBe('saved');
    expect(service.getFilesystemSyncState().error).toBeNull();
    expect(directory.files.has(`${a.id}.jsonc`)).toBe(true);
  });
});
