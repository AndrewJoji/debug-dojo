/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the site from /debug-dojo/, not from the domain root.
  base: '/debug-dojo/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // jsdom gives the sandbox runtime a real-looking document, so DOM snippets
    // run in CI the same way they run in the browser iframe.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})
