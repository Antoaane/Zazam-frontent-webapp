import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss()
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    https: {
      key: fs.readFileSync(fileURLToPath(new URL('./certs/localhost-key.pem', import.meta.url))),
      cert: fs.readFileSync(fileURLToPath(new URL('./certs/localhost.pem', import.meta.url))),
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
