import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import * as categoryService from '../../src/services/categoryService.js'
import * as budgetService from '../../src/services/budgetService.js'
import * as expenseService from '../../src/services/expenseService.js'
import { ValidationError } from '../../src/utils/validators.js'
import { USER, AUTH, CATEGORY_ID, BUDGET_ID } from '../helpers/constants.js'

vi.mock('../../src/services/categoryService.js')
vi.mock('../../src/services/budgetService.js')
vi.mock('../../src/services/expenseService.js')

describe('categorias', () => {
  it('GET lista as categorias do usuário', async () => {
    categoryService.listCategories.mockResolvedValue([{ id: CATEGORY_ID, name: 'Lazer' }])
    const res = await request(app).get('/api/categories').set(AUTH)
    expect(res.body).toEqual({ categories: [{ id: CATEGORY_ID, name: 'Lazer' }] })
    expect(categoryService.listCategories).toHaveBeenCalledWith(expect.anything(), USER.id)
  })

  it('POST cria com nome limpo e descrição vazia virando null', async () => {
    categoryService.createCategory.mockResolvedValue({ id: CATEGORY_ID })
    const res = await request(app).post('/api/categories').set(AUTH).send({ name: ' Pets ', description: ' ' })
    expect(res.status).toBe(201)
    expect(categoryService.createCategory).toHaveBeenCalledWith(expect.anything(), USER.id, {
      name: 'Pets',
      description: null,
    })
  })

  it.each([
    [{}, 'Nome é obrigatório'],
    [{ name: 'a'.repeat(61) }, 'máximo de 60'],
    [{ name: 'Pets', description: 'a'.repeat(201) }, 'máximo de 200'],
  ])('POST recusa %j', async (body, message) => {
    const res = await request(app).post('/api/categories').set(AUTH).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(message)
  })

  it('POST com nome repetido: 400 com a mensagem do serviço', async () => {
    categoryService.createCategory.mockRejectedValue(new ValidationError('Já existe uma categoria com esse nome.'))
    const res = await request(app).post('/api/categories').set(AUTH).send({ name: 'Lazer' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Já existe uma categoria com esse nome.')
  })

  it('PUT atualiza só a descrição quando só ela vem', async () => {
    categoryService.updateCategory.mockResolvedValue({ id: CATEGORY_ID })
    await request(app).put(`/api/categories/${CATEGORY_ID}`).set(AUTH).send({ description: 'Cinema' })
    expect(categoryService.updateCategory).toHaveBeenCalledWith(expect.anything(), USER.id, CATEGORY_ID, {
      description: 'Cinema',
    })
  })

  it('PUT de categoria inexistente: 404', async () => {
    categoryService.updateCategory.mockResolvedValue(null)
    const res = await request(app).put(`/api/categories/${CATEGORY_ID}`).set(AUTH).send({ name: 'X' })
    expect(res.status).toBe(404)
  })

  it('DELETE de categoria com gastos: 400', async () => {
    categoryService.deleteCategory.mockRejectedValue(
      new ValidationError('Não é possível excluir: existem gastos nessa categoria.')
    )
    const res = await request(app).delete(`/api/categories/${CATEGORY_ID}`).set(AUTH)
    expect(res.status).toBe(400)
  })

  it('DELETE: 204 / 404', async () => {
    categoryService.deleteCategory.mockResolvedValueOnce({ id: CATEGORY_ID }).mockResolvedValueOnce(null)
    expect((await request(app).delete(`/api/categories/${CATEGORY_ID}`).set(AUTH)).status).toBe(204)
    expect((await request(app).delete(`/api/categories/${CATEGORY_ID}`).set(AUTH)).status).toBe(404)
  })
})

describe('caixinhas', () => {
  it('GET junta o quanto já foi gasto em cada categoria no mês', async () => {
    budgetService.listBudgets.mockResolvedValue([
      { id: 'b1', category_id: 'c1', limit_amount: '500.00' },
      { id: 'b2', category_id: 'c2', limit_amount: '100.00' },
    ])
    expenseService.sumByCategory.mockResolvedValue({ c1: 120.335 })

    const res = await request(app).get('/api/budgets?month=2&year=2028').set(AUTH)
    expect(res.body.budgets.map((b) => b.spent)).toEqual([120.34, 0])
    expect(expenseService.sumByCategory).toHaveBeenCalledWith(expect.anything(), USER.id, {
      min: '2028-02-01',
      max: '2028-02-29',
    })
  })

  it('POST cria a caixinha', async () => {
    categoryService.getCategoryById.mockResolvedValue({ id: CATEGORY_ID })
    budgetService.createBudget.mockResolvedValue({ id: BUDGET_ID })
    const res = await request(app)
      .post('/api/budgets')
      .set(AUTH)
      .send({ category_id: CATEGORY_ID, month: 10, year: 2026, limit_amount: '300' })

    expect(res.status).toBe(201)
    expect(budgetService.createBudget).toHaveBeenCalledWith(expect.anything(), USER.id, {
      category_id: CATEGORY_ID,
      month: 10,
      year: 2026,
      limit_amount: 300,
    })
  })

  it('POST com categoria de outra pessoa: 400, sem criar', async () => {
    categoryService.getCategoryById.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/budgets')
      .set(AUTH)
      .send({ category_id: CATEGORY_ID, month: 10, year: 2026, limit_amount: 300 })
    expect(res.status).toBe(400)
    expect(budgetService.createBudget).not.toHaveBeenCalled()
  })

  it('PUT altera o limite; inexistente: 404', async () => {
    budgetService.updateBudget.mockResolvedValueOnce({ id: BUDGET_ID }).mockResolvedValueOnce(null)
    const ok = await request(app).put(`/api/budgets/${BUDGET_ID}`).set(AUTH).send({ limit_amount: 50 })
    expect(ok.status).toBe(200)
    expect(budgetService.updateBudget).toHaveBeenCalledWith(expect.anything(), USER.id, BUDGET_ID, 50)

    const missing = await request(app).put(`/api/budgets/${BUDGET_ID}`).set(AUTH).send({ limit_amount: 50 })
    expect(missing.status).toBe(404)
  })

  it('DELETE: 204 / 404', async () => {
    budgetService.deleteBudget.mockResolvedValueOnce({ id: BUDGET_ID }).mockResolvedValueOnce(null)
    expect((await request(app).delete(`/api/budgets/${BUDGET_ID}`).set(AUTH)).status).toBe(204)
    expect((await request(app).delete(`/api/budgets/${BUDGET_ID}`).set(AUTH)).status).toBe(404)
  })
})
