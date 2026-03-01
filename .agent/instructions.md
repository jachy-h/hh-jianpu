# hh-jianpu 项目指令 (Agent Instructions)

> 本文件是所有 AI Agent 的统一项目指令。
> 无论你是 GitHub Copilot、OpenCode、Qwen Code 还是 Claude Code，都应遵循此文件。

---

## 项目概述

**hh-jianpu** (Add Seven - Numbered Musical Notation) 是一个网页端动态简谱工具，包含：
- **核心库** (`@hh-jianpu/core`): 简谱解析、渲染、播放
- **Web 应用** (`@hh-jianpu/web`): React + Vite + Tailwind CSS

**技术栈**: TypeScript 5.4, React 18, Vite 5.4, Zustand 4.5, Tone.js 15.0.4

---

## Agent 协作协议

本项目使用多 Agent 协作架构，共享资源位于 `.agent/` 目录：

| 资源 | 位置 | 说明 |
|------|------|------|
| 项目指令 | `.agent/instructions.md` | 本文件（单一信源） |
| 技能库 | `.agent/skills/` | 所有 agent 共享的技能 |
| 任务队列 | `.agent/todos/current.md` | 持久化跨 agent 任务管理 |
| 经验库 | `.agent/learnings/` | 错误、经验、功能请求 |
| 架构文档 | `.agent/README.md` | 协作架构说明 |

### 每次会话开始时

1. 读取本文件获取项目规范
2. 检查 `.agent/todos/current.md` 是否有分配给你的任务
3. 如有待办任务，优先处理

### 每次会话结束前

1. 更新已完成任务的状态
2. 如有未完成任务，记录进度到任务 notes
3. 如遇到错误/经验，记录到 `.agent/learnings/`

---

## 构建/测试/开发命令

### Root 命令 (pnpm monorepo)
```bash
pnpm dev          # 启动 web 开发服务器
pnpm build        # 构建 core + web
pnpm build:core   # 仅构建 core
pnpm build:web    # 仅构建 web
pnpm lint         # Lint 所有包
pnpm test         # 运行所有测试
```

### Core 包命令
```bash
cd packages/core
pnpm test                            # 运行所有测试
pnpm test tokenizer.test.ts          # 运行单个测试文件
pnpm test src/__tests__/parser.test.ts
pnpm test -t "createLayout"          # 按名称匹配测试
pnpm test -- --run                   # 单次运行（非 watch）
```

### Web 包命令
```bash
cd apps/web
pnpm dev    # 启动开发服务器
pnpm build  # 生产构建
pnpm lint   # ESLint 检查
```

---

## 代码风格与约定

### TypeScript

- ✅ **严格模式**: 启用 `strict: true`
- ✅ **显式类型**: 优先使用 `interface` 而非 `type`，除非需要联合类型
- ✅ **命名规范**:
  - 接口: `PascalCase` (如 `Score`, `NoteElement`)
  - 类型别名: `PascalCase` (如 `ViewMode`, `PlaybackStatus`)
  - 函数: `camelCase` (如 `createLayout`, `parseNote`)
  - 常量: `UPPER_SNAKE_CASE` (如 `DEFAULT_LAYOUT_CONFIG`)
- ✅ **只读优先**: 对象属性默认使用 `readonly`
- ✅ **避免 any**: 使用 `unknown` 或具体类型

```typescript
// ✅ 推荐
interface Note {
  readonly pitch: number;
  readonly duration: number;
}

// ❌ 避免
type Note = {
  pitch: any;
  duration: any;
};
```

### React 组件

- ✅ **函数组件**: 使用箭头函数 + `React.FC`
- ✅ **Props 接口**: 每个组件定义清晰的 Props 接口
- ✅ **Hooks 顺序**: 遵循 React 规则（useState → useEffect → 自定义 hooks）
- ✅ **性能优化**: 适时使用 `React.memo`, `useMemo`, `useCallback`
- ✅ **事件处理**: 使用 `handle` 前缀 (如 `handleClick`, `handleChange`)

```typescript
// ✅ 推荐
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, className }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <textarea value={value} onChange={handleChange} className={className} />
  );
};
```

### 文件组织

- ✅ **单一职责**: 每个文件只导出一个主要功能
- ✅ **索引文件**: 使用 `index.ts` 聚合导出
- ✅ **相对路径**: 核心库使用 `.js` 扩展名以支持 ESM

```typescript
// packages/core/src/parser/index.ts
export { tokenize } from './tokenizer.js';
export { parse } from './parser.js';
export * from './types.js';
```

---

