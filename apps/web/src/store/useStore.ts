import { create } from 'zustand';
import { parse, Player } from '@as-nmn/core';
import type { Score, ParseError, PlaybackStatus } from '@as-nmn/core';
import { EXAMPLES } from '../examples';
import {
  recognizeImage,
  loadLLMConfig,
  type OCRStatus,
  type OCRResult,
  type OCRError,
  type ImportMode,
} from '../services/ocr';

/** 视图模式 */
export type ViewMode = 'edit' | 'play';

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

  // OCR 相关（新增）
  ocrStatus: OCRStatus;
  ocrResult: OCRResult | null;
  ocrError: OCRError | null;

  // 操作
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  loadExample: (key: string) => void;

  // OCR 操作（新增）
  recognizeImage: (file: File) => Promise<void>;
  applyOCRResult: (mode: ImportMode) => void;
  clearOCRState: () => void;
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

  // 初始加载示例
  const initialSource = EXAMPLES.twinkle.source;
  const initialParse = parseSource(initialSource);

  return {
    source: initialSource,
    setSource: (s: string) => {
      set({ source: s });
      // 防抖解析
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const { score, parseErrors } = parseSource(s);
        set({ score, parseErrors });
      }, 300);
    },

    setSourceImmediate: (s: string) => {
      const { score, parseErrors } = parseSource(s);
      set({ source: s, score, parseErrors });
    },

    score: initialParse.score,
    parseErrors: initialParse.parseErrors,

    mode: 'edit',
    setMode: (m: ViewMode) => {
      if (m === 'edit') {
        get().stop();
      }
      set({ mode: m });
    },

    playbackStatus: 'idle',
    currentNoteIndex: -1,
    tempo: 120,
    isLoading: false,
    setTempo: (bpm: number) => {
      set({ tempo: bpm });
      get().player.setTempo(bpm);
    },

    player,

    // OCR 状态初始化（新增）
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
        get().setSourceImmediate(example.source);
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
  };
});
