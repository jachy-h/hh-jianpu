import { NoteElement } from '../types/index.js';
import { calculateNoteBoundingBox } from './bounding-box.js';

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
  
  for (let index = 0; index < notes.length; index++) {
    positions.push({ x: currentX, y });
    currentX += spacing;
  }
  
  return positions;
}