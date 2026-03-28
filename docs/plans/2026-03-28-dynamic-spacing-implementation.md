# 动态间距计算实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现动态间距计算系统，避免简谱渲染中的符号重叠问题，特别是八度点与相邻音符的重叠。

**Architecture:** 基于符号宽度的静态预计算，使用二维边界框系统同时关注横向和纵向重叠问题。集成到现有的layout.ts中，替换固定间距算法。

**Tech Stack:** TypeScript, 现有的布局系统，字体大小比例计算，边界框算法。

---

## 任务分解

### 任务 1: 创建符号宽度计算器

**文件:**
- 创建: `packages/core/src/renderer/symbol-width.ts`
- 测试: `packages/core/src/__tests__/symbol-width.test.ts`

**步骤 1: 编写失败测试**

```typescript
// symbol-width.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSymbolWidth, SymbolType } from '../symbol-width.js';

describe('SymbolWidthCalculator', () => {
  it('should calculate width for note digit based on font size', () => {
    const width = calculateSymbolWidth('noteDigit', 18);
    expect(width).toBe(18); // 100% of font size
  });

  it('should calculate width for octave dot based on font size', () => {
    const width = calculateSymbolWidth('octaveDot', 18);
    expect(width).toBe(5.4); // 30% of font size
  });

  it('should calculate width for beam line based on font size', () => {
    const width = calculateSymbolWidth('beamLine', 18);
    expect(width).toBe(21.6); // 120% of font size
  });

  it('should handle grace note with smaller size', () => {
    const width = calculateSymbolWidth('graceNote', 18);
    expect(width).toBe(14.4); // 80% of font size
  });

  it('should throw error for unknown symbol type', () => {
    expect(() => calculateSymbolWidth('unknown' as SymbolType, 18)).toThrow();
  });
});
```

**步骤 2: 运行测试确保失败**

运行: `pnpm test packages/core/src/__tests__/symbol-width.test.ts`
预期: FAIL with "Cannot find module '../symbol-width.js'"

**步骤 3: 编写最小实现**

```typescript
// symbol-width.ts
export type SymbolType = 'noteDigit' | 'octaveDot' | 'beamLine' | 'trillSymbol' | 'graceNote' | 'dot';

const SYMBOL_WIDTH_RATIOS: Record<SymbolType, number> = {
  noteDigit: 1.0,      // 100%
  octaveDot: 0.3,      // 30%
  beamLine: 1.2,       // 120%
  trillSymbol: 1.5,    // 150%
  graceNote: 0.8,      // 80%
  dot: 0.3,            // 30%
};

export function calculateSymbolWidth(symbolType: SymbolType, fontSize: number): number {
  const ratio = SYMBOL_WIDTH_RATIOS[symbolType];
  if (ratio === undefined) {
    throw new Error(`Unknown symbol type: ${symbolType}`);
  }
  return fontSize * ratio;
}

export function getSymbolRatio(symbolType: SymbolType): number {
  return SYMBOL_WIDTH_RATIOS[symbolType];
}
```

**步骤 4: 运行测试确保通过**

运行: `pnpm test packages/core/src/__tests__/symbol-width.test.ts`
预期: PASS

**步骤 5: 提交**

```bash
git add packages/core/src/renderer/symbol-width.ts packages/core/src/__tests__/symbol-width.test.ts
git commit -m "feat: add symbol width calculator with font-size ratios"
```

### 任务 2: 创建边界框计算器

**文件:**
- 创建: `packages/core/src/renderer/bounding-box.ts`
- 修改: `packages/core/src/types/index.ts:191-207` (添加边界框类型)
- 测试: `packages/core/src/__tests__/bounding-box.test.ts`

**步骤 1: 添加边界框类型**

```typescript
// types/index.ts:191-207
export interface BoundingBox {
  /** 左边界 */
  left: number;
  /** 右边界 */
  right: number;
  /** 上边界 */
  top: number;
  /** 下边界 */
  bottom: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

export interface NoteBoundingBox {
  /** 音符索引 */
  noteIndex: number;
  /** 横向边界框（包括倚音） */
  horizontal: BoundingBox;
  /** 纵向边界框（包括所有符号） */
  vertical: BoundingBox;
}
```

