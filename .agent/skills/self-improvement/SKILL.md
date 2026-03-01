---
name: self-improvement
description: "记录经验、错误和修正，持续改进 AI 辅助质量。触发条件：(1) 命令/操作意外失败 (2) 用户纠正 (3) 功能请求 (4) 外部工具失败 (5) 知识过时 (6) 发现更优方案"
compatibility: copilot,opencode,qwen,claude
metadata:
  audience: all-agents
---

# Self-Improvement Skill（通用版）

将经验、错误和修正记录到 `.agent/learnings/` 中，持续改进 AI 辅助质量。
重要经验最终晋升到 `.agent/instructions.md`，使每次对话都能从历史中学习。

---

## 快速参考

| 场景 | 操作 |
|------|------|
| 命令/工具执行失败 | 记录到 `.agent/learnings/ERRORS.md` |
| 用户纠正 Agent | 记录到 `.agent/learnings/LEARNINGS.md`，分类 `correction` |
| 用户想要新功能 | 记录到 `.agent/learnings/FEATURE_REQUESTS.md` |
| 外部 API/工具失败 | 记录到 `.agent/learnings/ERRORS.md`，附集成细节 |
| 知识过时/不准确 | 记录到 `.agent/learnings/LEARNINGS.md`，分类 `knowledge_gap` |
| 发现更好的方案 | 记录到 `.agent/learnings/LEARNINGS.md`，分类 `best_practice` |
| 广泛适用的经验 | 晋升到 `.agent/instructions.md` |

---

## 记录格式

### LEARNINGS.md — 经验条目

```markdown
## [LRN-YYYYMMDD-XXX] 分类

**记录时间**: ISO-8601 时间戳
**记录者**: copilot | opencode | qwen | human
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

---
```

**分类值**: `correction` | `knowledge_gap` | `best_practice` | `convention`

### ERRORS.md — 错误条目

```markdown
## [ERR-YYYYMMDD-XXX] 技能或命令名称

**记录时间**: ISO-8601 时间戳
**记录者**: copilot | opencode | qwen | human
**优先级**: high
**状态**: pending

### 摘要
简述失败内容

### 错误信息
\`\`\`
实际错误输出
\`\`\`

### 上下文
- 尝试执行的命令/操作
- 使用的输入或参数

### 建议修复
可能的解决方法

---
```

### FEATURE_REQUESTS.md — 功能请求

```markdown
## [FEAT-YYYYMMDD-XXX] 能力名称

**记录时间**: ISO-8601 时间戳
**记录者**: copilot | opencode | qwen | human
**优先级**: medium
**状态**: pending

### 请求能力
用户想做什么

### 用户背景
为何需要

### 复杂度估计
simple | medium | complex

### 实现建议
如何构建

---
```

---

## ID 规则

格式：`TYPE-YYYYMMDD-XXX`
- TYPE：`LRN`（经验）、`ERR`（错误）、`FEAT`（功能）
- YYYYMMDD：当前日期
- XXX：三位顺序编号

示例：`LRN-20260301-001`、`ERR-20260301-002`

---

## 晋升到项目永久记忆

当一条经验**广泛适用**时，将其晋升到 `.agent/instructions.md`：

1. 将经验提炼为简洁规则
2. 追加到 `.agent/instructions.md` 的对应章节
3. 更新原始条目状态为 `promoted`

---

## 触发时机

遇到以下情况**立即记录**：

- **纠正类** → 分类 `correction`："不对，应该是……" / "你理解有误……"
- **功能请求** → `FEATURE_REQUESTS.md`："能不能也支持……" / "有没有办法……"
- **知识盲区** → 分类 `knowledge_gap`：用户提供了 Agent 不知道的信息
- **错误类** → `ERRORS.md`：命令返回非零退出码 / 出现异常

---

## 定期回顾

在以下时机回顾 `.agent/learnings/`：

- 开始新的重要任务前
- 完成一个功能后
- 在有历史经验的模块工作时

```bash
grep -rh "状态\*\*: pending" .agent/learnings/*.md | wc -l
```
