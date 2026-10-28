import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestStorage } from './test-storage';

vi.mock('@hh-jianpu/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hh-jianpu/core')>();
  return {
    ...actual,
    Player: class {
      status = 'idle';
      setTempo = vi.fn();
      setInstrument = vi.fn();
      setNoteHighlightCallback = vi.fn();
      setStatusChangeCallback = vi.fn();
      setLoopRange = vi.fn();
      setVoiceMuted = vi.fn();
      loadScore = vi.fn();
      play = vi.fn(async () => { this.status = 'playing'; });
      pause = vi.fn(() => { this.status = 'paused'; });
      stop = vi.fn(() => { this.status = 'idle'; });
      stopMetronomeWarmup = vi.fn();
      startMetronomeWarmup = vi.fn(async () => undefined);
    },
  };
});
vi.mock('../services/storageLocation', () => ({
  getActiveDirectoryHandle: vi.fn(async () => null),
  getStorageLocation: vi.fn(async () => ({ type: 'localStorage' })),
}));

const LIBRARY_KEY = 'hh-jianpu-my-scores';
const DRAFT_KEY = 'hh-jianpu-state';
const source = (title: string, notes = '1 2 3 4') => `---\n标题：${title}\n调号：C\n拍号：4/4\n速度：120\n---\nQ | ${notes} |`;
let storage: TestStorage;
let events: EventTarget;

async function setup() {
  const { useStore } = await import('../store/useStore');
  const library = await import('../services/myScores');
  return { useStore, library };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  storage = new TestStorage();
  events = new EventTarget();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', events);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('播放音色偏好', () => {
  it('默认使用钢琴，切换原音色时停止播放且不会改写曲谱', async () => {
    const { useStore } = await setup();
    const original = useStore.getState().source;
    expect(useStore.getState().instrumentId).toBe('piano');
    useStore.getState().setInstrument('triangle');
    expect(useStore.getState().player.stop).toHaveBeenCalled();
    expect(useStore.getState().player.setInstrument).toHaveBeenCalledWith('triangle');
    expect(useStore.getState().source).toBe(original);
    expect(storage.getItem('hh-jianpu-instrument')).toBe('triangle');
    vi.resetModules();
    const restored = await setup();
    expect(restored.useStore.getState().instrumentId).toBe('triangle');
  });

  it('忽略未知偏好和未知音色，不改变当前播放', async () => {
    storage.setItem('hh-jianpu-instrument', 'missing');
    const { useStore } = await setup();
    expect(useStore.getState().instrumentId).toBe('piano');
    useStore.getState().setInstrument('missing');
    expect(useStore.getState().player.setInstrument).not.toHaveBeenCalled();
    expect(useStore.getState().player.stop).not.toHaveBeenCalled();
  });

  it('加载中切换后旧请求失败，不覆盖新音色的播放状态', async () => {
    const { useStore } = await setup();
    let rejectOld: ((error: Error) => void) | undefined;
    vi.mocked(useStore.getState().player.play).mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectOld = reject; }));
    const first = useStore.getState().play();
    expect(useStore.getState().isLoading).toBe(true);
    useStore.getState().setInstrument('triangle');
    await useStore.getState().play();
    rejectOld!(new Error('old samples failed'));
    await first;
    expect(useStore.getState().instrumentId).toBe('triangle');
    expect(useStore.getState().playbackError).toBeNull();
    expect(useStore.getState().isLoading).toBe(false);
  });
});

