import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // GitHub Pages 部署时使用仓库名作为 base 路径
  base: process.env.NODE_ENV === 'production' ? '/hh-jianpu/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      // 开发时直接引用 core 源码，避免每次需要手动 build
      '@hh-jianpu/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
});
