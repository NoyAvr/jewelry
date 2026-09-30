import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js alone is ~700 kB minified; one bundle is fine for a single-scene game.
  build: { chunkSizeWarningLimit: 1500 },
})
