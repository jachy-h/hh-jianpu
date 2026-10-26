import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@hh-jianpu/core': path.resolve(__dirname, '../../packages/core/src/index.ts') },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
  },
});
