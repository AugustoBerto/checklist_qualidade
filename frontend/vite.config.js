import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [vue()],
    optimizeDeps: {
      include: ['jquery', 'select2']
    },
    define: {
      global: 'globalThis'
    },
    resolve: {
      alias: {
        'jquery': 'jquery/dist/jquery.js'
      }
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_GATEWAY_URL || 'http://localhost:2399',
          changeOrigin: true
        }
      }
    }
  }
})
