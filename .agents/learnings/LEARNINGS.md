# Learnings — 经验记录

> 记录 Agent 和用户在开发过程中产生的修正、知识盲区和最佳实践。
> 格式规范见 `.agents/skills/self-improvement/SKILL.md`。

---

<!-- 在此下方追加经验条目 -->

## [LRN-20261026-002] 双声部时间轴与音符后缀消费

**状态**: resolved

- 双声部必须按各自旋律独立生成调度，再合并拍数时间轴；小节区间入口的持续音状态按声部保存，不能共用最近发声音符。
- 音符索引按声部连续分配，只负责稳定定位；跨声部的播放先后与结束时刻由拍数决定。高亮需一次交付全部活动声部，避免同拍回调相互覆盖。
- 上下行共享起拍点间距和整体换行；分别运行单行布局无法保证纵向节奏对齐。同音声部分开音源，静音或释放时才能互不干扰。
- 无空格 Beam 中，前一音符已经消费的八度后缀不能再次计为后一音符前缀。移调输出低八度逗号时暴露了该问题；Parser 现在记录前缀扫描边界。
- 双声部保存和备份继续保留原始源码；旧谱不隐式迁移。每声部歌词顺序绑定，后续旋律块歌词语义仍需独立设计。

验证位置：core duet/synth 回归、Web slur-segments/store 回归；浏览器联谱循环、静音和多音符高亮检查。

## [LRN-20261026-001] 保存与音乐边界回归

**状态**: resolved

- 恢复草稿必须记录源码更新时间，并与主库版本比较；目录恢复后刷新不能让旧草稿回写覆盖新版本。
- 主库与恢复状态分别写入时，主库成功后立即绑定曲谱 ID，第二次写入失败后的重试才能避免重复建谱。
- 目录迁移保留的旧标题文件也必须按内容 ID 检查删除墓碑；同一旧版本的冲突副本应去重。
- 同音 Slur 的延续事件只有高亮而不发声；选段裁掉前面的起音后，需要在入口重新建立发声事件。
- 预热 N 拍需要等待 N 个完整拍长；不能在最后一次拍点刚触发时就结束倒计时。

验证位置：Web store/myScores 回归、core synth/scheduler-boundaries 回归。

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
