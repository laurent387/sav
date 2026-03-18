import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiProxyTarget = env.VITE_AI_PROXY_TARGET || `http://localhost:${env.AI_BACKEND_PORT || '8787'}`

  return {
    base: process.env.GITHUB_ACTIONS ? '/sav/' : '/lift-gmao/',
    plugins: [react()],
    server: {
      proxy: {
        '/api/ai': {
          target: aiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api/ai': {
          target: aiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
