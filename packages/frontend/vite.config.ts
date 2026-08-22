import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react()],
  publicDir: 'public', // Ensure public folder files (like 404.html) are copied to dist
  // The shared workspace package is symlinked in via npm workspaces, so Vite/Rollup
  // resolves it to its real path outside node_modules. Widen the commonjs include
  // pattern so its compiled CJS output still gets CJS->ESM interop applied.
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages\/shared/],
    },
  },
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