**步骤 2: 编写失败测试**

```typescript
// bounding-box.test.ts
import { describe, it, expect } from 'vitest';
import { calculateNoteBoundingBox } from '../bounding-box.js';
import { NoteElement } from '../../types/index.js';

describe('BoundingBoxCalculator', () => {
  it('should calculate bounding box for simple note', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: 0,
      duration: { base: 4, dots: 0 },
      dot: false,
    };
    
    const bbox = calculateNoteBoundingBox(note, 18, 0, 0);
    
    expect(bbox.horizontal.width).toBeGreaterThan(0);
    expect(bbox.vertical.height).toBeGreaterThan(0);
    expect(bbox.horizontal.left).toBeLessThan(bbox.horizontal.right);
    expect(bbox.vertical.top).toBeLessThan(bbox.vertical.bottom);
  });

  it('should calculate bounding box for note with octave dots', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: 2, // 高八度
      duration: { base: 4, dots: 0 },
      dot: false,
    };
    
    const bbox = calculateNoteBoundingBox(note, 18, 0, 0);
    
    // 高八度点应该在音符上方
    expect(bbox.vertical.top).toBeLessThan(0);
  });

  it('should calculate bounding box for grace note', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: 0,
      duration: { base: 4, dots: 0 },
      dot: false,
      isGrace: true,
    };
    
    const bbox = calculateNoteBoundingBox(note, 18, 0, 0);
    
    // 倚音应该在左侧偏移
    expect(bbox.horizontal.left).toBeLessThan(-10);
  });
});
```

**步骤 3: 运行测试确保失败**

运行: `pnpm test packages/core/src/__tests__/bounding-box.test.ts`
预期: FAIL with "Cannot find module '../bounding-box.js'"

**步骤 4: 编写最小实现**

```typescript
// bounding-box.ts
import { NoteElement, BoundingBox, NoteBoundingBox } from '../types/index.js';
import { calculateSymbolWidth, getSymbolRatio } from './symbol-width.js';

export function calculateNoteBoundingBox(
  note: NoteElement,
  fontSize: number,
  x: number,
  y: number
): NoteBoundingBox {
  const noteWidth = calculateSymbolWidth('noteDigit', fontSize);
  const noteHeight = fontSize;
  
  // 基础边界框（音符数字）
  let left = x - noteWidth / 2;
  let right = x + noteWidth / 2;
  let top = y - noteHeight / 2;
  let bottom = y + noteHeight / 2;
  
  // 处理倚音偏移
  if (note.type === 'note' && note.isGrace) {
    const graceOffsetX = -12; // 来自NoteView.tsx
    left += graceOffsetX;
    right += graceOffsetX;
    // 倚音字体更小
    const graceWidth = calculateSymbolWidth('graceNote', fontSize);
    left = x + graceOffsetX - graceWidth / 2;
    right = x + graceOffsetX + graceWidth / 2;
  }
  
  // 处理八度点
  if (note.type === 'note' && note.octave !== 0) {
    const dotSize = calculateSymbolWidth('octaveDot', fontSize);
    if (note.octave > 0) {
      // 高八度点在上方
      const dotCount = note.octave;
      top = Math.min(top, y - (fontSize * 0.7) - (dotCount - 1) * 6);
    } else {
      // 低八度点在下方
      const dotCount = Math.abs(note.octave);
      bottom = Math.max(bottom, y + (fontSize * 0.7) + (dotCount - 1) * 6);
    }
  }
  
  // 处理减时线
  if (note.type === 'note' && note.duration.base >= 8) {
    const beamWidth = calculateSymbolWidth('beamLine', fontSize);
    right = Math.max(right, x + beamWidth / 2);
    left = Math.min(left, x - beamWidth / 2);
    bottom = Math.max(bottom, y + 12); // 减时线在下方
  }
  
  // 处理波音标记
  if (note.type === 'note' && note.trillType) {
    const trillWidth = calculateSymbolWidth('trillSymbol', fontSize);
    right = Math.max(right, x + trillWidth / 2);
    left = Math.min(left, x - trillWidth / 2);
    top = Math.min(top, y - 22); // 波音标记在上方
  }
  
  // 处理附点
  if (note.type === 'note' && note.dot) {
    const dotWidth = calculateSymbolWidth('dot', fontSize);
    right = Math.max(right, x + noteWidth / 2 + dotWidth);
  }
  
  return {
    noteIndex: 0, // 将在调用时设置
    horizontal: {
      left,
      right,
      top: y - noteHeight / 2, // 横向边界框只关心水平方向
      bottom: y + noteHeight / 2,
      width: right - left,
      height: noteHeight,
    },
    vertical: {
      left: x - noteWidth / 2, // 纵向边界框只关心垂直方向
      right: x + noteWidth / 2,
      top,
      bottom,
      width: noteWidth,
      height: bottom - top,
    },
  };
}

export function checkBoundingBoxOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.right < box2.left ||
    box1.left > box2.right ||
    box1.bottom < box2.top ||
    box1.top > box2.bottom
  );
}
```

