import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Pure-function unit tests only. These suites must not import anything that
// pulls in electron / better-sqlite3 (node env, no DOM needed).
export default defineConfig({
  resolve: {
    alias: { '@': path.join(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
