import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      // 开发时直接引用 core 源码，避免每次需要手动 build
      '@as-nmn/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
});