**步骤 5: 运行测试确保通过**

运行: `pnpm test packages/core/src/__tests__/bounding-box.test.ts`
预期: PASS

**步骤 6: 提交**

```bash
git add packages/core/src/renderer/bounding-box.ts packages/core/src/types/index.ts packages/core/src/__tests__/bounding-box.test.ts
git commit -m "feat: add bounding box calculator for notes"
```

### 任务 3: 创建动态间距计算器

**文件:**
- 创建: `packages/core/src/renderer/dynamic-spacing.ts`
- 测试: `packages/core/src/__tests__/dynamic-spacing.test.ts`

**步骤 1: 编写失败测试**

```typescript
// dynamic-spacing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDynamicSpacing } from '../dynamic-spacing.js';
import { NoteElement } from '../../types/index.js';

describe('DynamicSpacingCalculator', () => {
  it('should calculate spacing for simple notes', () => {
    const notes: NoteElement[] = [
      {
        type: 'note',
        pitch: 5,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
      {
        type: 'note',
        pitch: 6,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
    ];
    
    const spacing = calculateDynamicSpacing(notes, 18, 200);
    
    expect(spacing).toBeGreaterThan(0);
    expect(spacing).toBeLessThanOrEqual(200); // 不应超过最大间距
  });

  it('should increase spacing for notes with octave dots', () => {
    const simpleNotes: NoteElement[] = [
      {
        type: 'note',
        pitch: 5,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
      {
        type: 'note',
        pitch: 6,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
    ];
    
    const complexNotes: NoteElement[] = [
      {
        type: 'note',
        pitch: 5,
        octave: 2, // 高八度
        duration: { base: 4, dots: 0 },
        dot: false,
      },
      {
        type: 'note',
        pitch: 6,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
    ];
    
    const simpleSpacing = calculateDynamicSpacing(simpleNotes, 18, 200);
    const complexSpacing = calculateDynamicSpacing(complexNotes, 18, 200);
    
    expect(complexSpacing).toBeGreaterThan(simpleSpacing);
  });

  it('should handle grace notes', () => {
    const notes: NoteElement[] = [
      {
        type: 'note',
        pitch: 5,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
        isGrace: true,
      },
      {
        type: 'note',
        pitch: 6,
        octave: 0,
        duration: { base: 4, dots: 0 },
        dot: false,
      },
    ];
    
    const spacing = calculateDynamicSpacing(notes, 18, 200);
    
    expect(spacing).toBeGreaterThan(0);
  });
});
```

**步骤 2: 运行测试确保失败**

运行: `pnpm test packages/core/src/__tests__/dynamic-spacing.test.ts`
预期: FAIL with "Cannot find module '../dynamic-spacing.js'"

**步骤 3: 编写最小实现**

