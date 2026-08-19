import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['tests/browser/**'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    },
  },
})
