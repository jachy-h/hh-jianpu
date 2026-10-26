import { create } from 'zustand';
import { parse, Player } from '@hh-jianpu/core';
import type { Score, ParseError, PlaybackStatus } from '@hh-jianpu/core';
import { EXAMPLES } from '../examples';
import { AUTO_SAVE_DELAY_MS } from '../config';
import {
  recognizeImage,
  loadLLMConfig,
  type OCRStatus,
  type OCRResult,
  type OCRError,
  type ImportMode,
} from '../services/ocr';
import {
  loadMyScores,
  findMyScore,
  createMyScore,
  updateMyScore,
  deleteMyScore,
  type MyScore,
} from '../services/myScores';

/** 视图模式 */
export type ViewMode = 'edit';
export interface LoopSelection {
  readonly startMeasure: number;
  readonly endMeasure: number | null;
}

// ============================================================
// localStorage 持久化工具
// ============================================================
const STORAGE_KEY = 'hh-jianpu-state';

interface PersistedState {
  source: string;
  tempo: number;
  playDelay: number;
  currentScoreId: string | null;
  sourceUpdatedAt: number;
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return {};
    const data = value as Record<string, unknown>;
    return {
      ...(typeof data.source === 'string' ? { source: data.source } : {}),
      ...(typeof data.tempo === 'number' && Number.isFinite(data.tempo) && data.tempo > 0 ? { tempo: data.tempo } : {}),
      ...(typeof data.playDelay === 'number' && Number.isFinite(data.playDelay) && data.playDelay >= 0 ? { playDelay: data.playDelay } : {}),
      ...(typeof data.currentScoreId === 'string' || data.currentScoreId === null ? { currentScoreId: data.currentScoreId } : {}),
      ...(typeof data.sourceUpdatedAt === 'number' && Number.isFinite(data.sourceUpdatedAt) ? { sourceUpdatedAt: data.sourceUpdatedAt } : {}),
    };
  } catch {
    return {};
  }
}