```typescript
// dynamic-spacing.ts
import { NoteElement } from '../types/index.js';
import { calculateNoteBoundingBox, checkBoundingBoxOverlap } from './bounding-box.js';

export function calculateDynamicSpacing(
  notes: NoteElement[],
  fontSize: number,
  maxWidth: number = 200
): number {
  if (notes.length === 0) {
    return fontSize; // 默认间距
  }
  
  // 计算每个音符的边界框
  const boundingBoxes = notes.map((note, index) => {
    // 暂时使用假位置，后续会更新
    const bbox = calculateNoteBoundingBox(note, fontSize, 0, 0);
    bbox.noteIndex = index;
    return bbox;
  });
  
  // 找出最复杂的情况（最大边界框）
  let maxHorizontalWidth = 0;
  let maxVerticalHeight = 0;
  
  for (const bbox of boundingBoxes) {
    maxHorizontalWidth = Math.max(maxHorizontalWidth, bbox.horizontal.width);
    maxVerticalHeight = Math.max(maxVerticalHeight, bbox.vertical.height);
  }
  
  // 基础间距（基于音符宽度）
  let spacing = maxHorizontalWidth * 1.5; // 1.5倍音符宽度
  
  // 添加安全间距（10%字体大小）
  const safetySpacing = fontSize * 0.1;
  spacing += safetySpacing;
  
  // 确保不超过最大间距
  spacing = Math.min(spacing, maxWidth);
  
  // 确保最小间距（50%字体大小）
  const minSpacing = fontSize * 0.5;
  spacing = Math.max(spacing, minSpacing);
  
  return spacing;
}

export function calculateNotePositions(
  notes: NoteElement[],
  fontSize: number,
  startX: number,
  spacing: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  let currentX = startX;
  const y = 0; // 暂时使用固定Y
  
  for (const note of notes) {
    positions.push({ x: currentX, y });
    currentX += spacing;
  }
  
  return positions;
}
```

**步骤 4: 运行测试确保通过**

运行: `pnpm test packages/core/src/__tests__/dynamic-spacing.test.ts`
预期: PASS

**步骤 5: 提交**

```bash
git add packages/core/src/renderer/dynamic-spacing.ts packages/core/src/__tests__/dynamic-spacing.test.ts
git commit -m "feat: add dynamic spacing calculator"
```

### 任务 4: 集成到layout.ts

**文件:**
- 修改: `packages/core/src/renderer/layout.ts:54-162`
- 测试: `packages/core/src/__tests__/layout-dynamic.test.ts`

**步骤 1: 编写失败测试**

```typescript
// layout-dynamic.test.ts
import { describe, it, expect } from 'vitest';
import { createLayout } from '../layout.js';
import { Score, Metadata } from '../../types/index.js';

describe('Dynamic Layout Integration', () => {
  it('should use dynamic spacing instead of fixed spacing', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    const score: Score = {
      metadata,
      measures: [
        {
          number: 1,
          notes: [
            {
              type: 'note',
              pitch: 5,
              octave: 2, // 高八度
              duration: { base: 4, dots: 0 },
              dot: false,
            },
            {
              type: 'note',
              pitch: 6,
              octave: 0,
              duration: { base: 4, dots: 0 },
              dot: false,
            },
          ],
        },
      ],
    };
    
    const layout = createLayout(score, { width: 800 });
    
    // 检查音符位置是否不重叠
    const notes = layout.allNotes;
    expect(notes.length).toBe(2);
    
    // 计算边界框并检查重叠
    const note1Box = {
      left: notes[0].x - 9,
      right: notes[0].x + 9,
      top: notes[0].y - 9,
      bottom: notes[0].y + 9,
    };
    
    const note2Box = {
      left: notes[1].x - 9,
      right: notes[1].x + 9,
      top: notes[1].y - 9,
      bottom: notes[1].y + 9,
    };
    
    // 确保不重叠
    expect(note1Box.right).toBeLessThan(note2Box.left);
  });
});
```

**步骤 2: 运行测试确保失败**

运行: `pnpm test packages/core/src/__tests__/layout-dynamic.test.ts`
预期: FAIL with assertion error

**步骤 3: 修改layout.ts**

