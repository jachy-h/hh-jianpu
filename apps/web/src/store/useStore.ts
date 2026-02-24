import { create } from 'zustand';
import { parse, Player } from '@hh-jianpu/core';
import type { Score, ParseError, PlaybackStatus } from '@hh-jianpu/core';
import { EXAMPLES } from '../examples';
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
  const initialTempo = persisted.tempo ?? 120;
  const initialCurrentScoreId = persisted.currentScoreId ?? null;
  const initialParse = parseSource(initialSource);

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

        set({
          score,
          parseErrors,
          currentScoreId: newScoreId,
          myScores: loadMyScores(),
          isAutoSaving: false,
        });
        savePersistedState({ source: s, tempo: get().tempo, currentScoreId: newScoreId });
      }, 300);
    },

    setSourceImmediate: (s: string) => {
      const { score, parseErrors } = parseSource(s);
      set({ source: s, score, parseErrors });
      // setSourceImmediate 用于加载示例/已存曲谱，不触发自动保存流程
      const currentId = get().currentScoreId;
      savePersistedState({ source: s, tempo: get().tempo, currentScoreId: currentId });
    },

    score: initialParse.score,
    parseErrors: initialParse.parseErrors,

    // 我的谱谱初始化
    myScores: loadMyScores(),
    currentScoreId: initialCurrentScoreId,
    isAutoSaving: false,

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
      savePersistedState({ source: get().source, tempo: bpm, currentScoreId: get().currentScoreId });
    },

    player,

    // OCR 状态初始化
    ocrStatus: 'idle',
    ocrResult: null,
    ocrError: null,

    play: async () => {
      const { score, player } = get();
      if (!score) return;
      try {
        set({ isLoading: true });
        player.loadScore(score);
        player.setTempo(get().tempo);
        await player.play();
      } catch (error) {
        console.error('播放失败:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    pause: () => {
      get().player.pause();
    },

    stop: () => {
      get().player.stop();
    },

    loadExample: (key: string) => {
      const example = EXAMPLES[key as keyof typeof EXAMPLES];
      if (example) {
        // 切换到示例时重置 currentScoreId，下次编辑会自动创建新曲谱
        set({ currentScoreId: null });
        get().setSourceImmediate(example.source);
        savePersistedState({ source: example.source, tempo: get().tempo, currentScoreId: null });
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
      savePersistedState({ source: found.source, tempo: get().tempo, currentScoreId: id });
    },

    deleteScore: (id: string) => {
      deleteMyScore(id);
      const updated = loadMyScores();
      if (get().currentScoreId === id) {
        set({ currentScoreId: null, myScores: updated });
        savePersistedState({ source: get().source, tempo: get().tempo, currentScoreId: null });
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
      const emptySource = '标题: 未命名曲谱\n调号: C\n拍号: 4/4\n速度: 120\n\n';
      get().setSourceImmediate(emptySource);
      savePersistedState({ source: emptySource, tempo: get().tempo, currentScoreId: null });
    },

    refreshMyScores: () => {
      set({ myScores: loadMyScores() });
    },
  };
});
