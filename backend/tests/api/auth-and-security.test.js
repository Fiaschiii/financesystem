import { describe, it, expect, vi, afterEach } from 'vitest'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../../src/app.js'
import { fetchWithTimeout } from '../../src/utils/fetchWithTimeout.js'
import * as financeService from '../../src/services/financeService.js'
import { USER, VALID_TOKEN, CRASH_TOKEN, AUTH } from '../helpers/constants.js'

vi.mock('../../src/services/financeService.js')

describe('autenticação', () => {
  it('sem token: 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token de autenticação ausente')
  })

  it('cabeçalho sem "Bearer ": 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', VALID_TOKEN)
    expect(res.status).toBe(401)
  })

  it('token inválido ou expirado: 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido ou expirado')
  })

  it('Supabase fora do ar ao validar o token: 500', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${CRASH_TOKEN}`)
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Falha ao validar autenticação')
  })

  it('token válido: devolve o usuário', async () => {
    const res = await request(app).get('/api/auth/me').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: USER.id, email: USER.email })
  })

  it('consulta o banco com o token do usuário e a chave publishable (RLS vale), nunca a secret', async () => {
    createClient.mockClear()
    await request(app).get('/api/auth/me').set(AUTH)

    expect(createClient).toHaveBeenCalledTimes(1)
    const [url, key, options] = createClient.mock.calls[0]
    expect(url).toBe(process.env.SUPABASE_URL)
    expect(key).toBe(process.env.SUPABASE_PUBLISHABLE_KEY)
    expect(options.global.headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`)
    expect(options.auth.persistSession).toBe(false)
    // Chamadas ao Supabase com prazo: lentidão lá não pendura o backend.
    expect(options.global.fetch).toBe(fetchWithTimeout)
  })

  it.each([
    ['get', '/api/finance'],
    ['post', '/api/finance'],
    ['get', '/api/expenses'],
    ['post', '/api/expenses'],
    ['put', '/api/expenses/x'],
    ['delete', '/api/expenses/x'],
    ['get', '/api/categories'],
    ['post', '/api/categories'],
    ['delete', '/api/categories/x'],
    ['get', '/api/budgets'],
    ['post', '/api/budgets'],
  ])('%s %s exige login', async (method, path) => {
    const res = await request(app)[method](path)
    expect(res.status).toBe(401)
  })
})

describe('proteções gerais', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('health responde sem login', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('envia cabeçalhos de segurança (helmet) e esconde o X-Powered-By', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('CORS libera só o FRONTEND_URL', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173')

    const other = await request(app).get('/api/health').set('Origin', 'https://site-malicioso.com')
    expect(other.headers['access-control-allow-origin']).not.toBe('https://site-malicioso.com')
  })

  it('informa o limite de requisições nos cabeçalhos', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers.ratelimit).toMatch(`limit=${process.env.RATE_LIMIT_MAX},`)
  })

  it('rota inexistente: 404 em JSON', async () => {
    const res = await request(app).get('/api/nao-existe')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Rota não encontrada.')
  })

  it('JSON malformado: 400', async () => {
    const res = await request(app)
      .post('/api/finance')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send('{"salary": ')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('JSON inválido no corpo da requisição.')
  })

  it('corpo maior que 10 kB: 413', async () => {
    const res = await request(app)
      .post('/api/finance')
      .set(AUTH)
      .send({ month: 10, year: 2026, salary: 1, lixo: 'x'.repeat(11 * 1024) })
    expect(res.status).toBe(413)
  })

  it('erro inesperado: 500 com o detalhe em desenvolvimento', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    financeService.listAllFinances.mockRejectedValue(new Error('relation "x" does not exist'))

    const res = await request(app).get('/api/finance').set(AUTH)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Erro interno do servidor.', detail: 'relation "x" does not exist' })
  })

  it('erro inesperado em produção: 500 sem detalhe técnico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.NODE_ENV = 'production'
    financeService.listAllFinances.mockRejectedValue(new Error('relation "x" does not exist'))

    const res = await request(app).get('/api/finance').set(AUTH)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Erro interno do servidor.' })
  })
})
