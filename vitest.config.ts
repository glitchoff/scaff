import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // CLI integration tests spawn node + tsx per invocation, which is slow on
    // Windows (each call ~2-5s). Give them a generous budget to avoid flaky
    // timeouts; unit tests finish well within this window.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
