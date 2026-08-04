import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
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
  }
})