```typescript
// layout.ts:54-162
import { calculateDynamicSpacing, calculateNotePositions } from './dynamic-spacing.js';

export function createLayout(score: Score, config: Partial<LayoutConfig> = {}): ScoreLayout {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const lines: LineLayout[] = [];
  const allNotes: NotePosition[] = [];
  let globalNoteIndex = 0;

  // 按行分组小节：优先使用源文本换行，同时受 measuresPerLine 上限约束
  const lineGroups: Measure[][] = [];
  let currentGroup: Measure[] = [];

  for (let i = 0; i < score.measures.length; i++) {
    const measure = score.measures[i];
    const shouldBreak =
      (measure.lineBreakBefore && currentGroup.length > 0) ||
      currentGroup.length >= cfg.measuresPerLine;

    if (shouldBreak) {
      lineGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(measure);
  }
  if (currentGroup.length > 0) {
    lineGroups.push(currentGroup);
  }

  for (let lineIdx = 0; lineIdx < lineGroups.length; lineIdx++) {
    const lineMeasures = lineGroups[lineIdx];

    const lineY = cfg.marginTop + lineIdx * (cfg.lineHeight + cfg.lineGap);
    const measureWidth = (cfg.width - cfg.marginLeft * 2) / cfg.measuresPerLine;

    const measureLayouts: MeasureLayout[] = [];

    for (let mIdx = 0; mIdx < lineMeasures.length; mIdx++) {
      const measure = lineMeasures[mIdx];
      const measureX = cfg.marginLeft + mIdx * measureWidth;
      const notePositions: NotePosition[] = [];

      // 使用动态间距计算音符位置
      const noteSpacing = calculateDynamicSpacing(measure.notes, cfg.noteFontSize || 18, measureWidth * 0.8);
      const positions = calculateNotePositions(measure.notes, cfg.noteFontSize || 18, measureX + noteSpacing / 2, noteSpacing);

      for (let nIdx = 0; nIdx < measure.notes.length; nIdx++) {
        const note = measure.notes[nIdx];
        const { x, y } = positions[nIdx];
        const noteY = lineY + cfg.lineHeight / 2;

        const notePos: NotePosition = {
          index: globalNoteIndex,
          x,
          y: noteY,
          note,
          measureNumber: measure.number,
          beamGroup: (note.type === 'note' || note.type === 'rest') ? note.beamGroup : undefined,
          slurGroup: note.type === 'note' ? note.slurGroup : undefined,
        };

        notePositions.push(notePos);
        allNotes.push(notePos);
        globalNoteIndex++;
      }

      measureLayouts.push({
        measure,
        x: measureX,
        y: lineY,
        width: measureWidth,
        notes: notePositions,
        lyrics: calculateLyricsPositions(measure, notePositions, lineY, cfg),
      });
    }

    lines.push({
      measures: measureLayouts,
      y: lineY,
      height: cfg.lineHeight,
    });
  }

  const totalHeight = lines.length > 0
    ? lines[lines.length - 1].y + cfg.lineHeight + cfg.lineGap
    : cfg.marginTop;

  return {
    width: cfg.width,
    height: totalHeight,
    lines,
    allNotes,
  };
}
```

**步骤 4: 运行测试确保通过**

运行: `pnpm test packages/core/src/__tests__/layout-dynamic.test.ts`
预期: PASS

**步骤 5: 提交**

```bash
git add packages/core/src/renderer/layout.ts packages/core/src/__tests__/layout-dynamic.test.ts
git commit -m "feat: integrate dynamic spacing into layout engine"
```

### 任务 5: 添加边界框缓存优化

**文件:**
- 修改: `packages/core/src/renderer/bounding-box.ts`
- 测试: `packages/core/src/__tests__/bounding-box-cache.test.ts`

**步骤 1: 编写失败测试**

