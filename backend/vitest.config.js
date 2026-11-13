import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/helpers/setup.js'],
    // Valores falsos: nenhum teste fala com o Supabase de verdade.
    env: {
      SUPABASE_URL: 'https://projetoteste.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_teste',
      FRONTEND_URL: 'http://localhost:5173',
      NODE_ENV: 'test',
      // Limites altos: cada arquivo de teste faz dezenas de requisições do
      // mesmo IP. O tests/api/rate-limit.test.js baixa cada um para testar.
      RATE_LIMIT_BURST: '10000',
      RATE_LIMIT_MAX: '10000',
      RATE_LIMIT_AUTH_FAILURES: '10000',
      RATE_LIMIT_HEALTH_DB: '10000',
      RATE_LIMIT_WRITES: '10000',
    },
    restoreMocks: true,
  },
})
