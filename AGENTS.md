# AGENTS.md - Agent Coding Guidelines for hh-jianpu

> **本项目使用多 Agent 协作架构。** 完整项目指令、技能和任务管理均在 `.agents/` 目录中。
> 
> 请在开始工作前阅读 **`.agents/instructions.md`** 获取完整规范。

---

## 快速参考

| 资源 | 位置 | 说明 |
|------|------|------|
| **完整项目指令** | `.agents/instructions.md` | 代码风格、架构、测试等所有规范 |
| **技能库** | `.agents/skills/` | bug-fix, user-feedback, release, clear-todo |
| **待办清单** | `TODO.md` | 随手记任务，说"清空 todo"时执行 |
| **经验库** | `.agents/learnings/` | 错误、经验、功能请求记录 |
| **架构说明** | `.agents/README.md` | 协作架构总览 |
| **AI 转写 Prompt** | `apps/web/public/prompts/hh-jianpu-transcribe.md` | 顶栏「复制 Prompt（BETA）」读取 |

---

## 每次会话必读

1. **阅读指令**: `.agents/instructions.md`
2. **检查待办**: `TODO.md` — 是否有待办事项
3. **回顾经验**: `.agents/learnings/` — 是否有相关历史经验

---

## 基础信息（快速上下文）

**hh-jianpu** — 网页端动态简谱工具

- **Core** (`@hh-jianpu/core`): 解析、渲染、播放
- **Web** (`@hh-jianpu/web`): React + Vite + Tailwind CSS
- **Tech**: TypeScript 5.4, React 18, Vite 5.4, Zustand 4.5, Tone.js 15.0.4

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建
pnpm test         # 运行测试
pnpm lint         # Lint 检查
```

### 核心架构（三层解耦）

1. **Parser**: 文本 → AST (`tokenizer.ts`, `parser.ts`)
2. **Renderer**: AST → Layout (`layout.ts`) — 纯数据计算
3. **Player**: AST → 音频 (`scheduler.ts`, `synth.ts`)

**规则**: Parser 不依赖 Renderer/Player，Renderer 不依赖 Player，全部纯函数。

### 代码风格要点

- TypeScript `strict: true`，禁止 `any`
- 接口用 `interface`，命名 `PascalCase`
- 函数 `camelCase`，常量 `UPPER_SNAKE_CASE`
- React: 箭头函数 + `React.FC`，`handle` 前缀事件处理
- Commit: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

### 工作流

| 触发词 | Skill | 位置 |
|--------|-------|------|
| `bug:` | 验证→修复→回归 | `.agents/skills/bug-fix/SKILL.md` |
| `feedback:` | 理解→评估→实施→验证 | `.agents/skills/user-feedback/SKILL.md` |
| `清空todo`/`clear todo` | 分类→逐个完成 | `.agents/skills/clear-todo/SKILL.md` |

---

## Prompt 同步

- AI 识谱 Prompt 位于 `apps/web/public/prompts/hh-jianpu-transcribe.md`，由全局顶栏「复制 Prompt（BETA）」按钮读取。
- **每次功能修改后**都要检查该 Prompt 是否仍与当前规则一致，尤其是解析器语法、元信息字段、歌词与双声部规则、支持/不支持的记号。
- 同步参考 `packages/core/src/parser/`、`docs/user-guide/notation-syntax.md` 与 core 回归测试；只改界面或样式时也顺手核对一次。
- Prompt 中的完整示例必须能通过 `parse(source)` 且无诊断信息。

---

## Avoid

- 不要主动提交commit, 只有在用户要求时才会提交


> **以上是快速参考。详细规范请阅读 `.agents/instructions.md`。**