describe('文档保存与切换', () => {
  it('防抖结束前从 A 切到 B，会保存 A 的快照且不会覆盖 B', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    const b = library.createMyScore(source('B'), 'B');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A 修改', '5 6 7 1'));
    useStore.getState().loadMyScore(b.id);
    await vi.advanceTimersByTimeAsync(1500);
    expect(library.findMyScore(a.id)?.source).toBe(source('A 修改', '5 6 7 1'));
    expect(library.findMyScore(b.id)?.source).toBe(source('B'));
    expect(useStore.getState().currentScoreId).toBe(b.id);
    expect(useStore.getState().score?.metadata.title).toBe('B');
  });

  it('快速连续切换、新建和移调另存各自保存独立曲谱', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    const b = library.createMyScore(source('B'), 'B');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A 改'));
    useStore.getState().loadMyScore(b.id);
    useStore.getState().setSource(source('B 改'));
    useStore.getState().newScore();
    useStore.getState().saveAsNewScore(source('移调副本'));
    const copyId = useStore.getState().currentScoreId;
    await vi.advanceTimersByTimeAsync(1500);
    expect(library.findMyScore(a.id)?.title).toBe('A 改');
    expect(library.findMyScore(b.id)?.title).toBe('B 改');
    expect(copyId).not.toBe(a.id);
    expect(copyId).not.toBe(b.id);
    expect(library.findMyScore(copyId!)?.source).toBe(source('移调副本'));
  });

  it('删除正在编辑的曲谱后过期计时器不会使曲谱复活', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A 改'));
    useStore.getState().deleteScore(a.id);
    await vi.advanceTimersByTimeAsync(1500);
    expect(library.findMyScore(a.id)).toBeNull();
    expect(library.loadMyScores()).toHaveLength(0);
  });

  it('pagehide 同步提交最新编辑，不依赖防抖计时器', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('离开前编辑'));
    events.dispatchEvent(new Event('pagehide'));
    expect(library.findMyScore(a.id)?.source).toBe(source('离开前编辑'));
  });

  it('启动时将恢复草稿按绑定 ID 回写曲谱库', async () => {
    storage.setItem(LIBRARY_KEY, JSON.stringify([{ id: 'score-a', title: 'A', source: source('A'), createdAt: 1, updatedAt: 1 }]));
    storage.setItem(DRAFT_KEY, JSON.stringify({ source: source('恢复草稿'), currentScoreId: 'score-a', tempo: 120, playDelay: 0 }));
    const { useStore, library } = await setup();
    expect(useStore.getState().currentScoreId).toBe('score-a');
    expect(library.findMyScore('score-a')?.source).toBe(source('恢复草稿'));
  });

  it('本地写入失败时不更新成功时间，保留源码且重试可恢复', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    storage.failWritesFor = LIBRARY_KEY;
    useStore.getState().setSource(source('失败草稿'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(useStore.getState().saveStatus).toBe('error');
    expect(useStore.getState().lastSavedAt).toBeNull();
    expect(useStore.getState().source).toBe(source('失败草稿'));
    expect(library.findMyScore(a.id)?.source).toBe(source('A'));
    storage.failWritesFor = null;
    useStore.getState().retrySave();
    expect(useStore.getState().saveStatus).toBe('saved');
    expect(library.findMyScore(a.id)?.source).toBe(source('失败草稿'));
  });

  it('解析在 300ms 更新，保存仍独立等待 1000ms', async () => {
    const { useStore, library } = await setup();
    useStore.getState().setSource(source('解析先完成'));
    await vi.advanceTimersByTimeAsync(300);
    expect(useStore.getState().score?.metadata.title).toBe('解析先完成');
    expect(library.loadMyScores()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(700);
    expect(library.loadMyScores()[0].title).toBe('解析先完成');
  });

  it('刚输入立即播放使用当前源码，暂停恢复不重新加载曲谱', async () => {
    const { useStore } = await setup();
    useStore.getState().setSource(source('立即播放', '5 5 5 5'));
    await useStore.getState().play();
    const player = useStore.getState().player;
    expect(player.loadScore).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ title: '立即播放' }) }));
    useStore.getState().pause();
    await useStore.getState().play();
    expect(player.loadScore).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('保存失败时阻止切换，修复存储后仍能保存原稿并进入目标文档', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    const b = library.createMyScore(source('B'), 'B');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('不能丢失的原稿'));
    storage.failWritesFor = LIBRARY_KEY;
    useStore.getState().loadMyScore(b.id);
    expect(useStore.getState().currentScoreId).toBe(a.id);
    expect(useStore.getState().source).toBe(source('不能丢失的原稿'));
    expect(useStore.getState().saveStatus).toBe('error');
    storage.failWritesFor = null;
    useStore.getState().loadMyScore(b.id);
    expect(library.findMyScore(a.id)?.source).toBe(source('不能丢失的原稿'));
    expect(useStore.getState().currentScoreId).toBe(b.id);
  });

  it('恢复草稿写入失败不会阻止启动，错误可见且草稿可重试', async () => {
    storage.setItem(LIBRARY_KEY, JSON.stringify([{ id: 'score-a', title: 'A', source: source('A'), createdAt: 1, updatedAt: 1 }]));
    storage.setItem(DRAFT_KEY, JSON.stringify({ source: source('恢复失败的草稿'), currentScoreId: 'score-a', tempo: 120, playDelay: 0 }));
    storage.failWritesFor = LIBRARY_KEY;
    const { useStore, library } = await setup();
    expect(useStore.getState().source).toBe(source('恢复失败的草稿'));
    expect(useStore.getState().saveStatus).toBe('error');
    storage.failWritesFor = null;
    useStore.getState().retrySave();
    expect(library.findMyScore('score-a')?.source).toBe(source('恢复失败的草稿'));
  });

  it('重命名前提交待保存的正文，后续防抖不会覆盖新标题', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A', '7 7 7 7'));
    useStore.getState().renameScore(a.id, '重命名');
    await vi.advanceTimersByTimeAsync(1500);
    expect(library.findMyScore(a.id)?.title).toBe('重命名');
    expect(library.findMyScore(a.id)?.source).toContain('7 7 7 7');
    expect(useStore.getState().source).toContain('重命名');
  });

  it('音频初始化失败可见，停止后清除错误并可重试', async () => {
    const { useStore } = await setup();
    vi.mocked(useStore.getState().player.play).mockRejectedValueOnce(new Error('Permission denied'));
    await useStore.getState().play();
    expect(useStore.getState().playbackError).toContain('重试');
    expect(useStore.getState().isLoading).toBe(false);
    useStore.getState().stop();
    expect(useStore.getState().playbackError).toBeNull();
    await useStore.getState().play();
    expect(useStore.getState().playbackError).toBeNull();
  });

  it('反复结构诊断会阻止单声部播放并显示修正提示', async () => {
    const { useStore } = await setup();
    useStore.getState().setSourceImmediate('||: 1 2 3 4 | 5 6 7 1 |');
    await useStore.getState().play();
    expect(useStore.getState().parseErrors.some(error => error.message.includes('反复'))).toBe(true);
    expect(useStore.getState().player.play).not.toHaveBeenCalled();
    expect(useStore.getState().playbackError).toContain('反复记号诊断');
  });
});


