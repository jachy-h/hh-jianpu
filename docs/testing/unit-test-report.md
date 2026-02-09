# hh-jianpu 自动化测试报告

**测试日期**: 2026年2月7日  
**测试框架**: Vitest 2.1.9  
**测试类型**: 单元测试

---

## 测试统计

```
✓ Test Files  3 passed (3)
✓ Tests      19 passed (19)
  Duration   280ms
```

**通过率**: 100% ✅

---

## 测试用例详情

### 1. Parser 测试 (7/7 通过)

#### ✅ should parse basic metadata
- 验证元信息（标题、调号、拍号、速度）正确解析

#### ✅ should parse notes correctly
- 验证基础音符（1-7）正确解析
- 验证小节和音符数量正确

#### ✅ should parse high octave notes
- 验证高八度标记 `'` 正确识别
- 验证 octave 属性设置为 1

#### ✅ should parse low octave notes
- 验证低八度标记 `.` 正确识别
- 验证 octave 属性设置为 -1

#### ✅ should parse rests and ties
- 验证休止符 `0` 解析为 rest 类型
- 验证延长线 `-` 解析为 tie 类型

#### ✅ should parse underlines (eighth notes)
- 验证减时线 `_` 正确识别为八分音符
- 验证 duration.base 设置为 8

#### ✅ should parse multiple measures
- 验证多个小节正确分隔
- 验证小节编号连续递增

---

### 2. Renderer 测试 (4/4 通过)

#### ✅ should create layout with correct dimensions
- 验证布局宽度和高度正确计算

#### ✅ should distribute measures across lines
- 验证小节按 measuresPerLine 正确分行
- 验证每行包含正确数量的小节

#### ✅ should calculate note positions
- 验证所有音符位置正确计算
- 验证坐标值合理（x, y > 0）

#### ✅ should assign global note indices
- 验证音符全局索引连续递增
- 验证索引与播放高亮对应

---

### 3. Player 测试 (8/8 通过)

#### ✅ scheduleNotes: timing calculation
- 验证调度事件时间正确计算
- 验证 120 BPM 下每拍 0.5 秒

#### ✅ scheduleNotes: sequential indices
- 验证调度索引连续

#### ✅ scheduleNotes: rest frequency
- 验证休止符 frequency 为 null

#### ✅ scheduleNotes: cumulative start times
- 验证累计开始时间正确（0, 0.5, 1.0, 1.5...）

#### ✅ noteToFrequency: middle C
- 验证 C4 (do) 频率 = 261.63 Hz

#### ✅ noteToFrequency: high octave
- 验证 C5 (高音 do) 频率 = 523.25 Hz

#### ✅ noteToFrequency: low octave
- 验证 C3 (低音 do) 频率 = 130.81 Hz

#### ✅ noteToFrequency: key transposition
- 验证调号偏移正确（D 大调上移 2 个半音）

---

## 代码覆盖率

| 模块 | 覆盖率 |
|------|--------|
| Parser | ✅ 核心功能已覆盖 |
| Renderer | ✅ 核心功能已覆盖 |
| Player/Scheduler | ✅ 核心功能已覆盖 |
| Player/Synth | ⚠️ 未覆盖（Tone.js 依赖浏览器环境） |
| Types | ✅ 类型定义无需测试 |

---

## 测试环境

- Node.js: v18+
- Vitest: 2.1.9
- TypeScript: 5.4.0
- 测试环境: node (无 DOM)

---

## 结论

✅ **所有单元测试通过，核心功能验证成功**

- Parser 能正确解析简谱文本
- Renderer 能正确计算布局坐标
- Player 能正确调度音符事件和计算频率
- 无阻塞性 Bug

**建议**: 可以发布 v0.1.0
