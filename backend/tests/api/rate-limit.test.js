import { describe, it, expect, vi, afterEach } from 'vitest'
import request from 'supertest'
import { AUTH, MFA_AAL2_TOKEN } from '../helpers/constants.js'

// Cada teste baixa um limite e carrega o app do zero (contadores zerados).
async function appWith(env) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
  vi.resetModules()
  return (await import('../../src/app.js')).default
}

function expectRateLimited(res) {
  expect(res.status).toBe(429)
  expect(res.body.code).toBe('rate_limited')
  expect(res.body.retryAfter).toBeGreaterThan(0)
  expect(res.headers['retry-after']).toBeDefined()
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('limite de requisições por IP', () => {
  it('15 minutos: a partir do limite, responde 429 com mensagem em português', async () => {
    const app = await appWith({ RATE_LIMIT_MAX: '3' })

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/health')).status).toBe(200)
    }
    const blocked = await request(app).get('/api/health')
    expectRateLimited(blocked)
    expect(blocked.body.error).toMatch(/Muitas requisições/)
    expect(blocked.body.retryAfter).toBeLessThanOrEqual(15 * 60)
  })

  it('rajada: barra quem passa do limite por minuto e diz quantos segundos esperar', async () => {
    const app = await appWith({ RATE_LIMIT_BURST: '3' })

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/health')).status).toBe(200)
    }
    const blocked = await request(app).get('/api/health')
    expectRateLimited(blocked)
    expect(blocked.body.retryAfter).toBeLessThanOrEqual(60)
  })

  it('/healthz (verificação da hospedagem) não conta para o limite e responde mesmo com o IP barrado', async () => {
    const app = await appWith({ RATE_LIMIT_BURST: '1' })

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/healthz')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'ok' })
    }
    expect((await request(app).get('/api/health')).status).toBe(200)
    expectRateLimited(await request(app).get('/api/health'))
    expect((await request(app).get('/healthz')).status).toBe(200)
  })

  it('barrado antes de validar o token: não consulta o Supabase', async () => {
    const app = await appWith({ RATE_LIMIT_BURST: '1' })
    const { createClient } = await import('@supabase/supabase-js')

    await request(app).get('/api/auth/me').set(AUTH)
    createClient.mockClear()

    expect((await request(app).get('/api/auth/me').set(AUTH)).status).toBe(429)
    expect(createClient).not.toHaveBeenCalled()
  })
})

describe('tentativas com login inválido', () => {
  it('depois de N respostas 401, barra o IP, mesmo com token válido', async () => {
    const app = await appWith({ RATE_LIMIT_AUTH_FAILURES: '2' })

    expect((await request(app).get('/api/auth/me')).status).toBe(401)
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer falso')).status).toBe(401)

    const blocked = await request(app).get('/api/auth/me').set(AUTH)
    expectRateLimited(blocked)
    expect(blocked.body.error).toMatch(/login inválido/)
  })

  it('requisições que deram certo não contam', async () => {
    const app = await appWith({ RATE_LIMIT_AUTH_FAILURES: '2' })

    for (let i = 0; i < 5; i++) {
      expect((await request(app).get('/api/auth/me').set(AUTH)).status).toBe(200)
    }
  })
})

describe('teste de conexão com o banco', () => {
  it('/api/health/supabase tem limite próprio; /api/health continua respondendo', async () => {
    const app = await appWith({ RATE_LIMIT_HEALTH_DB: '2' })

    expect((await request(app).get('/api/health/supabase')).status).toBe(200)
    expect((await request(app).get('/api/health/supabase')).status).toBe(200)
    expectRateLimited(await request(app).get('/api/health/supabase'))
    expect((await request(app).get('/api/health')).status).toBe(200)
  })
})

describe('gravações por usuário', () => {
  // Corpo vazio: o controller responde 400 sem chegar ao banco, mas a
  // tentativa conta no limite do mesmo jeito.
  it('barra POST/PUT/DELETE acima do limite por minuto', async () => {
    const app = await appWith({ RATE_LIMIT_WRITES: '2' })

    expect((await request(app).post('/api/categories').set(AUTH).send({})).status).toBe(400)
    expect((await request(app).put('/api/expenses/x').set(AUTH).send({})).status).toBe(400)

    const blocked = await request(app).delete('/api/budgets/x').set(AUTH)
    expectRateLimited(blocked)
    expect(blocked.body.error).toMatch(/Muitas alterações/)
  })

  it('leituras (GET) não contam', async () => {
    const app = await appWith({ RATE_LIMIT_WRITES: '1' })

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/auth/me').set(AUTH)).status).toBe(200)
    }
    expect((await request(app).post('/api/categories').set(AUTH).send({})).status).toBe(400)
  })

  it('cada usuário tem o seu contador', async () => {
    const app = await appWith({ RATE_LIMIT_WRITES: '1' })

    expect((await request(app).post('/api/categories').set(AUTH).send({})).status).toBe(400)
    expect((await request(app).post('/api/categories').set(AUTH).send({})).status).toBe(429)

    const other = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${MFA_AAL2_TOKEN}`)
      .send({})
    expect(other.status).toBe(400)
  })
})

describe('IP atrás de proxy (TRUST_PROXY)', () => {
  it('sem TRUST_PROXY, um X-Forwarded-For inventado não escapa do limite', async () => {
    const app = await appWith({ RATE_LIMIT_BURST: '1' })
    // O express-rate-limit avisa no console quando vê esse cabeçalho sem proxy configurado.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await request(app).get('/api/health').set('X-Forwarded-For', '1.1.1.1')).status).toBe(200)
    expect((await request(app).get('/api/health').set('X-Forwarded-For', '2.2.2.2')).status).toBe(429)
  })

  it('com TRUST_PROXY=1, cada IP real tem o seu contador', async () => {
    const app = await appWith({ RATE_LIMIT_BURST: '1', TRUST_PROXY: '1' })

    expect((await request(app).get('/api/health').set('X-Forwarded-For', '1.1.1.1')).status).toBe(200)
    expect((await request(app).get('/api/health').set('X-Forwarded-For', '2.2.2.2')).status).toBe(200)
    expect((await request(app).get('/api/health').set('X-Forwarded-For', '1.1.1.1')).status).toBe(429)
  })
})
