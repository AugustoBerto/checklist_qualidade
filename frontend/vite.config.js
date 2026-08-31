import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const production = mode === 'production'
  const gatewayUrl = env.VITE_GATEWAY_URL?.trim()
    || (!production ? 'http://localhost:2399' : null)
  const base = env.VITE_APP_BASE_URL?.trim() || (!production ? '/' : null)

  if (!gatewayUrl) {
    throw new Error('VITE_GATEWAY_URL é obrigatória para o build de produção.')
  }
  if (!base) {
    throw new Error('VITE_APP_BASE_URL é obrigatória para o build de produção.')
  }

  const proxy = {
    '/api': {
      target: gatewayUrl,
      changeOrigin: true
    }
  }

  return {
    base,
    plugins: [vue()],
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
