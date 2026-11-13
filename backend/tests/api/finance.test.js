import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import * as financeService from '../../src/services/financeService.js'
import * as expenseService from '../../src/services/expenseService.js'
import { USER, AUTH, FINANCE_ID } from '../helpers/constants.js'

vi.mock('../../src/services/financeService.js')
vi.mock('../../src/services/expenseService.js')

describe('GET /api/finance (histórico)', () => {
  it('junta o total gasto de cada mês, arredondado em centavos', async () => {
    financeService.listAllFinances.mockResolvedValue([
      { id: 'm2', month: 11, year: 2026, salary: '5000.00' },
      { id: 'm1', month: 10, year: 2026, salary: '4000.00' },
    ])
    expenseService.sumByMonthlyFinance.mockResolvedValue({ m1: 0.1 + 0.2 })

    const res = await request(app).get('/api/finance').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.history).toEqual([
      { id: 'm2', month: 11, year: 2026, salary: '5000.00', totalSpent: 0 },
      { id: 'm1', month: 10, year: 2026, salary: '4000.00', totalSpent: 0.3 },
    ])
    expect(financeService.listAllFinances).toHaveBeenCalledWith(expect.anything(), USER.id)
  })
})

describe('GET /api/finance/current', () => {
  it('busca o mês atual do usuário logado', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 7, 12))
    financeService.getFinanceByMonth.mockResolvedValue(null)

    const res = await request(app).get('/api/finance/current').set(AUTH)
    vi.useRealTimers()

    expect(res.body).toEqual({ month: 11, year: 2026, finance: null })
    expect(financeService.getFinanceByMonth).toHaveBeenCalledWith(expect.anything(), USER.id, 11, 2026)
  })
})

describe('GET /api/finance/:year/:month', () => {
  it('valida ano e mês da URL', async () => {
    expect((await request(app).get('/api/finance/2026/13').set(AUTH)).status).toBe(400)
    expect((await request(app).get('/api/finance/1999/1').set(AUTH)).status).toBe(400)
  })

  it('devolve o registro do mês', async () => {
    financeService.getFinanceByMonth.mockResolvedValue({ id: FINANCE_ID, salary: '3000.00' })
    const res = await request(app).get('/api/finance/2026/10').set(AUTH)
    expect(res.body).toEqual({ month: 10, year: 2026, finance: { id: FINANCE_ID, salary: '3000.00' } })
  })
})

describe('POST /api/finance', () => {
  it('cria o salário do mês', async () => {
    financeService.createFinance.mockResolvedValue({ id: FINANCE_ID })
    const res = await request(app).post('/api/finance').set(AUTH).send({ month: 10, year: 2026, salary: '4500.555' })

    expect(res.status).toBe(201)
    expect(financeService.createFinance).toHaveBeenCalledWith(expect.anything(), USER.id, {
      month: 10,
      year: 2026,
      salary: 4500.56,
    })
  })

  it.each([
    [{ year: 2026, salary: 1 }, 'Mês inválido'],
    [{ month: 10, salary: 1 }, 'Ano inválido'],
    [{ month: 10, year: 2026 }, 'Salário inválido'],
    [{ month: 10, year: 2026, salary: -1 }, 'Salário inválido'],
    [{ month: 10, year: 2026, salary: '1.200,00' }, 'Salário inválido'],
  ])('recusa %j', async (body, message) => {
    const res = await request(app).post('/api/finance').set(AUTH).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(message)
    expect(financeService.createFinance).not.toHaveBeenCalled()
  })

  it('mês já cadastrado: 409', async () => {
    financeService.createFinance.mockRejectedValue({ code: '23505' })
    const res = await request(app).post('/api/finance').set(AUTH).send({ month: 10, year: 2026, salary: 1 })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/Já existe um salário/)
  })
})

describe('PUT /api/finance/:id', () => {
  it('atualiza só o salário', async () => {
    financeService.updateSalary.mockResolvedValue({ id: FINANCE_ID, salary: 10 })
    const res = await request(app).put(`/api/finance/${FINANCE_ID}`).set(AUTH).send({ salary: 10, month: 1 })
    expect(res.status).toBe(200)
    expect(financeService.updateSalary).toHaveBeenCalledWith(expect.anything(), USER.id, FINANCE_ID, 10)
  })

  it('id inválido: 400', async () => {
    const res = await request(app).put('/api/finance/abc').set(AUTH).send({ salary: 10 })
    expect(res.status).toBe(400)
  })

  it('registro de outra pessoa (ou inexistente): 404', async () => {
    financeService.updateSalary.mockResolvedValue(null)
    const res = await request(app).put(`/api/finance/${FINANCE_ID}`).set(AUTH).send({ salary: 10 })
    expect(res.status).toBe(404)
  })
})
