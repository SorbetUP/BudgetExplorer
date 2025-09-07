import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Vite base for GitHub Pages project repo path
// Falls back to '/BudgetExplorer/' in production; can be overridden locally with VITE_BASE
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  // Keep using repo-level public folder to avoid moving large datasets right now
  publicDir: resolve(__dirname, '../public'),
  server: { port: 5173, open: false }
})
