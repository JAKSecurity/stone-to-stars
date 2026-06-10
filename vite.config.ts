/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages project sites
  test: {
    globals: true,
    environment: 'node',
    // Don't crawl into git worktrees (parallel agent sessions live under .claude/worktrees/) or
    // build output — they pollute the run with duplicate/in-flight tests and cause flaky failures.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
