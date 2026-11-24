import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// En dev, redirige / vers la base de l'appli (pratique pour les aperçus et le mobile).
function redirectRootToBase(base: string): Plugin {
  return {
    name: 'redirect-root-to-base',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' && base !== '/') {
          res.statusCode = 302
          res.setHeader('Location', base)
          res.end()
          return
        }
        next()
      })
    },
  }
}

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

  const base = process.env.GITHUB_ACTIONS ? '/sav/' : '/lift-gmao/'

  return {
    base,
    plugins: [react(), redirectRootToBase(base)],
    server: {
      proxy,
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: {
      proxy,
    },
  }
})
