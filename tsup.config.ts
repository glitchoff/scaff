import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/main.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  shims: true,
  splitting: false,
  bundle: true,
  minify: false,
  treeshake: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
