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
  createMyScore,
  updateMyScore,
  deleteMyScore,
  type MyScore,
} from '../services/myScores';

/** 视图模式 */
export type ViewMode = 'edit' | 'play';

// ============================================================
// localStorage 持久化工具
// ============================================================
const STORAGE_KEY = 'hh-jianpu-state';

interface PersistedState {
  source: string;
  tempo: number;
  playDelay: number;
  currentScoreId: string | null;
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储空间不足等情况静默忽略
  }
}

/** 构造持久化状态对象（补全 playDelay 默认值） */
function buildPersistedState(
  source: string,
  tempo: number,
  playDelay: number,
  currentScoreId: string | null
): PersistedState {
  return { source, tempo, playDelay, currentScoreId };
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

  // 解析结果
  score: Score | null;
  parseErrors: ParseError[];

  // 视图模式
  mode: ViewMode;
  setMode: (m: ViewMode) => void;

  // 播放状态
  playbackStatus: PlaybackStatus;
  currentNoteIndex: number;
  tempo: number;
  isLoading: boolean; // 音频加载状态
  setTempo: (bpm: number) => void;

  // 播放延迟（倒计时）
  playDelay: number;      // 用户设置的延迟秒数（0 = 不延迟）
  countdownValue: number; // 当前倒计时剩余秒数（0 = 未在倒计时）
  setPlayDelay: (seconds: number) => void;
  cancelCountdown: () => void;

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
}

/** 解析源文本并更新 store */
function parseSource(source: string): { score: Score | null; parseErrors: ParseError[] } {
  const result = parse(source);
  return { score: result.score, parseErrors: result.errors };
}

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
// 倒计时定时器
let countdownTimer: ReturnType<typeof setInterval> | null = null;

