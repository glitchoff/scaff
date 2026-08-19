import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // CLI integration tests spawn node + tsx per invocation, which is slow on
    // Windows (each call ~2-10s). Give them a generous budget to avoid flaky
    // timeouts; unit tests finish well within this window.
    testTimeout: 60000,
    hookTimeout: 60000,
    // Forks pool isolates each test file in a process, which tears down more
    // reliably than worker threads when tests spawn child node processes.
    pool: 'forks',
  },
});