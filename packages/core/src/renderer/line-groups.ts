/** 在源码换行边界内选择均衡的自动拆行，避免尾部孤立小节。 */
export function groupMeasures<T>(items: T[], width: number, maxMeasures: number, getWidth: (item: T) => number, breaksBefore: (item: T) => boolean): T[][] {
  const sections: T[][] = [];
  for (const item of items) {
    if (!sections.length || breaksBefore(item)) sections.push([]);
    sections[sections.length - 1].push(item);
  }
  return sections.flatMap(section => {
    if (Number.isFinite(maxMeasures)) {
      const groups: T[][] = [];
      let current: T[] = [];
      let used = 0;
      for (const item of section) {
        const itemWidth = getWidth(item);
        if (current.length && (current.length >= maxMeasures || used + itemWidth > width + 0.01)) {
          groups.push(current); current = []; used = 0;
        }
        current.push(item); used += itemWidth;
      }
      if (current.length) groups.push(current);
      return groups;
    }
    const costs = Array<number>(section.length + 1).fill(Infinity);
    const next = Array<number>(section.length).fill(section.length);
    costs[section.length] = 0;
    for (let start = section.length - 1; start >= 0; start--) {
      let used = 0;
      for (let end = start; end < section.length && end - start < maxMeasures; end++) {
        used += getWidth(section[end]);
        if (used > width + 0.01 && end > start) break;
        const remaining = Math.max(0, width - used) / width;
        const count = end - start + 1;
        const cost = remaining * remaining + (count === 1 && section.length > 1 ? 1 : 0) + costs[end + 1];
        if (cost < costs[start]) { costs[start] = cost; next[start] = end + 1; }
      }
    }
    const groups: T[][] = [];
    for (let start = 0; start < section.length; start = next[start]) groups.push(section.slice(start, next[start]));
    return groups;
  });
}
