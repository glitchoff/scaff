import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  shims: true,    // adds __dirname/__filename shims for ESM
  banner: {
    js: '#!/usr/bin/env node',
  },
});
