import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cspPlugin } from './csp.js'

export default defineConfig(({ mode }) => ({
  plugins: [react(), cspPlugin(loadEnv(mode, process.cwd(), 'VITE_'))],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    restoreMocks: true,
    // Os testes não dependem do .env de cada máquina: CAPTCHA desligado por
    // padrão (os testes do CAPTCHA ligam ele por conta própria).
    env: { VITE_TURNSTILE_SITE_KEY: '' },
  },
}))