describe('草稿新旧比较与练习速度', () => {
  it('较旧的恢复草稿不会覆盖目录恢复后的较新曲谱', async () => {
    storage.setItem(LIBRARY_KEY, JSON.stringify([{ id: 'score-a', title: '目录较新版本', source: source('目录较新版本'), createdAt: 1, updatedAt: 200 }]));
    storage.setItem(DRAFT_KEY, JSON.stringify({ source: source('旧草稿'), currentScoreId: 'score-a', sourceUpdatedAt: 100, tempo: 120, playDelay: 0 }));
    const { useStore, library } = await setup();
    expect(useStore.getState().source).toBe(source('目录较新版本'));
    expect(library.findMyScore('score-a')?.source).toBe(source('目录较新版本'));
    expect(JSON.parse(storage.getItem(DRAFT_KEY)!).source).toBe(source('目录较新版本'));
  });

  it('练习倍率改变实际 BPM 而不改源码或原始速度，暂停后继续不再预热', async () => {
    const { useStore } = await setup();
    const original = useStore.getState().source;
    useStore.getState().setTempo(120);
    useStore.getState().setPracticeSpeed(0.75);
    expect(useStore.getState().tempo).toBe(120);
    expect(useStore.getState().source).toBe(original);
    expect(useStore.getState().player.setTempo).toHaveBeenLastCalledWith(90);
    await useStore.getState().play();
    useStore.getState().pause();
    useStore.getState().setPlayDelay(4);
    await useStore.getState().play();
    expect(useStore.getState().player.startMetronomeWarmup).not.toHaveBeenCalled();
    expect(useStore.getState().player.play).toHaveBeenCalledTimes(2);
  });
});


