/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/thumbnail-generator/',
  build: {
    outDir: 'dist',
  },
  test: {
    // Fast defaults: node env for pure logic; component tests opt into jsdom
    // via a `// @vitest-environment jsdom` file comment.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