```typescript
// bounding-box-cache.test.ts
import { describe, it, expect } from 'vitest';
import { calculateNoteBoundingBox, clearBoundingBoxCache } from '../bounding-box.js';
import { NoteElement } from '../../types/index.js';

describe('BoundingBox Cache', () => {
  beforeEach(() => {
    clearBoundingBoxCache();
  });

  it('should cache bounding box calculations', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: 0,
      duration: { base: 4, dots: 0 },
      dot: false,
    };
    
    const start1 = performance.now();
    const bbox1 = calculateNoteBoundingBox(note, 18, 0, 0);
    const time1 = performance.now() - start1;
    
    const start2 = performance.now();
    const bbox2 = calculateNoteBoundingBox(note, 18, 0, 0);
    const time2 = performance.now() - start2;
    
    // 第二次调用应该更快（因为缓存）
    expect(time2).toBeLessThan(time1 * 0.5); // 至少快一倍
    expect(bbox1).toEqual(bbox2);
  });

  it('should clear cache correctly', () => {
    const note: NoteElement = {
      type: 'note',
      pitch: 5,
      octave: 0,
      duration: { base: 4, dots: 0 },
      dot: false,
    };
    
    calculateNoteBoundingBox(note, 18, 0, 0);
    clearBoundingBoxCache();
    
    // 缓存应该被清空
    const start = performance.now();
    calculateNoteBoundingBox(note, 18, 0, 0);
    const time = performance.now() - start;
    
    // 应该重新计算，时间应该比有缓存时长
    expect(time).toBeGreaterThan(0.001); // 至少1微秒
  });
});
```

**步骤 2: 运行测试确保失败**

运行: `pnpm test packages/core/src/__tests__/bounding-box-cache.test.ts`
预期: FAIL with "Cannot find module '../bounding-box.js'"

**步骤 3: 修改bounding-box.ts添加缓存**

```typescript
// bounding-box.ts 顶部添加缓存
const boundingBoxCache = new Map<string, NoteBoundingBox>();

function getCacheKey(note: NoteElement, fontSize: number, x: number, y: number): string {
  return JSON.stringify({ note, fontSize, x, y });
}

export function clearBoundingBoxCache(): void {
  boundingBoxCache.clear();
}

// 修改calculateNoteBoundingBox函数
export function calculateNoteBoundingBox(
  note: NoteElement,
  fontSize: number,
  x: number,
  y: number
): NoteBoundingBox {
  const cacheKey = getCacheKey(note, fontSize, x, y);
  
  if (boundingBoxCache.has(cacheKey)) {
    return boundingBoxCache.get(cacheKey)!;
  }
  
  // ... 现有的计算逻辑 ...
  
  const result: NoteBoundingBox = {
    // ... 计算结果 ...
  };
  
  boundingBoxCache.set(cacheKey, result);
  return result;
}
```

**步骤 4: 运行测试确保通过**

运行: `pnpm test packages/core/src/__tests__/bounding-box-cache.test.ts`
预期: PASS

**步骤 5: 提交**

```bash
git add packages/core/src/renderer/bounding-box.ts packages/core/src/__tests__/bounding-box-cache.test.ts
git commit -m "perf: add caching for bounding box calculations"
```

### 任务 6: 验证东北民谣-移调版渲染

**文件:**
- 创建: `apps/web/examples/东北民谣-移调版.md`
- 测试: `apps/web/src/__tests__/dongbei-minyao.test.tsx`

**步骤 1: 创建测试乐谱**

```markdown
---
标题：东北民谣-移调版
调号：G
拍号：4/4
速度：120
---

5 5 6 1' | 2' 1' 6 5 | 3 3 5 6 | 1' - - - |
6 6 5 3 | 2 3 5 - | 6 5 3 2 | 1 - - - |
```

**步骤 2: 编写渲染测试**

```typescript
// dongbei-minyao.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ScoreView from '../components/ScoreView/ScoreView.js';
import { parse } from '@hh-jianpu/core';

describe('东北民谣-移调版渲染测试', () => {
  it('should render without overlapping symbols', async () => {
    const source = `
标题：东北民谣-移调版
调号：G
拍号：4/4
速度：120

5 5 6 1' | 2' 1' 6 5 | 3 3 5 6 | 1' - - - |
6 6 5 3 | 2 3 5 - | 6 5 3 2 | 1 - - - |
    `;
    
    const { score } = parse(source);
    expect(score).not.toBeNull();
    
    const { container } = render(
      <ScoreView
        score={score!}
        currentNoteIndex={-1}
        onNoteClick={() => {}}
      />
    );
    
    // 检查是否有重叠的SVG元素
    const notes = container.querySelectorAll('.score-note');
    expect(notes.length).toBeGreaterThan(0);
    
    // 检查音符位置是否有重叠
    const notePositions = Array.from(notes).map(note => {
      const text = note.querySelector('text');
      const x = parseFloat(text?.getAttribute('x') || '0');
      const y = parseFloat(text?.getAttribute('y') || '0');
      return { x, y };
    });
    
    // 检查相邻音符是否有足够间距
    for (let i = 0; i < notePositions.length - 1; i++) {
      const current = notePositions[i];
      const next = notePositions[i + 1];
      const distance = Math.abs(next.x - current.x);
      
      // 确保至少有10px的间距
      expect(distance).toBeGreaterThan(10);
    }
  });
});
```

