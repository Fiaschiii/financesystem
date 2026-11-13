import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import * as expenseService from '../../src/services/expenseService.js'
import * as categoryService from '../../src/services/categoryService.js'
import * as financeService from '../../src/services/financeService.js'
import { USER, AUTH, CATEGORY_ID, FINANCE_ID, EXPENSE_ID } from '../helpers/constants.js'

vi.mock('../../src/services/expenseService.js')
vi.mock('../../src/services/categoryService.js')
vi.mock('../../src/services/financeService.js')

const validExpense = {
  description: '  Mercado  ',
  amount: '250.40',
  category_id: CATEGORY_ID,
  type: 'variavel',
  expense_date: '2026-10-05',
  notes: '',
}

beforeEach(() => {
  categoryService.getCategoryById.mockResolvedValue({ id: CATEGORY_ID })
  financeService.getOrCreateFinance.mockResolvedValue({ id: FINANCE_ID })
})

describe('GET /api/expenses', () => {
  it('mês sem registro: lista vazia, sem criar nada', async () => {
    financeService.getFinanceByMonth.mockResolvedValue(null)
    const res = await request(app).get('/api/expenses?month=10&year=2026').set(AUTH)

    expect(res.body).toEqual({ month: 10, year: 2026, expenses: [] })
    expect(expenseService.listExpenses).not.toHaveBeenCalled()
    expect(financeService.getOrCreateFinance).not.toHaveBeenCalled()
  })

  it('lista os gastos do mês pedido', async () => {
    financeService.getFinanceByMonth.mockResolvedValue({ id: FINANCE_ID })
    expenseService.listExpenses.mockResolvedValue([{ id: EXPENSE_ID }])
    const res = await request(app).get('/api/expenses?month=10&year=2026').set(AUTH)

    expect(res.body.expenses).toEqual([{ id: EXPENSE_ID }])
    expect(expenseService.listExpenses).toHaveBeenCalledWith(expect.anything(), USER.id, FINANCE_ID)
  })

  it('month sem year: 400', async () => {
    const res = await request(app).get('/api/expenses?month=10').set(AUTH)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/month e year juntos/)
  })
})

describe('POST /api/expenses', () => {
  it('cria o gasto no mês da data, com campos limpos', async () => {
    expenseService.createExpense.mockResolvedValue({ id: EXPENSE_ID })
    const res = await request(app).post('/api/expenses').set(AUTH).send(validExpense)

    expect(res.status).toBe(201)
    expect(financeService.getOrCreateFinance).toHaveBeenCalledWith(expect.anything(), USER.id, 10, 2026)
    expect(expenseService.createExpense).toHaveBeenCalledWith(expect.anything(), USER.id, {
      description: 'Mercado',
      amount: 250.4,
      category_id: CATEGORY_ID,
      type: 'variavel',
      expense_date: '2026-10-05',
      notes: null,
      monthly_finance_id: FINANCE_ID,
    })
  })

  it('ignora user_id e monthly_finance_id enviados pelo cliente', async () => {
    expenseService.createExpense.mockResolvedValue({ id: EXPENSE_ID })
    await request(app)
      .post('/api/expenses')
      .set(AUTH)
      .send({ ...validExpense, user_id: 'outra-pessoa', monthly_finance_id: 'mes-de-outra-pessoa' })

    const [, userId, values] = expenseService.createExpense.mock.calls[0]
    expect(userId).toBe(USER.id)
    expect(values.monthly_finance_id).toBe(FINANCE_ID)
    expect(values).not.toHaveProperty('user_id')
  })

  it('categoria de outra pessoa (ou inexistente): 400, sem criar nada', async () => {
    categoryService.getCategoryById.mockResolvedValue(null)
    const res = await request(app).post('/api/expenses').set(AUTH).send(validExpense)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Categoria inválida.')
    expect(financeService.getOrCreateFinance).not.toHaveBeenCalled()
    expect(expenseService.createExpense).not.toHaveBeenCalled()
  })

  it.each([
    ['description', '', 'Descrição é obrigatório'],
    ['description', 'a'.repeat(121), 'máximo de 120'],
    ['amount', 0, 'maior que zero'],
    ['amount', '-5', 'Valor inválido'],
    ['category_id', 'abc', 'Categoria inválida'],
    ['type', 'outro', 'Tipo inválido'],
    ['expense_date', '2026-02-30', 'não existe'],
    ['notes', 'a'.repeat(501), 'máximo de 500'],
  ])('%s = %j: 400', async (field, value, message) => {
    const res = await request(app).post('/api/expenses').set(AUTH).send({ ...validExpense, [field]: value })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(message)
    expect(expenseService.createExpense).not.toHaveBeenCalled()
  })
})

