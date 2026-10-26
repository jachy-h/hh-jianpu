/** 可按 key 模拟容量和权限失败，避免依赖浏览器的磁盘状态。 */
export class TestStorage implements Storage {
  readonly values = new Map<string, string>();
  failWritesFor: string | null = null;
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void {
    if (this.failWritesFor === '*' || this.failWritesFor === key) {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    }
    this.values.set(key, value);
  }
}
