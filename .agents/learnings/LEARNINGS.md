# Learnings — 经验记录

> 记录 Agent 和用户在开发过程中产生的修正、知识盲区和最佳实践。
> 格式规范见 `.agents/skills/self-improvement/SKILL.md`。

---

<!-- 在此下方追加经验条目 -->

## [LRN-20261028-005] 多段歌词与旧源码兼容

**状态**: resolved

- 旧语法的多条 `C` 行会合并为同一歌词序列，不能直接解释为多个段落。新增 `C2`–`C99` 表达独立歌词段，`C1` 等价于 `C`，声部标记放在段号之后，如 `C2[upper]`。
- 序列化每段歌词时，仅为内部无词音符补占位，不在最后一个有词音符之后补占位，避免往返解析将原本无歌词的小节改为占位歌词。
- 多段歌词布局需同时考虑最长分组的横向空间、每行高度、末行 SVG 高度和双声部之间的间隔。

验证位置：core multiline-lyrics / duet / notation-examples 回归；浏览器三段歌词与编辑区折叠展开验收。

## [LRN-20261028-004] 滚动方向与同一元素的连续过渡

**状态**: resolved

- 用户把触控板手指向上、帮助 01 → 06 的浏览方向定义为“向上滚动”，对应内容滚动容器 scrollTop 增大。不能直接按相反的视觉方向解释。
- 帮助键盘先贴顶，再随继续滚动右移；必须对同一个 DOM 元素做连续 translate 与等比例 scale，不能复制侧边键盘或改为方向触发的显示切换。
- 右侧宽度来自正文右边界到视口边缘的实际空白；正文宽度保持不变。移动端不横移，也不添加折叠浮动按钮。
- 验证要分别检查贴顶、过渡中、完全右移和回滚恢复，并确认页面始终只有一块键盘，移动端缩放比例保持为 1。

## [LRN-20261028-003] 居中播放栏的加载提示不能改变布局宽度

**状态**: resolved

- 钢琴加载时临时插入独立文字 flex 子项，令整组居中控件横移约 40px，完成后再移回，表现为播放栏闪动。
- 加载状态放进固定 40×40 的播放按钮内，与播放/暂停图标共用 20×20 区域；文字提示使用 sr-only 状态，不占据布局空间。
- 浏览器使用真实 PlayerBar 在 390/980/1280px iframe 内比较就绪、加载、完成三个状态，栏高和音色控件坐标均保持一致。

## [LRN-20261028-002] 音色替换必须满足同一拍点契约与持续音验收

**状态**: resolved

- 用户指出钢琴仍偏小、延长音不可闻；原先只检查短旋律 RMS，且使用一次性衰减采样，没有满足持续音要求。不能用“时值合并正确”代替实际音频验证。
- Instrument 契约改为独立 noteOn/noteOff 和发声 ID；Player 按 Transport 拍点安排结束，音源不预先把整段时值换算为秒。新增音色只实现适配器和资源，音乐调度共用。
- 教学钢琴须制作可循环持续段，分别校准各音区，再与原音色共用输出；仅统一加增益或只给钢琴限幅不能解决跨音区及长音的响度问题。
- Tone Transport 在 loopEnd tick 先回绕，边界释放要监听 loopEnd，避免尾音跨轮常驻。每轮使用新发声 ID。
- 离线时钟先完成事件调度再实际渲染，合成音 onsilence 中不能提前断开历史节点；音源要显式继承输出 context，离线完成后统一销毁。
- 验收须覆盖一拍/四拍可闻差异、长音中途变速、循环、暂停恢复、双声部静音和各音区，并用完整音频 LUFS 与实际试听补充 RMS。

验证位置：scripts/prepare-piano-samples.py、Web piano-samples 回归、core instruments/synth/scheduler-boundaries、开发页 tests/audio-validation.html。

## [LRN-20261028-001] 采样音源的未来释放与真实音频验收

**状态**: resolved

- Tone.js 15.1.22 的 Sampler 在 triggerRelease 安排未来停止后会立即清空该 MIDI 音高的活动 source 列表，因此 triggerAttackRelease 后的 releaseAll 不能可靠提前终止长音。
- 网页采样音源改用共享 ToneAudioBuffers + 独立 ToneBufferSource，保留每个 source 到真正结束；停止/静音将释放时间提前，避免同音重奏和双声部互相干扰。
- 时长转换及停止时钟使用音源自己的 context（Gain.toSeconds / Gain.now）。Tone.Offline 开始渲染后会恢复全局 context，回调里读取全局 Tone.now 会取到错误的时钟，导致离线验收错误地提前切音。
- 用真实浏览器 OfflineAudioContext 渲染验证发声和提前静音，再配合加载竞态、重试及声部路由单元测试，不能仅根据 mock 成功判定音频可用。

验证位置：core instruments/synth、Web store、docs/playback-instruments.md。

- 钢琴采样默认 -6 dB 与原三角波的同旋律 RMS 相差约 14 dB；音色增益应通过真实渲染校准，不能假定相同增益就有相同响度。Tone.Limiter 采用压缩器，短促峰值仍可能超过阈值；需要峰值约束时，应实际检查双声部叠加结果。

## [LRN-20261027-001] 换气符归属与源码分行

**状态**: resolved

- `|v` 或 `:|| v` 的线后换气归属上一小节，不能消耗 Parser 等待下一小节起点的状态；否则下一行首小节会沿用上一行行号，换行延后一小节。
- 默认预览按源码边界分行，只在内容实际宽度不足时追加拆行；小节最小宽度应由音符、歌词和字号计算，不能再用容器宽度除以固定小节数作为下限。单、双声部使用相同策略。
- 显式传入 `measuresPerLine` 的调用继续保留小节数上限；Web 不自动传入响应式 2/3/4 上限。

验证位置：core breath-barline/responsive-layout、Web score-library 的《练习(2)》实际资源回归；浏览器宽屏 5＋6 分行及手机预览验收。

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
