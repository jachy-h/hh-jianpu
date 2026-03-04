# Learnings — 经验记录

> 记录 Agent 和用户在开发过程中产生的修正、知识盲区和最佳实践。
> 格式规范见 `.agent/skills/self-improvement/SKILL.md`。

---

<!-- 在此下方追加经验条目 -->

## [LRN-20260304-001] correction

**记录时间**: 2026-03-04T22:25:00+08:00  
**记录者**: copilot  
**优先级**: high  
**状态**: resolved  
**领域**: backend

### 摘要
`scoreToSource` 实现时忽略了 `hasSpaceBefore` 字段，导致移调后所有音符间距统一加空格，破坏连音线分组。

### 详情
**背景**：简谱中"两个八分音符之间无空格"表示它们的减时线要连在一起（beam group）。这个信息在 Parser 解析时存储于每个 `NoteElement` 的 `hasSpaceBefore` 字段。

**错误**：`scoreToSource`（AST → 源码）实现时，对每个音符 token 固定追加尾部空格（`formatNote(note) + ' '`），完全忽略了 `hasSpaceBefore` 字段，导致：
- 原本 `3/6,/`（无空格，连音线相连）→ 移调后变成 `5/ 1,/`（有空格，连音线断开）

**规则已在文档中记录**：`docs/user-guide/notation-syntax.md` § 12 (`### 12. 连音线（Beam）`) 明确说明：
> 无空格的相邻八分音符会自动用横线连接

**正确做法**：序列化时读取每个元素的 `hasSpaceBefore` 字段：
```typescript
const needSpace = (note as { hasSpaceBefore?: boolean }).hasSpaceBefore !== false;
measureStr += (needSpace ? ' ' : '') + token;
```

### 建议操作
- ✅ 已修复 `packages/core/src/parser/transpose.ts` 中 `scoreToSource` 的间距逻辑
- 📌 凡是 AST → 源码的序列化函数（roundtrip），都必须保留 `hasSpaceBefore` 信息

### 元数据
- 来源: user_feedback
- 关联文件: packages/core/src/parser/transpose.ts, packages/core/src/types/index.ts
- 标签: scoreToSource, hasSpaceBefore, beam, 连音线, 移调, roundtrip

---
