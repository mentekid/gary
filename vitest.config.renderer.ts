import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'renderer',
    environment: 'happy-dom',
    include: ['tests/unit/renderer/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./tests/setup/renderer.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/renderer/**/*.{ts,tsx}'],
      exclude: ['src/renderer/index.tsx', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@common': path.resolve(__dirname, './src/common'),
    },
  },
});
