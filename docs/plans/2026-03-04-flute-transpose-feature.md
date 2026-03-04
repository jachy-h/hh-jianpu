# 笛子移调功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 在简谱编辑器中增加移调功能，支持手动选择目标调号和"适配筒音作5"快捷功能。

**Architecture:** 
1. 在 core 包中添加移调转换函数 (transpose.ts)
2. 在 web store 中添加移调状态管理
3. 创建移调弹框组件 (TransposeModal)
4. 在 Editor 右上角添加功能区和移调按钮

**Tech Stack:** TypeScript, React, Zustand, Tailwind CSS

---

## Task 1: 定义笛子指法类型和常量

**Files:**
- Modify: `packages/core/src/types/index.ts:241` (在文件末尾添加)

**Step 1: 添加类型定义**

```typescript
// ============================================================
// 笛子指法类型
// ============================================================

/** 笛子指法（筒音作X） */
export type FluteFingering = '5' | '2' | '1' | '6';

/** 笛子指法最低音对应表 */
export const FLUTE_FINGERING_LOWEST_NOTE: Record<FluteFingering, { pitch: number; octave: number }> = {
  '5': { pitch: 5, octave: -2 }, // 筒音作5：最低 5,
  '2': { pitch: 2, octave: -2 }, // 筒音作2：最低 2,
  '1': { pitch: 1, octave: -2 }, // 筒音作1：最低 1,
  '6': { pitch: 6, octave: -2 }, // 筒音作6：最低 6,
};

/** 调号半音偏移表 */
export const KEY_SEMITONE_OFFSET: Record<KeyName, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};
```

**Step 2: Commit**

```bash
git add packages/core/src/types/index.ts
git commit -m "feat(core): add flute fingering types and constants"
```

---

## Task 2: 编写移调转换函数

**Files:**
- Create: `packages/core/src/parser/transpose.ts`
- Create: `packages/core/src/parser/index.ts` (如需导出)

**Step 1: 创建 transpose.ts**

```typescript
import type { Note, Rest, NoteElement, Score, KeyName, FluteFingering, Metadata } from '../types';
import { FLUTE_FINGERING_LOWEST_NOTE, KEY_SEMITONE_OFFSET } from '../types';

/** 音符转 MIDI 编号 */
function noteToMidi(pitch: number, octave: number): number {
  // 简谱 pitch 1-7 对应 C-B (0-11)
  const pitchOffset: Record<number, number> = {
    1: 0, // C
    2: 2, // D
    3: 4, // E
    4: 5, // F
    5: 7, // G
    6: 9, // A
    7: 11, // B
  };
  const base = pitchOffset[pitch] ?? 0;
  const octaveMidi = (octave + 1) * 12; // octave -2 → -12, -1 → 0, 0 → 12
  return 12 + base + octaveMidi; // 60 = C3
}

/** MIDI 编号转音符 */
function midiToNote(midi: number): { pitch: number; octave: number; accidental?: 'sharp' | 'flat' } {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  
  const pitchMap: Record<string, number> = {
    'C': 1, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 2, 'Eb': 2,
    'E': 3,
    'F': 4, 'F#': 4, 'Gb': 4,
    'G': 5, 'G#': 5, 'Ab': 5,
    'A': 6, 'A#': 6, 'Bb': 6,
    'B': 7,
  };
  
  const pitch = pitchMap[noteName] ?? 1;
  const accidental = noteName.includes('#') ? 'sharp' : noteName.includes('b') ? 'flat' : undefined;
  
  return { pitch, octave, accidental };
}

/** 移调单个音符元素 */
function transposeNoteElement(element: NoteElement, semitones: number): NoteElement {
  if (element.type === 'note') {
    const midi = noteToMidi(element.pitch, element.octave);
    const newMidi = midi + semitones;
    const { pitch, octave, accidental } = midiToNote(newMidi);
    
    return {
      ...element,
      pitch,
      octave,
      accidental,
    };
  }
  return element;
}

/** 计算两个调之间的半音距离 */
export function calculateSemitoneDistance(fromKey: KeyName, toKey: KeyName): number {
  const from = KEY_SEMITONE_OFFSET[fromKey];
  const to = KEY_SEMITONE_OFFSET[toKey];
  return to - from;
}

/** 计算适配指法需要的移调半音数 */
export function calculateFingeringSemitones(
  lowestPitch: number,
  lowestOctave: number,
  fingering: FluteFingering
): number {
  const currentLowestMidi = noteToMidi(lowestPitch, lowestOctave);
  const targetLowest = FLUTE_FINGERING_LOWEST_NOTE[fingering];
  const targetLowestMidi = noteToMidi(targetLowest.pitch, targetLowest.octave);
  
  if (currentLowestMidi >= targetLowestMidi) {
    return 0; // 无需移调
  }
  return targetLowestMidi - currentLowestMidi;
}

/** 移调曲谱 */
export function transposeScore(score: Score, semitones: number): Score {
  if (semitones === 0) return score;
  
  const newMetadata = { ...score.metadata };
  
  // 调整调号
  const currentKey = score.metadata.key;
  const currentKeyOffset = KEY_SEMITONE_OFFSET[currentKey];
  const newKeyOffset = currentKeyOffset + semitones;
  
  // 找出新调号
  const keyNames: KeyName[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  const normalizedOffset = ((newKeyOffset % 12) + 12) % 12;
  let newKey: KeyName = 'C';
  for (const key of keyNames) {
    if (KEY_SEMITONE_OFFSET[key] === normalizedOffset) {
      newKey = key;
      break;
    }
  }
  newMetadata.key = newKey;
  
  // 移调所有小节的音符
  const newMeasures = score.measures.map(measure => ({
    ...measure,
    notes: measure.notes.map(note => transposeNoteElement(note, semitones)),
  }));
  
  return {
    metadata: newMetadata,
    measures: newMeasures,
  };
}

/** 从 Score AST 生成简谱源码文本 */
export function scoreToSource(score: Score): string {
  const lines: string[] = [];
  
  // 元信息
  lines.push('---');
  if (score.metadata.title) {
    lines.push(`标题：${score.metadata.title}`);
  }
  lines.push(`调号：${score.metadata.key}`);
  lines.push(`拍号：${score.metadata.timeSignature.beats}/${score.metadata.timeSignature.beatValue}`);
  lines.push(`速度：${score.metadata.tempo}`);
  lines.push('---');
  lines.push('');
  
  // 音符
  for (const measure of score.measures) {
    let measureStr = 'Q ';
    for (const note of measure.notes) {
      if (note.type === 'note') {
        const accidental = note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : '';
        const octaveMark = note.octave > 0 ? "'".repeat(note.octave) : note.octave < 0 ? ",".repeat(-note.octave) : '';
        const duration = note.duration.base === 1 ? '' : '/'.repeat(Math.log2(note.duration.base));
        const dot = note.dot ? '.' : '';
        measureStr += `${accidental}${note.pitch}${octaveMark}${duration}${dot} `;
      } else if (note.type === 'rest') {
        const duration = note.duration.base === 1 ? '' : '/'.repeat(Math.log2(note.duration.base));
        measureStr += `0${duration} `;
      }
    }
    lines.push(measureStr + '|');
  }
  
  return lines.join('\n');
}
```

