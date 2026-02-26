import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '')
  const backendUri = env.VITE_BACKEND_URI || env.BACKEND_URI

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'BACKEND_'],
    server: {
      proxy: {
        '/api': {
          target: backendUri,
          changeOrigin: true,
          secure: false,
        },
        '/gamehub': {
          target: backendUri,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
