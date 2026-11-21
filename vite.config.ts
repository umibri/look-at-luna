/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset URLs, so the build works at any path: GitHub Pages serves
  // it under /<repo-name>/, and renaming the repo doesn't need a config change.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