export const useStore = create<AppState>((set, get) => {
  const player = new Player();

  // 设置播放回调
  player.setNoteHighlightCallback((index: number) => {
    set({ currentNoteIndex: index });
  });

  player.setStatusChangeCallback((status: PlaybackStatus) => {
    set({ playbackStatus: status });
    if (status === 'idle') {
      set({ currentNoteIndex: -1 });
    }
  });

  // 初始加载：优先读取 localStorage，没有则用示例
  const persisted = loadPersistedState();
  const initialSource = persisted.source ?? EXAMPLES.twinkle.source;
  const initialCurrentScoreId = persisted.currentScoreId ?? null;
  const initialParse = parseSource(initialSource);
  // tempo 优先从曲谱元数据读取，其次是 localStorage，最后默认 120
  const initialTempo = initialParse.score?.metadata?.tempo ?? persisted.tempo ?? 120;
  // playDelay 从 localStorage 读取，默认 0
  const initialPlayDelay = persisted.playDelay ?? 0;

  return {
    source: initialSource,
    setSource: (s: string) => {
      set({ source: s, isAutoSaving: true });
      // 防抖解析 + 自动保存
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const { score, parseErrors } = parseSource(s);
        const currentId = get().currentScoreId;
        const title = extractTitle(score, s);

        let newScoreId = currentId;
        if (currentId) {
          // 更新已有曲谱
          updateMyScore(currentId, { source: s, title });
        } else {
          // 首次编辑（示例/空白）→ 创建新曲谱
          const created = createMyScore(s, title);
          newScoreId = created.id;
        }

        // 如果曲谱元数据里有速度，同步到 store
        const scoreTempo = score?.metadata?.tempo;
        if (scoreTempo) {
          get().player.setTempo(scoreTempo);
        }
        set({
          score,
          parseErrors,
          currentScoreId: newScoreId,
          myScores: loadMyScores(),
          isAutoSaving: false,
          lastSavedAt: new Date(),
          ...(scoreTempo ? { tempo: scoreTempo } : {}),
        });
        savePersistedState(buildPersistedState(s, scoreTempo ?? get().tempo, get().playDelay, newScoreId));
      }, AUTO_SAVE_DELAY_MS);
    },

    setSourceImmediate: (s: string) => {
      const { score, parseErrors } = parseSource(s);
      // 如果曲谱元数据里有速度，同步到 store
      const scoreTempo = score?.metadata?.tempo;
      if (scoreTempo) {
        player.setTempo(scoreTempo);
      }
      set({ source: s, score, parseErrors, ...(scoreTempo ? { tempo: scoreTempo } : {}) });
      // setSourceImmediate 用于加载示例/已存曲谱，不触发自动保存流程
      const currentId = get().currentScoreId;
      savePersistedState(buildPersistedState(s, scoreTempo ?? get().tempo, get().playDelay, currentId));
    },

    score: initialParse.score,
    parseErrors: initialParse.parseErrors,

    // 我的谱谱初始化
    myScores: loadMyScores(),
    currentScoreId: initialCurrentScoreId,
    isAutoSaving: false,
    lastSavedAt: null,

    mode: 'edit',
    setMode: (m: ViewMode) => {
      if (m === 'edit') {
        get().stop();
      }
      set({ mode: m });
    },

    playbackStatus: 'idle',
    currentNoteIndex: -1,
    tempo: initialTempo,
    isLoading: false,
    setTempo: (bpm: number) => {
      set({ tempo: bpm });
      get().player.setTempo(bpm);
      savePersistedState(buildPersistedState(get().source, bpm, get().playDelay, get().currentScoreId));
    },

    playDelay: initialPlayDelay,
    countdownValue: 0,
    setPlayDelay: (seconds: number) => {
      set({ playDelay: seconds });
      savePersistedState(buildPersistedState(get().source, get().tempo, seconds, get().currentScoreId));
    },
    cancelCountdown: () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      set({ countdownValue: 0 });
    },

    player,

    // OCR 状态初始化
    ocrStatus: 'idle',
    ocrResult: null,
    ocrError: null,

    play: async () => {
      const { score, player, playDelay } = get();
      if (!score) return;

      // 如果正在倒计时，取消倒计时（切换为取消行为）
      if (get().countdownValue > 0) {
        get().cancelCountdown();
        return;
      }

      /** 实际开始音频播放 */
      const startAudio = async () => {
        try {
          set({ isLoading: true });
          player.loadScore(get().score!);
          player.setTempo(get().tempo);
          await player.play();
        } catch (error) {
          console.error('播放失败:', error);
        } finally {
          set({ isLoading: false });
        }
      };

      if (playDelay > 0) {
        // 启动倒计时
        set({ countdownValue: playDelay });
        countdownTimer = setInterval(() => {
          const current = get().countdownValue;
          if (current <= 1) {
            // 倒计时结束，开始播放
            clearInterval(countdownTimer!);
            countdownTimer = null;
            set({ countdownValue: 0 });
            void startAudio();
          } else {
            set({ countdownValue: current - 1 });
          }
        }, 1000);
      } else {
        await startAudio();
      }
    },

    pause: () => {
      get().player.pause();
    },

    stop: () => {
      // 同时取消倒计时
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        set({ countdownValue: 0 });
      }
      get().player.stop();
    },

    loadExample: (key: string) => {
      const example = EXAMPLES[key as keyof typeof EXAMPLES];
      if (example) {
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
      const scores = loadMyScores();
      const found = scores.find((s) => s.id === id);
      if (!found) return;
      set({ currentScoreId: id });
      get().setSourceImmediate(found.source);
      savePersistedState(buildPersistedState(found.source, get().tempo, get().playDelay, id));
    },

    deleteScore: (id: string) => {
      deleteMyScore(id);
      const updated = loadMyScores();
      if (get().currentScoreId === id) {
        set({ currentScoreId: null, myScores: updated });
        savePersistedState(buildPersistedState(get().source, get().tempo, get().playDelay, null));
      } else {
        set({ myScores: updated });
      }
    },

    renameScore: (id: string, title: string) => {
      updateMyScore(id, { title });
      set({ myScores: loadMyScores() });
    },

    newScore: () => {
      set({ currentScoreId: null });
      const emptySource = `---
标题：未命名曲谱
调号：C
拍号：4/4
速度：98
---

Q | 5, 6,/ 1 3. | 2 3/ 2 1. |`;
      get().setSourceImmediate(emptySource);
      savePersistedState(buildPersistedState(emptySource, get().tempo, get().playDelay, null));
    },

    refreshMyScores: () => {
      set({ myScores: loadMyScores() });
    },
  };
});