describe('恢复输入校验', () => {
  it.each(['null', '"broken"', '{"source":42,"tempo":-1}'])('损坏的恢复状态 %s 不阻止启动', async (raw) => {
    storage.setItem(DRAFT_KEY, raw);
    const { useStore } = await setup();
    expect(typeof useStore.getState().source).toBe('string');
    expect(useStore.getState().score).not.toBeNull();
  });
});


describe('部分保存失败重试', () => {
  it('主库写入成功而恢复状态写入失败，重试不会重复创建曲谱', async () => {
    const { useStore, library } = await setup();
    storage.failWritesFor = DRAFT_KEY;
    useStore.getState().setSource(source('恢复状态失败'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(useStore.getState().saveStatus).toBe('error');
    const id = useStore.getState().currentScoreId;
    expect(id).not.toBeNull();
    expect(library.loadMyScores()).toHaveLength(1);
    storage.failWritesFor = null;
    useStore.getState().retrySave();
    expect(useStore.getState().saveStatus).toBe('saved');
    expect(useStore.getState().currentScoreId).toBe(id);
    expect(library.loadMyScores()).toHaveLength(1);
  });
});


describe('双声部编辑与播放入口', () => {
  const duet = 'Q[upper] 1 2 3 4 |\nQ[lower] 1 0 0 1 |';

  it('keeps both voice lines through saving and loading and routes independent mute controls', async () => {
    const { useStore, library } = await setup();
    useStore.getState().newScore();
    useStore.getState().setSource(duet);
    await vi.advanceTimersByTimeAsync(1200);
    const id = useStore.getState().currentScoreId!;
    expect(library.findMyScore(id)?.source).toBe(duet);
    const backup = library.serializeMyScoresBackup();
    storage.removeItem(LIBRARY_KEY);
    expect(library.importScoreFile(backup).imported).toBe(1);
    expect(library.findMyScore(id)?.source).toBe(duet);
    useStore.getState().setVoiceMuted('lower', true);
    expect(useStore.getState().player.setVoiceMuted).toHaveBeenCalledWith('lower', true);
    expect(useStore.getState().mutedVoices).toEqual(['lower']);
    useStore.getState().setVoiceMuted('lower', false);
    expect(useStore.getState().mutedVoices).toEqual([]);
    useStore.getState().newScore();
    useStore.getState().loadMyScore(id);
    expect(useStore.getState().score?.secondaryVoice?.measures).toHaveLength(1);
    await useStore.getState().play();
    expect(useStore.getState().player.loadScore).toHaveBeenCalledWith(expect.objectContaining({ secondaryVoice: expect.any(Object) }));
  });

  it('blocks playback when either staff has a missing or incomplete measure', async () => {
    const { useStore } = await setup();
    useStore.getState().setSourceImmediate(duet.replace('1 0 0 1', '1 0'));
    await useStore.getState().play();
    expect(useStore.getState().player.play).not.toHaveBeenCalled();
    expect(useStore.getState().playbackError).toContain('双声部');
  });
});

describe('公共曲谱模板加载', () => {
  const lesson = { id: 'bamboo-test', name: '竹笛测试曲目', source: source('竹笛测试曲目') };

  it('加载模板先保存个人原稿并解除绑定，首次编辑创建副本且不会回写原稿', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A 最新编辑'));
    useStore.getState().selectLoopMeasure(0);
    useStore.setState({ countdownValue: 4, isMetronomeActive: true, currentNoteIndex: 2, activeNoteIndices: [2] });
    expect(useStore.getState().loadTemplate(lesson)).toBe(true);
    expect(library.findMyScore(a.id)?.source).toBe(source('A 最新编辑'));
    expect(library.loadMyScores()).toHaveLength(1);
    expect(useStore.getState()).toMatchObject({
      source: lesson.source, currentScoreId: null, loopSelection: null,
      countdownValue: 0, isMetronomeActive: false, currentNoteIndex: -1, activeNoteIndices: [],
    });
    expect(useStore.getState().player.stop).toHaveBeenCalled();
    expect(useStore.getState().player.stopMetronomeWarmup).toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(DRAFT_KEY)!)).toMatchObject({ source: lesson.source, currentScoreId: null });
    useStore.getState().setSource(source('我的竹笛副本', '5 6 7 1'));
    await vi.advanceTimersByTimeAsync(1200);
    expect(library.loadMyScores()).toHaveLength(2);
    expect(useStore.getState().currentScoreId).not.toBe(a.id);
    expect(library.findMyScore(a.id)?.source).toBe(source('A 最新编辑'));
    expect(lesson.source).toBe(source('竹笛测试曲目'));
  });

  it('模板与副本刷新恢复、移调后仍与原个人曲谱隔离', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    expect(useStore.getState().loadTemplate(lesson)).toBe(true);
    vi.resetModules();
    const restored = await setup();
    expect(restored.useStore.getState().source).toBe(lesson.source);
    expect(restored.useStore.getState().currentScoreId).toBeNull();
    const { transposeScore, scoreToSource } = await import('@hh-jianpu/core');
    const score = restored.useStore.getState().score!;
    restored.useStore.getState().setSource(scoreToSource(transposeScore(score, 2)));
    await vi.advanceTimersByTimeAsync(1200);
    const copyId = restored.useStore.getState().currentScoreId;
    expect(copyId).not.toBeNull();
    expect(copyId).not.toBe(a.id);
    vi.resetModules();
    const copyRestored = await setup();
    expect(copyRestored.useStore.getState().currentScoreId).toBe(copyId);
    expect(copyRestored.library.findMyScore(a.id)?.source).toBe(source('A'));
  });

  it('个人原稿保存失败返回 false，保留源码和绑定，重试后才能加载模板', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    useStore.getState().setSource(source('A 未保存修改'));
    storage.failWritesFor = LIBRARY_KEY;
    expect(useStore.getState().loadTemplate(lesson)).toBe(false);
    expect(useStore.getState()).toMatchObject({ source: source('A 未保存修改'), currentScoreId: a.id, saveStatus: 'error' });
    storage.failWritesFor = null;
    expect(useStore.getState().loadTemplate(lesson)).toBe(true);
    expect(library.findMyScore(a.id)?.source).toBe(source('A 未保存修改'));
  });

  it('模板恢复草稿写入失败也不切换当前文档', async () => {
    const { useStore, library } = await setup();
    const a = library.createMyScore(source('A'), 'A');
    useStore.getState().loadMyScore(a.id);
    const previousDraft = storage.getItem(DRAFT_KEY);
    storage.failWritesFor = DRAFT_KEY;
    expect(useStore.getState().loadTemplate(lesson)).toBe(false);
    expect(useStore.getState()).toMatchObject({ source: source('A'), currentScoreId: a.id, saveStatus: 'error' });
    expect(storage.getItem(DRAFT_KEY)).toBe(previousDraft);
    expect(library.loadMyScores()).toHaveLength(1);
  });

  it('示例和静态竹笛曲谱复用安全模板入口，未知曲目返回 false', async () => {
    const { useStore, library } = await setup();
    const { getLibraryScore } = await import('../services/scoreLibrary');
    const practice = getLibraryScore('bamboo', 'bamboo-practice-1')!;
    expect(practice).toBeDefined();
    expect(useStore.getState().loadLibraryScore('bamboo', 'missing')).toBe(false);
    expect(useStore.getState().loadLibraryScore('examples', 'missing')).toBe(false);
    expect(useStore.getState().loadLibraryScore('examples', 'toString')).toBe(false);
    expect(useStore.getState().loadLibraryScore('bamboo', practice.id)).toBe(true);
    expect(useStore.getState().source).toBe(practice.source);
    expect(useStore.getState().parseErrors).toEqual([]);
    expect(useStore.getState().currentScoreId).toBeNull();
    expect(library.loadMyScores()).toHaveLength(0);
    expect(useStore.getState().loadLibraryScore('examples', 'twinkle')).toBe(true);
    expect(useStore.getState().currentScoreId).toBeNull();
    expect(library.loadMyScores()).toHaveLength(0);
  });
});