**步骤 3: 运行测试**

运行: `pnpm test apps/web/src/__tests__/dongbei-minyao.test.tsx`
预期: PASS

**步骤 4: 提交**

```bash
git add apps/web/examples/东北民谣-移调版.md apps/web/src/__tests__/dongbei-minyao.test.tsx
git commit -m "test: add rendering test for 东北民谣-移调版"
```

### 任务 7: 运行完整测试套件

**文件:**
- 无新文件

**步骤 1: 运行所有测试**

运行: `pnpm test`
预期: 所有测试通过

**步骤 2: 运行类型检查**

运行: `pnpm typecheck` 或 `tsc --noEmit`
预期: 无类型错误

**步骤 3: 运行lint**

运行: `pnpm lint`
预期: 无lint错误

**步骤 4: 提交**

```bash
git add .
git commit -m "test: verify all tests pass with dynamic spacing"
```

### 任务 8: 性能测试和优化

**文件:**
- 创建: `packages/core/src/__tests__/performance.test.ts`

**步骤 1: 编写性能测试**

```typescript
// performance.test.ts
import { describe, it, expect } from 'vitest';
import { createLayout } from '../layout.js';
import { Score, Metadata } from '../../types/index.js';

describe('Dynamic Layout Performance', () => {
  it('should handle large scores efficiently', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    // 创建一个大型乐谱
    const measures = [];
    for (let i = 0; i < 100; i++) {
      measures.push({
        number: i + 1,
        notes: Array.from({ length: 8 }, (_, j) => ({
          type: 'note' as const,
          pitch: (j % 7) + 1,
          octave: Math.floor(j / 4) - 1,
          duration: { base: 4, dots: 0 },
          dot: false,
        })),
      });
    }
    
    const score: Score = { metadata, measures };
    
    const start = performance.now();
    const layout = createLayout(score, { width: 800 });
    const time = performance.now() - start;
    
    expect(layout.allNotes.length).toBe(800);
    expect(time).toBeLessThan(100); // 应该在100ms内完成
  });

  it('should use cache for repeated calculations', () => {
    const metadata: Metadata = {
      key: 'C',
      timeSignature: { beats: 4, beatValue: 4 },
      tempo: 120,
    };
    
    const score: Score = {
      metadata,
      measures: [
        {
          number: 1,
          notes: Array.from({ length: 8 }, (_, j) => ({
            type: 'note' as const,
            pitch: (j % 7) + 1,
            octave: 0,
            duration: { base: 4, dots: 0 },
            dot: false,
          })),
        },
      ],
    };
    
    // 第一次计算
    const start1 = performance.now();
    createLayout(score, { width: 800 });
    const time1 = performance.now() - start1;
    
    // 第二次计算（应该使用缓存）
    const start2 = performance.now();
    createLayout(score, { width: 800 });
    const time2 = performance.now() - start2;
    
    // 第二次应该更快
    expect(time2).toBeLessThan(time1 * 0.7); // 至少快30%
  });
});
```

**步骤 2: 运行性能测试**

运行: `pnpm test packages/core/src/__tests__/performance.test.ts`
预期: PASS

**步骤 3: 优化（如果需要）**

如果性能测试失败，优化：
1. 调整缓存策略
2. 简化边界框计算
3. 批量处理音符

**步骤 4: 提交**

```bash
git add packages/core/src/__tests__/performance.test.ts
git commit -m "test: add performance tests for dynamic layout"
```

## 执行说明

每个任务都是独立的，可以按顺序执行。每个任务完成后需要：
1. 运行测试确保通过
2. 运行类型检查
3. 运行lint
4. 提交代码

所有任务完成后，动态间距计算系统应该已经完全集成，并且能够避免符号重叠问题。