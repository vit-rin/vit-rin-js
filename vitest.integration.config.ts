import { defineConfig } from 'vitest/config';

// S1 against a running VIT-RIN API (`npm run test:integration`). Kept apart
// from the unit suite: it needs a backend, and says so when it has none.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
