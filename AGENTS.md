# AGENTS.md - Agent Coding Guidelines for hh-jianpu

> **本项目使用多 Agent 协作架构。** 完整项目指令、技能和任务管理均在 `.agent/` 目录中。
> 
> 请在开始工作前阅读 **`.agent/instructions.md`** 获取完整规范。

---

## 快速参考

| 资源 | 位置 | 说明 |
|------|------|------|
| **完整项目指令** | `.agent/instructions.md` | 代码风格、架构、测试等所有规范 |
| **技能库** | `.agent/skills/` | bug-fix, user-feedback, release, self-improvement |
| **任务队列** | `.agent/todos/current.md` | 跨 Agent 持久化任务管理 |
| **任务协议** | `.agent/todos/PROTOCOL.md` | 任务格式、状态流转、协作规则 |
| **经验库** | `.agent/learnings/` | 错误、经验、功能请求记录 |
| **架构说明** | `.agent/README.md` | 协作架构总览 |

---

## 每次会话必读

1. **阅读指令**: `.agent/instructions.md`
2. **检查任务**: `.agent/todos/current.md` — 是否有分配给你的任务
3. **回顾经验**: `.agent/learnings/` — 是否有相关历史经验

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
| `bug:` | 验证→修复→回归 | `.agent/skills/bug-fix/SKILL.md` |
| `feedback:` | 理解→评估→实施→验证 | `.agent/skills/user-feedback/SKILL.md` |

---

> **以上是快速参考。详细规范请阅读 `.agent/instructions.md`。**