describe('PUT /api/expenses/:id', () => {
  it('gasto inexistente: 404, sem criar mês vazio', async () => {
    expenseService.getExpenseById.mockResolvedValue(null)
    const res = await request(app).put(`/api/expenses/${EXPENSE_ID}`).set(AUTH).send({ expense_date: '2026-12-01' })

    expect(res.status).toBe(404)
    expect(financeService.getOrCreateFinance).not.toHaveBeenCalled()
  })

  it('mudar a data para outro mês move o gasto para aquele mês', async () => {
    expenseService.getExpenseById.mockResolvedValue({ id: EXPENSE_ID })
    expenseService.updateExpense.mockResolvedValue({ id: EXPENSE_ID })
    financeService.getOrCreateFinance.mockResolvedValue({ id: 'mes-de-dezembro' })

    const res = await request(app).put(`/api/expenses/${EXPENSE_ID}`).set(AUTH).send({ expense_date: '2026-12-01' })
    expect(res.status).toBe(200)
    expect(financeService.getOrCreateFinance).toHaveBeenCalledWith(expect.anything(), USER.id, 12, 2026)
    expect(expenseService.updateExpense).toHaveBeenCalledWith(expect.anything(), USER.id, EXPENSE_ID, {
      expense_date: '2026-12-01',
      monthly_finance_id: 'mes-de-dezembro',
    })
  })

  it('atualiza só os campos enviados', async () => {
    expenseService.getExpenseById.mockResolvedValue({ id: EXPENSE_ID })
    expenseService.updateExpense.mockResolvedValue({ id: EXPENSE_ID })

    await request(app).put(`/api/expenses/${EXPENSE_ID}`).set(AUTH).send({ amount: 10 })
    expect(expenseService.updateExpense).toHaveBeenCalledWith(expect.anything(), USER.id, EXPENSE_ID, { amount: 10 })
    expect(categoryService.getCategoryById).not.toHaveBeenCalled()
  })

  it('trocar para categoria de outra pessoa: 400', async () => {
    expenseService.getExpenseById.mockResolvedValue({ id: EXPENSE_ID })
    categoryService.getCategoryById.mockResolvedValue(null)

    const res = await request(app).put(`/api/expenses/${EXPENSE_ID}`).set(AUTH).send({ category_id: CATEGORY_ID })
    expect(res.status).toBe(400)
    expect(expenseService.updateExpense).not.toHaveBeenCalled()
  })

  it('corpo vazio: 400', async () => {
    const res = await request(app).put(`/api/expenses/${EXPENSE_ID}`).set(AUTH).send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Informe ao menos um campo para atualizar.')
  })
})

describe('DELETE /api/expenses/:id', () => {
  it('apaga: 204', async () => {
    expenseService.deleteExpense.mockResolvedValue({ id: EXPENSE_ID })
    const res = await request(app).delete(`/api/expenses/${EXPENSE_ID}`).set(AUTH)
    expect(res.status).toBe(204)
    expect(expenseService.deleteExpense).toHaveBeenCalledWith(expect.anything(), USER.id, EXPENSE_ID)
  })

  it('inexistente ou de outra pessoa: 404', async () => {
    expenseService.deleteExpense.mockResolvedValue(null)
    expect((await request(app).delete(`/api/expenses/${EXPENSE_ID}`).set(AUTH)).status).toBe(404)
  })
})
