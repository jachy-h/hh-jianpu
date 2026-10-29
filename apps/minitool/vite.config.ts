import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

export default defineConfig(({ mode }) => {
  const probe = mode === 'probe';
  return {
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: probe ? 'audio-probe-dist' : 'dist', target: ['es2017', 'chrome61'], cssTarget: 'chrome61', sourcemap: false,
    lib: { entry: path.resolve(__dirname, probe ? 'src/probe.ts' : 'src/main.tsx'), name: 'JianpuMiniTool', formats: ['iife'], fileName: () => 'app.js' },
    rollupOptions: { output: { inlineDynamicImports: true }, plugins: [{
      name: 'dependency-inventory',
      generateBundle() {
        const dependencies = [...this.getModuleIds()].map(id => path.relative(path.resolve(__dirname, '../..'), id));
        fs.mkdirSync(path.resolve(__dirname, 'build'), { recursive: true });
        fs.writeFileSync(path.resolve(__dirname, 'build', probe ? 'probe-dependencies.json' : 'dependencies.json'), JSON.stringify(dependencies.sort(), null, 2));
      },
    }] },
  },
  plugins: [{ name: 'static-entry', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'index.html', source: `<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>哈哈简谱 · 随身谱本</title>${probe ? '' : '<link rel="stylesheet" href="./style.css">'}</head><body><div id="root"></div><script src="./app.js"></script></body></html>` });
  } }],
};
});
