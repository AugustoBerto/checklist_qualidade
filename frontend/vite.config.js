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

  return {
    base: env.VITE_APP_BASE_URL || '/',
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
