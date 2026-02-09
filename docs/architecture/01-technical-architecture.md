# 技术架构设计 — hh-jianpu

## 一、架构总览

### 设计哲学
- **纯前端应用**：无后端依赖，所有逻辑在浏览器端完成
- **关注点分离**：解析器 / 渲染器 / 播放器 三大核心模块独立解耦
- **库优先**：核心能力封装为独立库（`@hh-jianpu/core`），UI 层薄壳化

### 技术选型

| 层面 | 选型 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，简谱 AST 需要严格的类型定义 |
| 构建 | Vite | 极速 HMR，原生 ESM，零配置上手 |
| UI 框架 | React 18 | 生态成熟，组件化渲染简谱天然契合 |
| 状态管理 | Zustand | 极简，单 store，无 boilerplate |
| 简谱渲染 | SVG（自研） | Canvas 不利于交互，DOM 性能不够，SVG 平衡交互与性能 |
| 音频合成 | Tone.js | Web Audio API 封装，音符合成开箱即用 |
| 代码编辑器 | CodeMirror 6 | 轻量、可扩展、支持自定义语法高亮 |
| 样式方案 | Tailwind CSS | 极简 UI 开发效率高，无需自建设计系统 |
| 包管理 | pnpm + monorepo | 核心库与应用分离，便于未来扩展 |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Application                      │
│                      (React + Vite + Tailwind)              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   编辑视图    │  │   预览视图    │  │    演奏视图        │  │
│  │  (CodeMirror) │  │  (SVG 渲染)  │  │ (SVG + 高亮控制)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴──────────┐  │
│  │                 Zustand Store                          │  │
│  │  source: string, score: Score, playback: PlaybackState │  │
│  └──────┬─────────────────┬────────────────────┬──────────┘  │
├─────────┼─────────────────┼────────────────────┼────────────┤
│         ▼                 ▼                    ▼             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Parser     │  │  Renderer    │  │    Player        │    │
│  │  (解析器)    │  │  (渲染器)     │  │   (播放器)       │    │
│  │             │  │              │  │                  │    │
│  │ 文本→AST    │  │ AST→SVG      │  │ AST→Audio        │    │
│  │ Tokenizer   │  │ Layout       │  │ Tone.js          │    │
│  │ Parser      │  │ SVGBuilder   │  │ Scheduler        │    │
│  └─────────────┘  └──────────────┘  └──────────────────┘    │
│                                                             │
│                   @hh-jianpu/core (独立库)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、核心模块设计

### 2.1 Parser（解析器）

**职责**：将简谱文本解析为结构化的 AST（抽象语法树）

```
输入: 简谱文本字符串
输出: Score (AST)

流程: Source Text → Tokenizer → Token[] → Parser → Score (AST)
```

#### AST 核心类型

```typescript
interface Score {
  metadata: Metadata;
  measures: Measure[];
}

interface Metadata {
  title?: string;
  key: Key;           // 调号: C, D, E...
  timeSignature: TimeSignature; // 拍号: 4/4, 3/4...
  tempo: number;      // BPM
}

interface Measure {
  number: number;
  notes: NoteGroup[];
}

type NoteGroup = Note | Rest | Tie;

interface Note {
  type: 'note';
  pitch: number;      // 1-7
  octave: number;     // -1(低), 0(中), 1(高)
  accidental?: 'sharp' | 'flat';
  duration: Duration;
  dot: boolean;       // 附点
}

interface Rest {
  type: 'rest';
  duration: Duration;
}

interface Tie {
  type: 'tie';
  duration: Duration;
}

interface Duration {
  base: 1 | 2 | 4 | 8 | 16;  // 全/二分/四分/八分/十六分
  dots: number;
}
```

### 2.2 Renderer（渲染器）

**职责**：将 AST 转换为 SVG 元素，处理布局与排版

```
输入: Score (AST)
输出: React SVG Components

流程: Score → LayoutEngine → PositionedElements → SVG Components
```

#### 布局策略
- 每行固定 N 个小节（桌面 4，移动 2）
- 等宽音符间距（简谱特性：每拍等宽）
- 小节线、减时线、附点、高低八度点均为 SVG 元素
- 音符可点击（用于从某位置开始播放）

#### 渲染元素

| 元素 | SVG 实现 |
|------|---------|
| 音符数字 | `<text>` |
| 小节线 | `<line>` |
| 减时线（下划线） | `<line>` 位于数字下方 |
| 高八度点 | `<circle>` 位于数字上方 |
| 低八度点 | `<circle>` 位于数字下方 |
| 延长线 | `<line>` 破折号 |
| 附点 | `<circle>` 音符右侧 |
| 高亮背景 | `<rect>` 带透明度 |
| 升降号 | `<text>` # 或 ♭ |

### 2.3 Player（播放器）

**职责**：根据 AST 控制音频播放与时间同步

```
输入: Score (AST) + PlaybackConfig
输出: Audio Output + 时间事件回调

流程: Score → Scheduler → Tone.js Synth → Audio Output
                ↓
        time events → highlight callback → UI 更新
```

#### 播放架构

```typescript
interface PlaybackConfig {
  tempo: number;        // BPM
  startMeasure?: number;
  endMeasure?: number;  // 循环范围
  loop: boolean;
}

interface PlaybackState {
  status: 'idle' | 'playing' | 'paused';
  currentNoteIndex: number;
  currentTime: number;
  tempo: number;
}
```

#### 音频策略
- 使用 `Tone.Synth` 合成器生成简单正弦波/三角波音色
- 通过 `Tone.Transport` 调度音符事件
- 每个音符触发时回调更新 `currentNoteIndex`
- UI 层通过订阅 `currentNoteIndex` 变化实现高亮

