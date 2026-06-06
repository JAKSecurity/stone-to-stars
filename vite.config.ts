/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages project sites
  test: {
    globals: true,
    environment: 'node',
  },
});
