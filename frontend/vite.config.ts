import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: { // Add this test configuration
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // We'll create this setup file
    css: true, // If you want to process CSS during tests
  },
})