**Step 2: Commit**

```bash
git add packages/core/src/parser/transpose.ts
git commit -m "feat(core): add transpose functions"
```

---

## Task 3: 创建移调弹框组件

**Files:**
- Create: `apps/web/src/components/Transpose/TransposeModal.tsx`
- Create: `apps/web/src/components/Transpose/index.ts`

**Step 1: 创建 TransposeModal.tsx**

```typescript
import React, { useState, useMemo } from 'react';
import { parse, type Score, type KeyName, type FluteFingering, FLUTE_FINGERING_LOWEST_NOTE, KEY_SEMITONE_OFFSET } from '@hh-jianpu/core';
import { Button } from '../ui';

interface TransposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: string;
  onApply: (newSource: string) => void;
}

const KEY_OPTIONS: KeyName[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const FINGERING_OPTIONS: { value: FluteFingering; label: string }[] = [
  { value: '5', label: '筒音作5' },
  { value: '2', label: '筒音作2' },
  { value: '1', label: '筒音作1' },
  { value: '6', label: '筒音作6' },
];

/** 计算音符的 MIDI */
function noteToMidi(pitch: number, octave: number): number {
  const pitchOffset: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  return 12 + (pitchOffset[pitch] ?? 0) + (octave + 1) * 12;
}

/** 从 AST 提取最低音 */
function findLowestNote(score: Score): { pitch: number; octave: number } | null {
  let lowest: { pitch: number; octave: number; midi: number } | null = null;
  
  for (const measure of score.measures) {
    for (const note of measure.notes) {
      if (note.type === 'note') {
        const midi = noteToMidi(note.pitch, note.octave);
        if (!lowest || midi < lowest.midi) {
          lowest = { pitch: note.pitch, octave: note.octave, midi };
        }
      }
    }
  }
  
  return lowest ? { pitch: lowest.pitch, octave: lowest.octave } : null;
}

const TransposeModal: React.FC<TransposeModalProps> = ({ isOpen, onClose, source, onApply }) => {
  const [selectedKey, setSelectedKey] = useState<KeyName>('C');
  const [selectedFingering, setSelectedFingering] = useState<FluteFingering>('5');
  
  // 解析当前谱子
  const currentScore = useMemo(() => parse(source).score, [source]);
  const currentKey = currentScore?.metadata.key ?? 'C';
  const lowestNote = useMemo(() => currentScore ? findLowestNote(currentScore) : null, [currentScore]);
  
  // 计算适配指法需要的半音数
  const fingeringSemitones = useMemo(() => {
    if (!lowestNote) return 0;
    const currentMidi = noteToMidi(lowestNote.pitch, lowestNote.octave);
    const target = FLUTE_FINGERING_LOWEST_NOTE[selectedFingering];
    const targetMidi = noteToMidi(target.pitch, target.octave);
    return currentMidi >= targetMidi ? 0 : targetMidi - currentMidi;
  }, [lowestNote, selectedFingering]);
  
  // 计算目标调的半音数
  const keySemitones = useMemo(() => {
    const from = KEY_SEMITONE_OFFSET[currentKey];
    const to = KEY_SEMITONE_OFFSET[selectedKey];
    return to - from;
  }, [currentKey, selectedKey]);
  
  const handleApply = () => {
    // TODO: 调用 core 的移调函数
    // 这里需要导入并使用 Task 2 中创建的函数
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">移调设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 当前信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">📝 当前谱面信息</div>
            <div className="text-sm text-gray-600">
              <div>调号：{currentKey}</div>
              <div>最低音：{lowestNote ? `${lowestNote.pitch}${lowestNote.octave < 0 ? ','.repeat(-lowestNote.octave) : ''}` : '未知'}</div>
            </div>
          </div>
          
          {/* 目标设置 */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">🎯 目标设置</div>
            
            {/* 目标调号 */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">目标调号（手动选择）</div>
              <div className="flex flex-wrap gap-2">
                {KEY_OPTIONS.map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      selectedKey === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {keySemitones !== 0 && (
                <div className="mt-2 text-sm text-blue-600">
                  {keySemitones > 0 ? `升高 ${keySemitones} 半音` : `降低 ${-keySemitones} 半音`}
                </div>
              )}
            </div>
            
            {/* 分隔线 */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">或者</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            
            {/* 适配指法 */}
            <div>
              <div className="text-xs text-gray-500 mb-2">适配笛子指法</div>
              <div className="space-y-2">
                {FINGERING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedFingering(opt.value)}
                    className={`w-full px-4 py-2 rounded text-left flex items-center justify-between ${
                      selectedFingering === opt.value
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <span>🪈 {opt.label}</span>
                    {selectedFingering === opt.value && fingeringSemitones > 0 && (
                      <span className="text-sm text-blue-600">需上升 {fingeringSemitones} 半音</span>
                    )}
                    {selectedFingering === opt.value && fingeringSemitones === 0 && lowestNote && (
                      <span className="text-sm text-green-600">✓ 无需移调</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 提示 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-sm text-amber-800">
              ⚠️ 此操作将生成新的简谱源码，不会修改原谱。
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            确认移调
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransposeModal;
```

**Step 2: Commit**

```bash
git add apps/web/src/components/Transpose/
git commit -m "feat(web): add TransposeModal component"
```

---

## Task 4: 在 Editor 添加功能区

**Files:**
- Modify: `apps/web/src/components/Editor/Editor.tsx:244` (在标题栏添加功能区按钮)

**Step 1: 添加移调按钮**

在 Editor.tsx 的标题栏中，在"已自动保存"文字左侧添加功能区：

```tsx
// 在 import 部分添加
import { useState } from 'react';
import TransposeModal from '../Transpose/TransposeModal';

// 在组件中添加 state
const [isTransposeOpen, setIsTransposeOpen] = useState(false);

// 在标题栏添加功能按钮（在自动保存状态后面）
<span className="flex items-center gap-2">
  {/* 功能区 */}
  <button
    onClick={() => setIsTransposeOpen(true)}
    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
    aria-label="移调"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
    移调
  </button>
  {/* 自动保存状态... */}
</span>

// 在组件末尾添加 Modal
{isTransposeOpen && (
  <TransposeModal
    isOpen={isTransposeOpen}
    onClose={() => setIsTransposeOpen(false)}
    source={value}
    onApply={onChange}
  />
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/Editor/Editor.tsx
git commit -m "feat(web): add transpose button to Editor toolbar"
```

---

## Task 5: 集成移调逻辑

**Files:**
- Modify: `apps/web/src/components/Transpose/TransposeModal.tsx`

**Step 1: 实现真正的移调逻辑**

将 Task 2 的 transpose.ts 逻辑集成到 Modal 中：

```typescript
import { parse, transposeScore, scoreToSource, KEY_SEMITONE_OFFSET } from '@hh-jianpu/core';
// ... 在 handleApply 中实现
```

**Step 2: Commit**

```bash
git add apps/web/src/components/Transpose/TransposeModal.tsx
git commit -m "feat(web): integrate transpose logic in TransposeModal"
```

---

## Task 6: 运行测试和验证

**Step 1: 运行类型检查**

```bash
pnpm run typecheck
```

**Step 2: 运行 lint**

```bash
pnpm run lint
```

**Step 3: 运行测试**

```bash
pnpm test
```

**Step 4: 构建**

```bash
pnpm build
```

---

## Task 7: 最终提交

```bash
git add .
git commit -m "feat: add flute fingering transpose feature

- Add flute fingering types and constants in core
- Add transpose functions in parser
- Add TransposeModal component
- Add transpose button in Editor toolbar"
```