## 架构指南

### 核心库架构 (`@hh-jianpu/core`)

**三层解耦设计**:

1. **Parser 层**: 文本 → AST
   - `tokenizer.ts`: 词法分析（文本 → Token 流）
   - `parser.ts`: 语法分析（Token 流 → AST）
   - 返回 `ParseResult<Score>`，包含 `data` 和 `errors`

2. **Renderer 层**: AST → 布局信息
   - `layout.ts`: 计算 SVG 坐标、分行、分小节
   - 不直接渲染 DOM，只计算数据

3. **Player 层**: AST → 音频播放
   - `scheduler.ts`: 计算音符时间线
   - `synth.ts`: Tone.js 封装，音频合成

**关键约定**:
- Parser 不依赖 Renderer/Player
- Renderer 不依赖 Player
- 所有核心逻辑纯函数，无副作用

```typescript
// ✅ 推荐 - 纯函数
export function createLayout(score: Score, config?: Partial<LayoutConfig>): ScoreLayout {
  // 只计算，不修改输入
}

// ❌ 避免 - 副作用
export function createLayout(score: Score): void {
  document.getElementById('score').innerHTML = '...'; // ❌
}
```

### Web 应用架构 (`@hh-jianpu/web`)

**组件层级**:
```
App
├── AppLayout (顶部栏 + 主内容)
│   ├── HelpModal (帮助文档)
│   └── ResizablePanels (可拖动布局)
│       ├── Editor (简谱编辑器)
│       └── ScoreView (SVG 曲谱渲染)
│           ├── MeasureView (小节)
│           └── NoteView (音符)
└── PlayerBar (播放控制栏)
```

**状态管理 (Zustand)**:
- 单一 store: `useStore`
- 状态分类: 
  - 源码: `source`, `score`, `parseErrors`
  - 模式: `mode` (edit/play)
  - 播放: `playbackStatus`, `currentNoteIndex`, `tempo`
  - UI: `isLoading`
- 防抖: 编辑器输入使用 300ms debounce

```typescript
// ✅ 推荐 - 从 store 获取最小必要状态
const { score, currentNoteIndex } = useStore();

// ❌ 避免 - 获取整个 store
const store = useStore();
```

---

## 简谱解析规则

### 支持的语法

| 符号 | 含义 | 示例 | 实现位置 |
|------|------|------|----------|
| `1-7` | 音符 do-si | `1 3 5` | `tokenizer.ts` TOKEN.NOTE |
| `0` | 休止符 | `1 0 5` | `tokenizer.ts` TOKEN.REST |
| `-` | 延长线 | `1 - -` | `tokenizer.ts` TOKEN.TIE |
| `/` | 减时线 | `1/ 2/` | `tokenizer.ts` TOKEN.UNDERLINE |
| `'` | 高八度 | `1'` | `tokenizer.ts` TOKEN.OCTAVE_UP |
| `.` | 低八度 | `1.` | `tokenizer.ts` TOKEN.OCTAVE_DOWN |
| `#` | 升半音 | `#4` | `tokenizer.ts` TOKEN.SHARP |
| `b` | 降半音 | `b7` | `tokenizer.ts` TOKEN.FLAT |
| `\|` | 小节线 | `1 2 3 \| 4 5 6` | `tokenizer.ts` TOKEN.BARLINE |

### 解析优先级

