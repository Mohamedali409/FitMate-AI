import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
