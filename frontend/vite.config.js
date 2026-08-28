import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/api': {
      target: env.VITE_GATEWAY_URL || 'http://localhost:2399',
      changeOrigin: true
    }
  }

  const faviconRootPlugin = () => ({
    name: 'favicon-root-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''
        const map = {
          '/favicon.ico': 'image/x-icon',
          '/favicon.svg': 'image/svg+xml',
          '/favicon.png': 'image/png',
          '/favicon-32x32.png': 'image/png',
          '/favicon-16x16.png': 'image/png',
          '/apple-touch-icon.png': 'image/png',
          '/dass.png': 'image/png'
        }
        if (map[url]) {
          const filePath = path.resolve(process.cwd(), 'public', url.slice(1))
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', map[url])
            return fs.createReadStream(filePath).pipe(res)
          }
        }
        next()
      })
    }
  })

  return {
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [vue(), faviconRootPlugin()],
    define: {
      global: 'globalThis'
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      hmr: false,
      proxy
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      proxy
    },
  }
})
