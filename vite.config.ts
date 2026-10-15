import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: [
        /^https:\/\/([\w-]+\.)?owlbear\.rodeo$/,
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      ],
    },
  },
  build: {
    rollupOptions: {
      input: { main: resolve('index.html'), background: resolve('background.html') },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
