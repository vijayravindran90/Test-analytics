import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Test-analytics/',
  plugins: [react()],
  publicDir: 'public', // Ensure public folder files (like 404.html) are copied to dist
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
