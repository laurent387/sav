import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiProxyTarget = env.VITE_AI_PROXY_TARGET || `http://localhost:${env.AI_BACKEND_PORT || '8787'}`
  // En prod, Nginx sert /lift-gmao/api/* -> API Node (port 5000) /api/*.
  // En dev, Vite reproduit ce comportement.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${env.API_PORT || '5000'}`

  const proxy = {
    '/api/ai': {
      target: aiProxyTarget,
      changeOrigin: true,
    },
    '/lift-gmao/api': {
      target: apiProxyTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/lift-gmao/, ''),
    },
  }

  return {
    base: process.env.GITHUB_ACTIONS ? '/sav/' : '/lift-gmao/',
    plugins: [react()],
    server: {
      proxy,
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: {
      proxy,
    },
  }
})
