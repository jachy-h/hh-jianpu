// 仅补齐共享布局/解析实际使用的 ES2019 数组能力；Chrome 61 已原生支持 ES2017。
if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true, writable: true,
    value: function<T, U>(this: T[], callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: unknown): U[] {
      const output: U[] = [];
      this.forEach((value, index, array) => {
        const mapped = callback.call(thisArg, value, index, array);
        if (Array.isArray(mapped)) mapped.forEach(item => output.push(item));
        else output.push(mapped);
      });
      return output;
    },
  });
}
