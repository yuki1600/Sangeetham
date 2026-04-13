import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    allowedHosts: ['buck-monte-dispatch-berkeley.trycloudflare.com'],
    proxy: {
      '/api': { target: `http://localhost:${process.env.SERVER_PORT || 3001}`, changeOrigin: true }
    }
  }
})
