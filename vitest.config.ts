import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve the workspace package to its TS source so tests run without a build.
export default defineConfig({
  resolve: {
    alias: {
      '@dsk/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
    },
  },
});
