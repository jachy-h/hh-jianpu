# Agent Collaboration Hub

> 跨 AI Agent 协作基础设施 — 让 GitHub Copilot、OpenCode、Qwen Code 等工具共享指令、技能和任务。

---

## 架构概览

```
.agent/                              ← 🔵 Hub（单一信源）
├── README.md                        ← 本文件
├── instructions.md                  ← 项目指令（所有 agent 共享）
├── skills/                          ← 技能库（所有 agent 共享）
│   ├── self-improvement/SKILL.md
│   ├── release/SKILL.md
│   ├── bug-fix/SKILL.md
│   └── user-feedback/SKILL.md
├── todos/                           ← 持久化任务队列（跨 agent 共享）
│   ├── PROTOCOL.md                  ← 任务协议规范
│   ├── current.md                   ← 当前活跃任务
│   └── archive/                     ← 已完成任务归档
└── learnings/                       ← 经验库（所有 agent 共享）
    ├── LEARNINGS.md
    ├── ERRORS.md
    └── FEATURE_REQUESTS.md

.github/                             ← 🟢 GitHub Copilot 适配器
├── copilot-instructions.md          → symlink → ../.agent/instructions.md
├── skills/                          → symlink → ../.agent/skills/
└── prompts/                         ← Copilot 专属 prompt 模板（保留）

.opencode/                           ← 🟡 OpenCode 适配器
└── skills/                          → symlink → ../.agent/skills/

AGENTS.md                            ← 🔴 通用适配器（Claude Code, Qwen 等）
                                       引用 .agent/instructions.md
```

---

## 核心设计原则

### 1. 单一信源 (Single Source of Truth)

所有 agent 共享的内容只在 `.agent/` 中维护一份。各 agent 工具通过 **symlink** 或 **引用** 访问：

| Agent 工具 | 指令来源 | 技能来源 | 任务来源 |
|------------|---------|---------|---------|
| GitHub Copilot | `.github/copilot-instructions.md` → symlink | `.github/skills/` → symlink | `.agent/todos/current.md` |
| OpenCode | `AGENTS.md` → 引用 | `.opencode/skills/` → symlink | `.agent/todos/current.md` |
| Qwen Code | `AGENTS.md` → 引用 | `.agent/skills/` 直接 | `.agent/todos/current.md` |
| Claude Code | `AGENTS.md` → 引用 | `.agent/skills/` 直接 | `.agent/todos/current.md` |

### 2. Hub-and-Spoke（中心辐射模型）

```
                    ┌─────────────────┐
                    │   .agent/ Hub   │
                    │  (instructions, │
                    │  skills, todos, │
                    │   learnings)    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
   │   .github/    │ │  .opencode/  │ │  AGENTS.md   │
   │  (Copilot)    │ │  (OpenCode)  │ │(Qwen/Claude) │
   │   symlinks    │ │   symlinks   │ │   引用       │
   └───────────────┘ └──────────────┘ └──────────────┘
```

### 3. 跨 Agent 任务委派

通过文件级 todo 协议实现 **Senior → Junior** 任务委派：

```
Senior Model (e.g. Claude Opus)          Junior Model (e.g. Qwen)
    │                                          │
    ├─ 创建任务 (status: not-started)          │
    ├─ 分解子任务                               │
    ├─ 设定验收标准                             │
    │                                          │
    │  ─── .agent/todos/current.md ────►       │
    │                                          ├─ 读取任务
    │                                          ├─ 标记 in-progress
    │                                          ├─ 执行实现
    │                                          ├─ 标记 completed
    │                                          │
    │       ◄── .agent/todos/current.md ───    │
    │                                          │
    ├─ 审查完成质量                             │
    ├─ 归档或打回                               │
```

---

## 快速使用

### 对于 Agent

任何 agent 在启动会话时应：
1. 读取 `.agent/instructions.md` 获取项目规范
2. 检查 `.agent/todos/current.md` 是否有待办任务
3. 工作完成后更新 todo 状态
4. 遇到错误/经验 记录到 `.agent/learnings/`

### 对于开发者

```bash
# 查看当前任务
cat .agent/todos/current.md

# 查看待处理经验
grep -rh "状态\*\*: pending" .agent/learnings/*.md | wc -l

# 添加新 agent 适配器（以 .cursor/ 为例）
ln -s ../.agent/skills .cursor/skills
```

### 添加新 Skill

在 `.agent/skills/` 下创建新目录和 `SKILL.md`，所有 agent 自动可用：

```bash
mkdir -p .agent/skills/my-new-skill
# 编辑 .agent/skills/my-new-skill/SKILL.md
```

---

## 维护者

- **创建时间**: 2026-03-01
- **维护者**: Jachy