---

## 三、数据流

```
用户输入文本
     │
     ▼
┌─────────┐     ┌─────────┐     ┌─────────────┐
│ Editor  │────▶│ Parser  │────▶│ Zustand     │
│(文本)   │     │(文本→AST)│     │ Store       │
└─────────┘     └─────────┘     │             │
                                │ source ────────▶ Editor
                                │ score  ────────▶ Renderer → SVG
                                │ playback ──────▶ Player → Audio
                                │ highlight ─────▶ Renderer → 高亮
                                └─────────────┘
```

### 状态定义

```typescript
interface AppStore {
  // 源文本
  source: string;
  setSource: (s: string) => void;

  // 解析后的 AST
  score: Score | null;
  parseErrors: ParseError[];

  // 视图模式
  mode: 'edit' | 'play';
  setMode: (m: 'edit' | 'play') => void;

  // 播放状态
  playback: PlaybackState;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setTempo: (bpm: number) => void;
  seekToNote: (index: number) => void;
}
```

---

## 四、项目结构

```
hh-jianpu/
├── docs/
│   ├── production/          # 产品设计文档
│   └── architecture/        # 技术架构文档
│
├── packages/
│   └── core/                # @hh-jianpu/core - 核心库
│       ├── src/
│       │   ├── parser/      # 解析器
│       │   │   ├── tokenizer.ts
│       │   │   ├── parser.ts
│       │   │   └── index.ts
│       │   ├── renderer/    # 渲染器（纯逻辑，不含 React）
│       │   │   ├── layout.ts
│       │   │   └── index.ts
│       │   ├── player/      # 播放器
│       │   │   ├── scheduler.ts
│       │   │   ├── synth.ts
│       │   │   └── index.ts
│       │   ├── types/       # 类型定义
│       │   │   └── index.ts
│       │   └── index.ts     # 库入口
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   └── web/                 # Web 应用
│       ├── src/
│       │   ├── components/  # React 组件
│       │   │   ├── Editor/
│       │   │   │   └── Editor.tsx
│       │   │   ├── ScoreView/
│       │   │   │   ├── ScoreView.tsx
│       │   │   │   ├── MeasureView.tsx
│       │   │   │   └── NoteView.tsx
│       │   │   ├── Player/
│       │   │   │   └── PlayerBar.tsx
│       │   │   └── Layout/
│       │   │       └── AppLayout.tsx
│       │   ├── store/       # Zustand 状态
│       │   │   └── useStore.ts
│       │   ├── hooks/       # 自定义 Hooks
│       │   │   ├── useParser.ts
│       │   │   └── usePlayer.ts
│       │   ├── examples/    # 示例曲谱
│       │   │   └── index.ts
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── package.json             # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── Readme.md
```

---

## 五、关键技术决策

### 5.1 为什么选 SVG 而非 Canvas？

| 维度 | SVG | Canvas |
|------|-----|--------|
| 交互性 | ✅ 每个音符可独立绑定事件 | ❌ 需要手动 hit-test |
| 可访问性 | ✅ DOM 节点，支持 aria | ❌ 纯像素 |
| 缩放 | ✅ 矢量无损 | ⚠️ 需要 DPR 处理 |
| 性能 | ⚠️ 大量节点可能慢 | ✅ 固定消耗 |
| 选中高亮 | ✅ CSS class 切换 | ❌ 重绘 |

**结论**：简谱音符数量有限（一首歌通常 < 500 个），SVG 完全够用，且交互体验远优于 Canvas。

### 5.2 为什么用 Tone.js 而非原生 Web Audio？

- 原生 Web Audio 需要手动管理 OscillatorNode、GainNode、时间调度
- Tone.js 提供了 `Transport`（全局时间线）和 `Synth`（合成器），正好满足"按时间播放音符序列"的需求
- 包体积可接受（tree-shake 后约 100KB gzipped）

### 5.3 为什么 monorepo？

- 核心解析/渲染/播放逻辑作为独立库，未来可支持：
  - 其他 UI 框架（Vue 版）
  - Node.js 端渲染（生成 SVG 图片）
  - VS Code 插件
  - npm 包供第三方使用
- MVP 阶段目录分离即可，不需要过度工程化

---

## 六、性能策略

| 场景 | 策略 |
|------|------|
| 编辑时频繁重解析 | 防抖 300ms，仅变化时重新解析 |
| SVG 渲染更新 | React.memo + key 策略，仅变化的小节重渲染 |
| 播放时高亮更新 | 仅更新 `currentNoteIndex`，通过 CSS class 切换 |
| 音频调度 | Tone.js Transport 预调度，不在主线程计算 |
| 首屏加载 | Vite code-split，Tone.js 按需加载（首次播放时） |

---

## 七、开发阶段规划

### Phase 1：骨架搭建（Week 1）
- [x] 项目初始化（monorepo + Vite + React）
- [ ] 核心类型定义
- [ ] 基础 Parser（支持数字、小节线、延长线）
- [ ] 基础 SVG 渲染（纯数字 + 小节线）

### Phase 2：播放能力（Week 2）
- [ ] Tone.js 集成
- [ ] 播放/暂停/停止
- [ ] 音符高亮同步
- [ ] 速度调节

### Phase 3：编辑体验（Week 3）
- [ ] CodeMirror 集成 + 自定义语法高亮
- [ ] 实时预览
- [ ] 示例曲谱
- [ ] 错误提示

### Phase 4：打磨发布（Week 4）
- [ ] 响应式布局
- [ ] 移动端适配
- [ ] 性能优化
- [ ] 部署（Vercel / GitHub Pages）
