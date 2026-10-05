import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8888',
      '/socket.io': { target: 'ws://127.0.0.1:8888', ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  build: { outDir: 'dist' },
})
