# GitHub Copilot Instructions for hh-jianpu

## 项目概述

**hh-jianpu** (Add Seven - Numbered Musical Notation) 是一个网页端动态简谱工具，包含：
- **核心库** (`@hh-jianpu/core`): 简谱解析、渲染、播放
- **Web 应用** (`@hh-jianpu/web`): React + Vite + Tailwind CSS

**技术栈**: TypeScript 5.4, React 18, Vite 5.4, Zustand 4.5, Tone.js 15.0.4

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

```typescript
// ✅ 推荐 - 清晰的解析逻辑
const parseNote = (tokens: Token[], index: number): { note: Note, consumed: number } => {
  // 1. 解析前缀 (# b)
  // 2. 解析音高 (1-7)
  // 3. 解析后缀 (' . _)
  // 4. 返回 Note + 消耗的 token 数量
};
```

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
    // Arrange
    const score: Score = { /* ... */ };
    
    // Act
    const layout = createLayout(score);
    
    // Assert
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
// ✅ 推荐
const layout = useMemo(() => createLayout(score, config), [score, config]);

const handleChange = useCallback((value: string) => {
  setSource(value);
}, [setSource]);
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

```tsx
// ✅ 推荐
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
  播放
</button>

// ❌ 避免
<button style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}>
  播放
</button>
```

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

### 代码注释

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

### Markdown 文档

- ✅ **标题层级**: 使用 `#` `##` `###`
- ✅ **代码块**: 标注语言（```typescript, ```bash）
- ✅ **表格**: 对齐清晰
- ✅ **示例**: 提供完整可运行的示例

---

## 提交规范

### Commit Message

遵循 Conventional Commits:

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链

```bash
# ✅ 推荐
feat: add resizable panels to edit mode
fix: parser not handling rest tokens correctly
docs: update notation syntax guide

# ❌ 避免
update code
fix bug
```

---

## 常见模式

### 自定义 Hook

```typescript
// ✅ 推荐 - 可复用的逻辑
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

### 组件组合

```typescript
// ✅ 推荐 - 容器/展示组件分离
// Container
const EditorContainer: React.FC = () => {
  const { source, setSource } = useStore();
  return <Editor value={source} onChange={setSource} />;
};

// Presentation
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}
const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  // 纯展示逻辑
};
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

## Bug 修复工作流

当用户以 `bug:` 开头描述问题时，使用 `.github/prompts/bug-fix.prompt.md` 中定义的三步流程：
1. **验证** — 确认 bug 存在，定位根因
2. **修复** — 最小化改动，添加回归测试
3. **回归** — 运行测试，确认无副作用

---

---

## 用户反馈闭环

当用户以 `feedback:` 开头描述建议时，使用 `.github/prompts/user-feedback.prompt.md` 中定义的四步流程：
1. **理解** — 明确用户需求和痛点
2. **评估** — 评估可行性和优先级
3. **实施** — 设计并实现功能
4. **验证** — 收集用户反馈，持续改进

---

**项目版本**: v0.1.1  
**最后更新**: 2026年2月7日  
**维护者**: Jachy
