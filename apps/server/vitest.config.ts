import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests share a SQLite file; run them serially to avoid
    // cross-test write races.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Migrate a dedicated test DB once before the suite.
    globalSetup: ['./src/tests/globalSetup.ts'],
    // Test workers use a separate DB and a fixed secret; env.ts skips the
    // .env file when NODE_ENV === 'test'.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      SESSION_SECRET: 'test-secret-0123456789',
    },
  },
});