1. **元信息** (标题、作曲、拍号、速度、调号)
2. **音符前缀** (#, b)
3. **音符主体** (1-7, 0)
4. **音符后缀** (', ., _)
5. **延长线** (-)

**注意事项**:
- `.` 在音符后是低八度，在其他位置忽略（避免与附点混淆）
- `/` 可连续使用 (1/ = 0.5拍, 1// = 0.25拍)
- `-` 每个延长 1 拍

---

## 测试约定

### 单元测试 (Vitest)

- ✅ **文件命名**: `*.test.ts` (与源文件同目录或 `__tests__/`)
- ✅ **测试结构**: Arrange → Act → Assert
- ✅ **描述清晰**: 使用完整句子描述测试意图

```typescript
// ✅ 推荐
describe('createLayout', () => {
  it('should calculate correct dimensions for a single measure', () => {
    const score: Score = { /* ... */ };
    const layout = createLayout(score);
    expect(layout.width).toBe(800);
    expect(layout.height).toBeGreaterThan(0);
  });
});

// ❌ 避免 - 模糊的描述
it('works', () => { /* ... */ });
```

### 覆盖目标

- Parser: 测试各种语法组合
- Renderer: 测试布局计算准确性
- Player: 测试时间调度和频率计算

---

## 性能优化

### 必须遵守

1. **防抖编辑器**: 300ms debounce
2. **懒加载 Tone.js**: 动态 import
3. **React.memo**: 大型列表组件
4. **useMemo**: 昂贵的计算（如 layout）
5. **useCallback**: 传递给子组件的函数

```typescript
const layout = useMemo(() => createLayout(score, config), [score, config]);
const handleChange = useCallback((value: string) => setSource(value), [setSource]);
```

---

## 样式规范

### Tailwind CSS

- ✅ **语义化类名**: 使用项目自定义颜色
  - `text-ink`: 主文本色
  - `text-played`: 次要文本色
  - `text-highlight`: 高亮色
  - `text-error`: 错误色
  - `border-barline`: 分隔线色
  - `bg-paper`: 背景色

- ✅ **响应式**: 移动优先，使用 `sm:` `md:` `lg:` 断点
- ✅ **避免内联样式**: 优先使用 Tailwind 类名

---

## 错误处理

### Parser 错误

- ✅ 返回 `ParseResult<T>` 结构
- ✅ 错误包含位置信息 (line, column)
- ✅ 继续解析，收集所有错误

```typescript
interface ParseError {
  message: string;
  position: { line: number; column?: number };
}

interface ParseResult<T> {
  data: T | null;
  errors: ParseError[];
}
```

### 音频错误

- ✅ 捕获 Tone.js 初始化失败
- ✅ 提供友好的错误提示
- ✅ 禁用播放按钮

---

## 文档规范

- ✅ **JSDoc**: 公共 API 必须有完整注释
- ✅ **中文注释**: 项目内部使用中文
- ✅ **分隔符**: 使用 `// ===` 分隔大段落

```typescript
/**
 * 计算曲谱布局
 *
 * @param score - 解析后的曲谱 AST
 * @param config - 布局配置（可选）
 * @returns 包含坐标信息的布局对象
 */
export function createLayout(score: Score, config?: Partial<LayoutConfig>): ScoreLayout {
  // 实现...
}
```

---

## 帮助文档更新

**每次大功能变更后**，需要检查简谱语法规则是否有变更：

- ✅ **检查范围**: Parser、Renderer、Player 的语法支持
- ✅ **如有变更**: 更新帮助文档（`/help` 页面）和 `docs/user-guide/notation-syntax.md`
- ✅ **示例**: 新增装饰音、新符号、播放控制等语法扩展

**触发场景**:
- 新增简谱符号（如连音线、装饰音记号）
- 修改解析规则（如延长线时长、减时线计算）
- 新增播放控制（如反复记号、速度变化）

---

## 提交规范

遵循 Conventional Commits:

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链

---

## 通用 UI 组件

### ButtonTip（带悬浮提示的按钮）

```tsx
<ButtonTip tipContent="播放音乐" onClick={handlePlay} variant="primary">播放</ButtonTip>
```

**主要 props**: `tipContent`(必填), `position`(默认 bottom), `variant`(primary/secondary/ghost/danger/nude), `size`(sm/md/lg)

### TextTip（悬浮提示文本）

```tsx
<TextTip tipContent="每 30 秒自动保存" color="text-green-600">已自动保存</TextTip>
```

---

## 禁止事项

❌ **绝对禁止**:
1. 使用 `any` 类型（除非确实需要）
2. 修改 Props（React 不可变原则）
3. 在循环中使用 Hooks
4. 内联定义大型对象/函数（影响性能）
5. 直接操作 DOM（使用 React ref）
6. 同步阻塞操作（如 alert）

---

## 项目特定规则

### 音频相关
- Tone.js 必须异步初始化
- 播放前检查 `Tone.context.state`
- 清理时调用 `Tone.Transport.stop()`

### 布局相关
- 响应式 `measuresPerLine`: 移动端 2，平板 3，桌面 4
- SVG 坐标从左上角开始
- 音符 Y 坐标居中对齐

### 状态管理
- 编辑器防抖 300ms
- 示例加载使用 `setSourceImmediate`（无防抖）
- 模式切换时停止播放

---

## 工作流触发

| 触发词 | 工作流 | 参考 |
|--------|--------|------|
| `bug:` | 验证 → 修复 → 回归 | `.agent/skills/bug-fix/SKILL.md` |
| `feedback:` | 理解 → 评估 → 实施 → 验证 | `.agent/skills/user-feedback/SKILL.md` |

---

**项目版本**: v0.1.1  
**最后更新**: 2026年3月1日  
**维护者**: Jachy
