# Todo Protocol — 跨 Agent 任务管理协议

> 定义在 `.agent/todos/` 中使用的文件格式、状态流转和协作规则。

---

## 设计目标

1. **持久化**: 任务保存在文件中，跨会话持续存在
2. **跨 Agent**: 任何 agent 都能读写，实现任务委派
3. **可追溯**: 记录创建者、执行者、时间线
4. **层级委派**: 高级模型规划，低级模型执行

---

## 角色定义

| 角色 | 说明 | 典型 Agent |
|------|------|-----------|
| **Planner** | 规划任务、分解子任务、设定验收标准 | Claude Opus, GPT-4o |
| **Executor** | 执行具体编码任务 | Qwen Code, Copilot, OpenCode |
| **Reviewer** | 审查完成质量、验收或打回 | Claude Opus, Human |
| **Human** | 最终决策者，可担任任何角色 | 用户本人 |

---

## 文件结构

```
.agent/todos/
├── PROTOCOL.md          ← 本文件（协议规范）
├── current.md           ← 当前活跃任务
└── archive/             ← 已完成任务归档
    ├── 2026-02.md
    └── 2026-03.md
```

---

## 任务格式

每个任务是一个 Markdown 二级标题块：

```markdown
## [TODO-XXX] 任务标题

- **status**: not-started
- **priority**: high
- **assignee**: unassigned
- **created_by**: copilot
- **created_at**: 2026-03-01T10:00:00Z
- **updated_at**: 2026-03-01T10:00:00Z

### Context
为什么需要这个任务，背景信息

### Subtasks
- [ ] 子任务 1
- [ ] 子任务 2
- [ ] 子任务 3

### Acceptance Criteria
- 条件 1
- 条件 2

### Notes
执行过程中的备注，每次更新追加时间戳：
- [2026-03-01T14:00:00Z] @qwen: 已完成子任务 1，发现需要额外处理 X
```

---

## 字段说明

### status（状态）

```
not-started → in-progress → review → completed
                  ↓                      ↓
               blocked               archived
                  ↓
            not-started (解除阻塞后)
```

| 状态 | 含义 | 谁设置 |
|------|------|--------|
| `not-started` | 待认领 | Planner |
| `in-progress` | 执行中 | Executor（认领时设置） |
| `blocked` | 被阻塞（记录原因） | Executor |
| `review` | 待审查 | Executor（完成时设置） |
| `completed` | 已验收通过 | Reviewer |
| `archived` | 已归档到 archive/ | 任何人 |

### priority（优先级）

| 优先级 | 含义 |
|--------|------|
| `critical` | 阻塞其他任务，立即处理 |
| `high` | 当前迭代必须完成 |
| `medium` | 应该完成，可协商 |
| `low` | 有空再做 |

### assignee（执行者）

| 值 | 含义 |
|----|------|
| `unassigned` | 任何 agent 可认领 |
| `human` | 需要用户手动处理 |
| `copilot` | 指定 GitHub Copilot |
| `qwen` | 指定 Qwen Code |
| `opencode` | 指定 OpenCode |
| `any-agent` | 任何 agent 均可，但需要 agent 处理 |

### created_by（创建者）

记录谁创建了这个任务：`human`、`copilot`、`qwen`、`opencode`

---

## 操作规范

### Planner 创建任务

1. 在 `current.md` 底部追加新任务块
2. ID 递增：查看最后一个 `TODO-XXX`，加 1
3. 必须填写 Context、Subtasks、Acceptance Criteria
4. 设置合理的 priority 和 assignee

### Executor 认领任务

1. 找到 `status: not-started` 且 `assignee` 匹配的任务
2. 将 `status` 改为 `in-progress`
3. 更新 `updated_at` 时间
4. 在 Notes 中记录开始信息

### Executor 完成任务

1. 勾选所有 Subtasks 的 checkbox
2. 将 `status` 改为 `review`
3. 更新 `updated_at`
4. 在 Notes 中记录完成摘要

### Reviewer 审查任务

1. 对照 Acceptance Criteria 检查
2. 通过 → `status: completed`
3. 打回 → `status: not-started`，在 Notes 中说明原因

### 归档

月底或迭代结束时，将所有 `completed` 任务移到 `archive/YYYY-MM.md`。

---

## ID 规则

格式：`TODO-XXX`，三位数字递增。

- `TODO-001`, `TODO-002`, ..., `TODO-999`
- 如果归档了旧任务，ID 不回收，继续递增
- 跨月不重置

---

## 并发控制

由于多个 agent 可能同时操作 `current.md`，遵循以下规则：

1. **一次只认领一个任务**: 每个 agent 同时最多有 1 个 `in-progress` 任务
2. **先读后写**: 修改前先读取最新内容，避免覆盖他人更新
3. **追加优先**: 新增任务追加到文件末尾，减少冲突
4. **最小化修改**: 只改动自己任务的字段，不动其他任务

---

## 示例工作流

### Senior 规划 + Junior 执行

```
1. Human: "实现歌词显示功能"
2. Senior (Claude Opus):
   - 阅读架构文档
   - 创建 TODO-010: 歌词 Parser 扩展 (assignee: any-agent)
   - 创建 TODO-011: 歌词 Layout 计算 (assignee: any-agent, 依赖 TODO-010)
   - 创建 TODO-012: 歌词 React 组件 (assignee: any-agent, 依赖 TODO-011)

3. Junior (Qwen Code):
   - 读取 current.md，发现 TODO-010
   - 认领 TODO-010，标记 in-progress
   - 实现代码，编写测试
   - 标记 review

4. Senior (Claude Opus):
   - 审查 TODO-010，通过 → completed
   - Junior 可以继续 TODO-011
```

---

## 与 Agent 内置 Todo 的关系

| 特性 | Agent 内置 Todo | 本协议 |
|------|-----------------|--------|
| 持久化 | ❌ 会话结束丢失 | ✅ 文件持久 |
| 跨 Agent | ❌ 各自独立 | ✅ 共享 |
| 粒度 | 细（当前会话的步骤） | 粗（跨会话的功能/任务） |
| 使用场景 | 会话内的工作步骤 | 跨会话的项目任务 |

**建议**: 在会话内使用 agent 内置 todo 管理实现细节，同时更新 `.agent/todos/current.md` 中的宏观任务状态。
