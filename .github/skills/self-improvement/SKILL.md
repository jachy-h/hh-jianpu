---
name: self-improvement
description: "Captures learnings, errors, and corrections to enable continuous improvement. Use when: (1) A command or operation fails unexpectedly, (2) User corrects Copilot ('No, that's wrong...', 'Actually...'), (3) User requests a capability that doesn't exist, (4) An external API or tool fails, (5) Copilot realizes its knowledge is outdated or incorrect, (6) A better approach is discovered for a recurring task. Also review learnings before major tasks."
metadata:
---

# Self-Improvement Skill（GitHub Copilot 版）

将经验、错误和修正记录到 Markdown 文件中，持续改进 AI 辅助质量。重要经验最终晋升到 `.github/copilot-instructions.md`，使每次对话都能从历史中学习。

---

## 快速参考

| 场景 | 操作 |
|------|------|
| 命令/工具执行失败 | 记录到 `.learnings/ERRORS.md` |
| 用户纠正 Copilot | 记录到 `.learnings/LEARNINGS.md`，分类 `correction` |
| 用户想要新功能 | 记录到 `.learnings/FEATURE_REQUESTS.md` |
| 外部 API/工具失败 | 记录到 `.learnings/ERRORS.md`，附集成细节 |
| 知识过时/不准确 | 记录到 `.learnings/LEARNINGS.md`，分类 `knowledge_gap` |
| 发现更好的方案 | 记录到 `.learnings/LEARNINGS.md`，分类 `best_practice` |
| 与已有条目相似 | 用 `**See Also**` 关联，考虑提升优先级 |
| 广泛适用的经验 | 晋升到 `.github/copilot-instructions.md` |

---

## 项目目录结构

在项目根目录下创建：

```
.learnings/
├── LEARNINGS.md      # 纠正、知识盲区、最佳实践
├── ERRORS.md         # 命令失败、异常报错
└── FEATURE_REQUESTS.md  # 用户希望增加的能力
```

```bash
mkdir -p .learnings
```

---

## 记录格式

### LEARNINGS.md — 经验条目

```markdown
## [LRN-YYYYMMDD-XXX] 分类

**记录时间**: ISO-8601 时间戳
**优先级**: low | medium | high | critical
**状态**: pending
**领域**: frontend | backend | infra | tests | docs | config

### 摘要
一句话描述本次经验

### 详情
完整上下文：发生了什么、哪里有误、正确做法是什么

### 建议操作
具体的修复或改进措施

### 元数据
- 来源: conversation | error | user_feedback
- 关联文件: path/to/file.ts
- 标签: tag1, tag2
- 另见: LRN-20250110-001（如有关联条目）

---
```

**分类值**: `correction` | `knowledge_gap` | `best_practice` | `convention`

---

### ERRORS.md — 错误条目

```markdown
## [ERR-YYYYMMDD-XXX] 技能或命令名称

**记录时间**: ISO-8601 时间戳
**优先级**: high
**状态**: pending
**领域**: frontend | backend | infra | tests | docs | config

### 摘要
简述失败内容

### 错误信息
```
实际错误输出
```

### 上下文
- 尝试执行的命令/操作
- 使用的输入或参数
- 相关环境信息

### 建议修复
如果可以定位，描述可能的解决方法

### 元数据
- 可复现: yes | no | unknown
- 关联文件: path/to/file.ts
- 另见: ERR-20250110-001（如为重复问题）

---
```

---

### FEATURE_REQUESTS.md — 功能请求条目

```markdown
## [FEAT-YYYYMMDD-XXX] 能力名称

**记录时间**: ISO-8601 时间戳
**优先级**: medium
**状态**: pending
**领域**: frontend | backend | infra | tests | docs | config

### 请求能力
用户想做什么

### 用户背景
为何需要，解决什么问题

### 复杂度估计
simple | medium | complex

### 实现建议
如何构建，可扩展哪些现有功能

### 元数据
- 频次: first_time | recurring
- 关联功能: 现有功能名称

---
```

---

## ID 规则

格式：`TYPE-YYYYMMDD-XXX`
- TYPE：`LRN`（经验）、`ERR`（错误）、`FEAT`（功能）
- YYYYMMDD：当前日期
- XXX：顺序编号或 3 位随机字符

示例：`LRN-20260228-001`、`ERR-20260228-A3F`

---

## 晋升到项目永久记忆

当一条经验**广泛适用**（不只是一次性修复）时，将其晋升到 `.github/copilot-instructions.md`。

### 何时晋升

- 经验适用于多个文件/功能
- 任何贡献者（人或 AI）都应了解
- 能防止反复犯同类错误
- 记录了项目特有的约定

### 晋升步骤

1. 将经验提炼为简洁规则或事实
2. 追加到 `.github/copilot-instructions.md` 的对应章节（不存在则创建）
3. 更新原始条目：
   - `**状态**: pending` → `**状态**: promoted`
   - 添加 `**已晋升至**: .github/copilot-instructions.md`

### 晋升示例

**原始经验**（详细）：
> 项目使用 pnpm workspaces。尝试 `npm install` 失败。
> lock 文件是 `pnpm-lock.yaml`，必须使用 `pnpm install`。

**晋升到 `.github/copilot-instructions.md`**（简洁）：
```markdown
## 构建与依赖
- 包管理器：pnpm（非 npm）—— 使用 `pnpm install`
```

---

## 解决条目

问题已修复后，更新条目：

1. `**状态**: pending` → `**状态**: resolved`
2. 在元数据后追加：

```markdown
### 解决方案
- **解决时间**: 2026-02-28T10:00:00Z
- **提交/PR**: abc123 或 #42
- **说明**: 简述做了什么
```

其他状态值：
- `in_progress` — 正在处理
- `wont_fix` — 决定不处理（在解决方案中注明原因）
- `promoted` — 已晋升到 `.github/copilot-instructions.md`

---

## 触发时机

遇到以下情况**立即记录**：

**纠正类** → 分类 `correction`：
- "不对，应该是……"
- "你理解有误……"
- "这个做法已经过时了……"

**功能请求类** → `FEATURE_REQUESTS.md`：
- "能不能也支持……"
- "有没有办法……"
- "为什么不能……"

**知识盲区类** → 分类 `knowledge_gap`：
- 用户提供了 Copilot 不知道的信息
- 引用的文档已过时
- API 行为与预期不符

**错误类** → `ERRORS.md`：
- 命令返回非零退出码
- 出现异常或堆栈跟踪
- 意外的输出或行为

---

## 定期回顾

在以下时机回顾 `.learnings/`：

- 开始新的重要任务前
- 完成一个功能后
- 在有历史经验的模块工作时

```bash
# 统计待处理条目数量
grep -rh "状态\*\*: pending" .learnings/*.md | wc -l

# 列出高优先级待处理条目
grep -B5 "优先级\*\*: high" .learnings/*.md | grep "^## \["
```

---

## 优先级指南

| 优先级 | 使用场景 |
|--------|----------|
| `critical` | 阻塞核心功能、数据丢失风险、安全问题 |
| `high` | 影响重大，影响常见工作流，反复出现 |
| `medium` | 中等影响，有变通方法 |
| `low` | 轻微不便，边缘场景 |

---

## 最佳实践

1. **立即记录** —— 刚发生时上下文最清晰
2. **具体表述** —— 未来的 AI 需要快速理解
3. **关联文件** —— 方便定位修复位置
4. **给出具体建议** —— 不只是「待调查」
5. **积极晋升** —— 有价值的经验尽快到 `.github/copilot-instructions.md`
6. **定期回顾** —— 过时的经验价值大打折扣