import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: env.BACKEND_URI,
          changeOrigin: true,
          secure: false,
        },
        '/gamehub': {
          target: env.BACKEND_URI,
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying for SignalR
        },
      },
    },
  }
})
