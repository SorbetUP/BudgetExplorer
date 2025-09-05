import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Use relative base for GitHub Pages subpath compatibility
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: resolve(__dirname, '../public'),
  server: { port: 5173, open: true }
})