function savePersistedState(state: PersistedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** 构造持久化状态对象（补全 playDelay 默认值） */
function buildPersistedState(
  source: string,
  tempo: number,
  playDelay: number,
  currentScoreId: string | null,
  sourceUpdatedAt: number = Date.now()
): PersistedState {
  return { source, tempo, playDelay, currentScoreId, sourceUpdatedAt };
}

/** 从解析结果或源文本提取标题 */
function extractTitle(score: Score | null, source: string): string {
  if (score?.metadata?.title) return score.metadata.title;
  const match = source.match(/标题[:：]\s*(.+)/);
  return match?.[1]?.trim() || '未命名曲谱';
}

interface AppState {
  // 源文本
  source: string;
  setSource: (s: string) => void;
  setSourceImmediate: (s: string) => void; // 不经过防抖的直接设置
  retrySave: () => void;

  // 解析结果
  score: Score | null;
  parseErrors: ParseError[];

  // 播放状态
  playbackStatus: PlaybackStatus;
  playbackError: string | null;
  currentNoteIndex: number;
  activeNoteIndices: number[];
  mutedVoices: ('upper' | 'lower')[];
  setVoiceMuted: (id: 'upper' | 'lower', muted: boolean) => void;
  tempo: number;
  practiceSpeed: number;
  setPracticeSpeed: (speed: number) => void;
  isLoading: boolean; // 音频加载状态
  setTempo: (bpm: number) => void;

  // 播放延迟（倒计时）
  playDelay: number;        // 用户设置的延迟拍数（0 = 不延迟）
  countdownValue: number;   // 当前倒计时剩余拍数（0 = 未在倒计时）
  isMetronomeActive: boolean; // 节拍器是否处于预热阶段
  setPlayDelay: (beats: number) => void;
  loopSelection: LoopSelection | null;
  selectLoopMeasure: (measure: number) => void;
  clearLoopSelection: () => void;
  cancelCountdown: () => void;

  // 音符字体大小（演奏模式）
  noteFontSize: number;
  setNoteFontSize: (size: number) => void;

  // 播放器实例
  player: Player;

  // OCR 相关
  ocrStatus: OCRStatus;
  ocrResult: OCRResult | null;
  ocrError: OCRError | null;

  // 我的谱谱
  myScores: MyScore[];
  currentScoreId: string | null; // 正在编辑的曲谱 ID（null 表示加载自示例或未保存）
  isAutoSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  lastSavedAt: Date | null; // 最近一次自动保存完成的时间

  // 操作
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  loadExample: (key: string) => void;

  // OCR 操作
  recognizeImage: (file: File) => Promise<void>;
  applyOCRResult: (mode: ImportMode) => void;
  clearOCRState: () => void;

  // 我的谱谱操作
  loadMyScore: (id: string) => void;
  deleteScore: (id: string) => void;
  renameScore: (id: string, title: string) => void;
  newScore: () => void;
  refreshMyScores: () => void;
  saveAsNewScore: (source: string, titleSuffix?: string) => void;
}

/** 解析源文本并更新 store */
function parseSource(source: string): { score: Score | null; parseErrors: ParseError[] } {
  const result = parse(source);
  return { score: result.score, parseErrors: result.errors };
}

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let parseDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEdit: { source: string; targetId: string | null; revision: number } | null = null;
let editRevision = 0;

export const useStore = create<AppState>((set, get) => {
  const player = new Player();
  let parsedSource = '';

  const commitEdit = (edit: { source: string; targetId: string | null }): boolean => {
    try {
      const { score, parseErrors } = parseSource(edit.source);
      parsedSource = edit.source;
      const title = extractTitle(score, edit.source);
      let saved = edit.targetId ? updateMyScore(edit.targetId, { source: edit.source, title }) : null;
      if (!saved) saved = createMyScore(edit.source, title);
      // 主库成功后立即绑定 ID，恢复状态单独写入失败时重试不会重复建谱。
      set({ currentScoreId: saved.id, myScores: loadMyScores() });

      const scoreTempo = score?.metadata?.tempo;
      if (scoreTempo) player.setTempo(scoreTempo * get().practiceSpeed);
      if (!savePersistedState(buildPersistedState(edit.source, scoreTempo ?? get().tempo, get().playDelay, saved.id, saved.updatedAt))) {
        throw new Error('PERSISTED_STATE_WRITE_FAILED');
      }
      set({
        score,
        parseErrors,
        currentScoreId: saved.id,
        myScores: loadMyScores(),
        isAutoSaving: false,
        saveStatus: 'saved',
        saveError: null,
        lastSavedAt: new Date(),
        ...(scoreTempo ? { tempo: scoreTempo } : {}),
      });
      return true;
    } catch (error) {
      console.error('曲谱保存失败:', error);
      set({ isAutoSaving: false, saveStatus: 'error', saveError: '本地保存失败，请重试或导出备份。' });
      return false;
    }
  };

  const flushPendingEdit = (): boolean => {
    if (parseDebounceTimer) {
      clearTimeout(parseDebounceTimer);
      parseDebounceTimer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (!pendingEdit) return get().saveStatus !== 'error';
    const edit = pendingEdit;
    if (!commitEdit(edit)) return false;
    pendingEdit = null;
    return true;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { flushPendingEdit(); });
  }

  // 初始加载：优先读取 localStorage，没有则用示例
  const persisted = loadPersistedState();
  const initialCurrentScoreId = persisted.currentScoreId ?? null;
  const initialSavedScore = initialCurrentScoreId ? findMyScore(initialCurrentScoreId) : null;
  const libraryIsNewer = initialSavedScore && persisted.sourceUpdatedAt !== undefined
    && initialSavedScore.updatedAt > persisted.sourceUpdatedAt;
  const initialSource = libraryIsNewer ? initialSavedScore.source : persisted.source ?? EXAMPLES.twinkle.source;
  const initialParse = parseSource(initialSource);
  // 输入时写入 localStorage 的源码是页面崩溃/刷新后的恢复草稿。
  // 启动时按草稿绑定的曲谱 ID 回写库，避免恢复后再次离开时丢失最新编辑。
  let recoveryFailed = false;
  try {
  if (initialCurrentScoreId) {
    const savedScore = findMyScore(initialCurrentScoreId);
    if (savedScore && savedScore.source !== initialSource) {
      updateMyScore(initialCurrentScoreId, {
        source: initialSource,
        title: extractTitle(initialParse.score, initialSource),
      });
    }
  }
  } catch {
    recoveryFailed = true;
  }
  if (libraryIsNewer) {
    savePersistedState(buildPersistedState(initialSource, initialParse.score?.metadata.tempo ?? persisted.tempo ?? 120, persisted.playDelay ?? 0, initialCurrentScoreId, initialSavedScore.updatedAt));
  }
  parsedSource = initialSource;
  // tempo 优先从曲谱元数据读取，其次是 localStorage，最后默认 120
  const initialTempo = initialParse.score?.metadata?.tempo ?? persisted.tempo ?? 120;

  // 同步初始 tempo 到 player
  player.setTempo(initialTempo);

  // 设置播放回调
  player.setNoteHighlightCallback((index: number, activeIndices?: number[]) => {
    set({ currentNoteIndex: index, activeNoteIndices: activeIndices ?? (index < 0 ? [] : [index]) });
  });

  player.setStatusChangeCallback((status: PlaybackStatus) => {
    set({ playbackStatus: status });
    if (status === 'idle') {
      set({ currentNoteIndex: -1, activeNoteIndices: [] });
    }
  });

  // playDelay 从 localStorage 读取，默认 0
  const initialPlayDelay = persisted.playDelay ?? 0;

  return {
    source: initialSource,
    setSource: (s: string) => {
      if (get().loopSelection) {
        get().player.setLoopRange(null);
        set({ loopSelection: null });
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const edit = { source: s, targetId: get().currentScoreId, revision: ++editRevision };
      pendingEdit = edit;
      const draftSaved = savePersistedState(buildPersistedState(s, get().tempo, get().playDelay, edit.targetId));
      set({
        source: s,
        isAutoSaving: true,
        saveStatus: draftSaved ? 'saving' : 'error',
        saveError: draftSaved ? null : '本地草稿保存失败，请及时导出备份。',
      });
      if (parseDebounceTimer) clearTimeout(parseDebounceTimer);
      parseDebounceTimer = setTimeout(() => {
        if (edit.revision !== editRevision) return;
        const parsed = parseSource(s);
        parsedSource = s;
        const scoreTempo = parsed.score?.metadata?.tempo;
        if (scoreTempo) player.setTempo(scoreTempo * get().practiceSpeed);
        set({
          score: parsed.score,
          parseErrors: parsed.parseErrors,
          ...(scoreTempo ? { tempo: scoreTempo } : {}),
        });
        parseDebounceTimer = null;
      }, 300);
      debounceTimer = setTimeout(() => {
        if (pendingEdit?.revision !== edit.revision) return;
        debounceTimer = null;
        if (commitEdit(edit)) pendingEdit = null;
      }, AUTO_SAVE_DELAY_MS);
    },

    setSourceImmediate: (s: string) => {
      if (!flushPendingEdit()) return;
      get().stop();
      get().player.setLoopRange(null);
      editRevision++;
      if (parseDebounceTimer) {
        clearTimeout(parseDebounceTimer);
        parseDebounceTimer = null;
      }
      const { score, parseErrors } = parseSource(s);
      parsedSource = s;
      // 如果曲谱元数据里有速度，同步到 store
      const scoreTempo = score?.metadata?.tempo;
      if (scoreTempo) {
        player.setTempo(scoreTempo * get().practiceSpeed);
      }
      set({ source: s, score, parseErrors, loopSelection: null, ...(scoreTempo ? { tempo: scoreTempo } : {}) });
      // setSourceImmediate 用于加载示例/已存曲谱，不触发自动保存流程
      const currentId = get().currentScoreId;
      const persisted = savePersistedState(buildPersistedState(s, scoreTempo ?? get().tempo, get().playDelay, currentId));
      if (!persisted) set({ saveStatus: 'error', saveError: '本地草稿保存失败，请导出备份。' });
    },
    retrySave: () => {
      const { source, currentScoreId } = get();
      set({ isAutoSaving: true, saveStatus: 'saving', saveError: null });
      if (commitEdit({ source, targetId: currentScoreId })) {
        pendingEdit = null;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },

    score: initialParse.score,
    parseErrors: initialParse.parseErrors,

    // 我的谱谱初始化
    myScores: loadMyScores(),
    currentScoreId: initialCurrentScoreId,
    isAutoSaving: false,
    saveStatus: recoveryFailed ? 'error' : 'idle',
    saveError: recoveryFailed ? '恢复草稿尚未写入曲谱库，请重试或导出备份。' : null,
    lastSavedAt: null,

    playbackStatus: 'idle',
    playbackError: null,
    currentNoteIndex: -1,
    activeNoteIndices: [],
    mutedVoices: [],
    setVoiceMuted: (id, muted) => {
      get().player.setVoiceMuted(id, muted);
      set({ mutedVoices: muted ? [...new Set([...get().mutedVoices, id])] : get().mutedVoices.filter(voice => voice !== id) });
    },
    tempo: initialTempo,
    practiceSpeed: 1,
    setPracticeSpeed: (speed: number) => {
      if (!Number.isFinite(speed) || speed < 0.25 || speed > 2) return;
      set({ practiceSpeed: speed });
      player.setTempo(get().tempo * speed);
    },
    isLoading: false,
    setTempo: (bpm: number) => {
      set({ tempo: bpm });
      get().player.setTempo(bpm * get().practiceSpeed);
      if (!savePersistedState(buildPersistedState(get().source, bpm, get().playDelay, get().currentScoreId))) {
        set({ saveStatus: 'error', saveError: '设置保存失败。' });
      }
    },

    playDelay: initialPlayDelay,
    loopSelection: null,
    selectLoopMeasure: (measure: number) => {
      const current = get().loopSelection;
      if (!current || current.endMeasure !== null) {
        get().player.setLoopRange(null);
        if (get().player.status !== 'idle') get().player.stop();
        set({ loopSelection: { startMeasure: measure, endMeasure: null } });
        return;
      }
      const range = {
        startMeasure: Math.min(current.startMeasure, measure),
        endMeasure: Math.max(current.startMeasure, measure),
      };
      if (get().player.status !== 'idle') get().player.stop();
      get().player.setLoopRange(range);
      set({ loopSelection: range });
    },
    clearLoopSelection: () => {
      if (get().player.status !== 'idle') get().player.stop();
      get().player.setLoopRange(null);
      set({ loopSelection: null });
    },
    countdownValue: 0,
    isMetronomeActive: false,
    noteFontSize: 18,
    setNoteFontSize: (size: number) => {
      set({ noteFontSize: size });
    },
    setPlayDelay: (beats: number) => {
      set({ playDelay: beats });
      if (!savePersistedState(buildPersistedState(get().source, get().tempo, beats, get().currentScoreId))) {
        set({ saveStatus: 'error', saveError: '设置保存失败。' });
      }
    },
    cancelCountdown: () => {
      get().player.stopMetronomeWarmup();
      set({ countdownValue: 0, isMetronomeActive: false });
    },

    player,

    // OCR 状态初始化
    ocrStatus: 'idle',
    ocrResult: null,
    ocrError: null,

    play: async () => {
      if (get().isLoading) return;
      set({ playbackError: null });
      let current = get();
      if (parsedSource !== current.source) {
        const parsed = parseSource(current.source);
        parsedSource = current.source;
        const scoreTempo = parsed.score?.metadata?.tempo;
        if (scoreTempo) current.player.setTempo(scoreTempo * get().practiceSpeed);
        set({ score: parsed.score, parseErrors: parsed.parseErrors, ...(scoreTempo ? { tempo: scoreTempo } : {}) });
        current = get();
      }
      const { score, player, playDelay, isMetronomeActive } = current;
      if (!score) return;
      if (score.secondaryVoice && current.parseErrors.length) {
        set({ playbackError: '请先修正双声部曲谱中的语法或小节时值错误。' });
        return;
      }

      // 倒计时期间再次触发 → 停止倒计时，不重新开始
      if (isMetronomeActive) {
        player.stopMetronomeWarmup();
        set({ countdownValue: 0, isMetronomeActive: false });
        return;
      }

      /** 实际开始音频播放 */
      const doPlay = async () => {
        try {
          set({ isLoading: true });
          // 暂停状态下直接恢复，不能调用 loadScore（其内部会 stop，导致状态重置为 idle 从头播放）
          if (player.status !== 'paused') {
            player.loadScore(get().score!);
          }
          const selection = get().loopSelection;
          player.setLoopRange(selection?.endMeasure !== null && selection
            ? { startMeasure: selection.startMeasure, endMeasure: selection.endMeasure }
            : null);
          player.setTempo(get().tempo * get().practiceSpeed);
          // 延迟已在预热节拍器期间完成，这里不再延迟
          await player.play(0);
        } catch (error) {
          console.error('播放失败:', error);
          set({ playbackError: '播放启动失败，请检查音频权限后重试。' });
        } finally {
          set({ isLoading: false });
        }
      };

      // 延迟拍数 > 0 时，启动预热节拍器
      if (playDelay > 0 && player.status !== 'paused') {
        set({ countdownValue: playDelay, isMetronomeActive: true });

        try {
          await player.startMetronomeWarmup(playDelay, () => {
            set({ countdownValue: 0, isMetronomeActive: false });
            void doPlay();
          }, (remainingBeats) => {
            set({ countdownValue: remainingBeats });
          });
        } catch (error) {
          console.error('节拍器预热失败:', error);
          set({
            countdownValue: 0,
            isMetronomeActive: false,
            playbackError: '节拍器启动失败，请检查音频权限后重试。',
          });
        }
        return;
      }

      await doPlay();
    },

    pause: () => {
      get().player.pause();
      // 暂停时清理倒计时状态（但不调用 stopMetronomeWarmup，它会清除 Transport 调度导致无法继续播放）
      set({ countdownValue: 0, isMetronomeActive: false });
      // 仅停止节拍器预热的定时器，不调用 get().player.stopMetronomeWarmup()
      // 因为后者会调用 Transport.cancel() 清除所有调度，导致恢复播放时无音符可播放
    },

    stop: () => {
      // 同时取消倒计时
      set({ countdownValue: 0, isMetronomeActive: false });
      get().player.stopMetronomeWarmup();
      get().player.stop();
      set({ playbackError: null });
    },

    loadExample: (key: string) => {
      const example = EXAMPLES[key as keyof typeof EXAMPLES];
      if (example) {
        if (!flushPendingEdit()) return;
        player.setLoopRange(null);
        set({ loopSelection: null });
        // 切换到示例时重置 currentScoreId，下次编辑会自动创建新曲谱
        set({ currentScoreId: null });
        get().setSourceImmediate(example.source);
        savePersistedState(buildPersistedState(example.source, get().tempo, get().playDelay, null));
      }
    },

    // OCR 操作实现（新增）
    recognizeImage: async (file: File) => {
      // 清除之前的状态
      set({ ocrStatus: 'idle', ocrResult: null, ocrError: null });

      // 加载配置
      const config = loadLLMConfig();
      if (!config) {
        set({
          ocrStatus: 'error',
          ocrError: {
            code: 'INVALID_API_KEY',
            message: '请先在设置中配置 API Key',
          },
        });
        return;
      }

      try {
        // 开始识别
        const result = await recognizeImage(
          file,
          config,
          (progress) => {
            set({ ocrStatus: progress.status });
          }
        );

        set({ ocrStatus: 'done', ocrResult: result, ocrError: null });
      } catch (error) {
        set({
          ocrStatus: 'error',
          ocrError: error as OCRError,
          ocrResult: null,
        });
      }
    },

    applyOCRResult: (mode: ImportMode) => {
      const { ocrResult, source } = get();
      if (!ocrResult) return;

      if (mode === 'replace') {
        get().setSourceImmediate(ocrResult.source);
      } else if (mode === 'append') {
        const newSource = source + '\n\n' + ocrResult.source;
        get().setSourceImmediate(newSource);
      }

      // 应用后清除 OCR 状态
      get().clearOCRState();
    },

    clearOCRState: () => {
      set({ ocrStatus: 'idle', ocrResult: null, ocrError: null });
    },

    // ============================================================
    // 我的谱谱操作
    // ============================================================

    loadMyScore: (id: string) => {
      if (!flushPendingEdit()) return;
      get().stop();
      const scores = loadMyScores();
      const found = scores.find((s) => s.id === id);
      if (!found) return;
      get().player.setLoopRange(null);
      set({ loopSelection: null });
      set({ currentScoreId: id });
      get().setSourceImmediate(found.source);
      savePersistedState(buildPersistedState(found.source, get().tempo, get().playDelay, id));
    },

    deleteScore: (id: string) => {
      if (!flushPendingEdit()) return;
      try {
        deleteMyScore(id);
      } catch {
        set({ saveStatus: 'error', saveError: '删除未保存，请重试或导出备份。' });
        return;
      }
      const updated = loadMyScores();
      if (get().currentScoreId === id) {
        set({ currentScoreId: null, myScores: updated });
        savePersistedState(buildPersistedState(get().source, get().tempo, get().playDelay, null));
      } else {
        set({ myScores: updated });
      }
    },

    renameScore: (id: string, title: string) => {
      if (!flushPendingEdit()) return;
      const existing = loadMyScores().find((score) => score.id === id);
      if (!existing) return;
      const titleHeader = /^(\s*(?:标题|title)\s*[:：]).*$/mi;
      let source = existing.source.replace(titleHeader, (_match, prefix: string) => `${prefix}${title}`);
      if (source === existing.source) {
        source = source.startsWith('---')
          ? source.replace(/^---\s*\n/, (separator) => `${separator}标题：${title}\n`)
          : `标题：${title}\n${source}`;
      }
      try {
        updateMyScore(id, { title, source });
      } catch {
        set({ saveStatus: 'error', saveError: '重命名未保存，请重试或导出备份。' });
        return;
      }
      if (get().currentScoreId === id) {
        get().setSourceImmediate(source);
      }
      set({ myScores: loadMyScores() });
    },

    newScore: () => {
      if (!flushPendingEdit()) return;
      player.setLoopRange(null);
      set({ loopSelection: null });
      set({ currentScoreId: null });
      const emptySource = `---
标题：未命名曲谱
调号：C
拍号：4/4
速度：98
---

Q | |`;
      get().setSourceImmediate(emptySource);
      savePersistedState(buildPersistedState(emptySource, get().tempo, get().playDelay, null));
    },

    refreshMyScores: () => {
      set({ myScores: loadMyScores() });
    },

    saveAsNewScore: (source: string, titleSuffix?: string) => {
      if (!flushPendingEdit()) return;
      const { score: parsedScore } = parseSource(source);
      const baseTitle = extractTitle(parsedScore, source);
      let finalSource = source;
      let title = baseTitle;
      if (titleSuffix) {
        title = `${baseTitle}-${titleSuffix}`;
        // 同步更新源码中的标题字段
        finalSource = source.replace(
          /^(标题[：:])(.+)$/m,
          `$1${title}`
        );
      }
      const { score, parseErrors } = parseSource(finalSource);
      get().stop();
      player.setLoopRange(null);
      parsedSource = finalSource;
      let created: MyScore;
      try {
        created = createMyScore(finalSource, title);
      } catch {
        set({ source: finalSource, score, parseErrors, currentScoreId: null, loopSelection: null, saveStatus: 'error', saveError: '另存失败，已保留新稿，请重试或导出备份。' });
        savePersistedState(buildPersistedState(finalSource, get().tempo, get().playDelay, null));
        return;
      }
      const scoreTempo = score?.metadata?.tempo;
      if (scoreTempo) {
        get().player.setTempo(scoreTempo * get().practiceSpeed);
      }
      set({
        loopSelection: null,
        saveStatus: 'saved',
        saveError: null,
        source: finalSource,
        score,
        parseErrors,
        currentScoreId: created.id,
        myScores: loadMyScores(),
        lastSavedAt: new Date(),
        ...(scoreTempo ? { tempo: scoreTempo } : {}),
      });
      if (!savePersistedState(buildPersistedState(finalSource, scoreTempo ?? get().tempo, get().playDelay, created.id, created.updatedAt))) {
        set({ saveStatus: 'error', saveError: '曲谱已保存，恢复草稿写入失败，请重试。' });
      }
    },
  };
});
