import { describe, it, expect } from 'vitest'
import { fakeSupabase, eqFilters } from '../helpers/fakeSupabase.js'
import { USER, CATEGORY_ID, FINANCE_ID, EXPENSE_ID, BUDGET_ID } from '../helpers/constants.js'
import { ValidationError } from '../../src/utils/validators.js'
import * as categoryService from '../../src/services/categoryService.js'
import * as expenseService from '../../src/services/expenseService.js'
import * as financeService from '../../src/services/financeService.js'
import * as budgetService from '../../src/services/budgetService.js'

const pgError = (code, message = 'erro do banco') => ({ code, message })

// Toda consulta filtra pelo dono, além do RLS (segunda camada de proteção).
describe('todas as consultas filtram por user_id', () => {
  let fake

  const cases = [
    ['categories.list', () => categoryService.listCategories, [], { data: [] }],
    ['categories.get', () => categoryService.getCategoryById, [CATEGORY_ID]],
    ['categories.update', () => categoryService.updateCategory, [CATEGORY_ID, { name: 'X' }]],
    ['categories.delete', () => categoryService.deleteCategory, [CATEGORY_ID]],
    ['expenses.list', () => expenseService.listExpenses, [FINANCE_ID], { data: [] }],
    ['expenses.get', () => expenseService.getExpenseById, [EXPENSE_ID]],
    ['expenses.update', () => expenseService.updateExpense, [EXPENSE_ID, { amount: 1 }]],
    ['expenses.delete', () => expenseService.deleteExpense, [EXPENSE_ID]],
    ['expenses.sumByMonth', () => expenseService.sumByMonthlyFinance, [], { data: [] }],
    ['expenses.sumByCategory', () => expenseService.sumByCategory, [{ min: 'a', max: 'b' }], { data: [] }],
    ['finances.list', () => financeService.listAllFinances, [], { data: [] }],
    ['finances.get', () => financeService.getFinanceByMonth, [10, 2026]],
    ['finances.update', () => financeService.updateSalary, [FINANCE_ID, 100]],
    ['budgets.list', () => budgetService.listBudgets, [10, 2026], { data: [] }],
    ['budgets.update', () => budgetService.updateBudget, [BUDGET_ID, 100]],
    ['budgets.delete', () => budgetService.deleteBudget, [BUDGET_ID]],
  ]

  it.each(cases)('%s', async (_name, getFn, args, result = { data: null, error: null }) => {
    const { client, queries } = fakeSupabase(result)
    await getFn()(client, USER.id, ...args)
    expect(eqFilters(queries[0]).user_id).toBe(USER.id)
  })

  it.each([
    ['categories', () => categoryService.createCategory(fake.client, USER.id, { name: 'X', user_id: 'outro' })],
    ['expenses', () => expenseService.createExpense(fake.client, USER.id, { amount: 1, user_id: 'outro' })],
    ['budgets', () => budgetService.createBudget(fake.client, USER.id, { limit_amount: 1, user_id: 'outro' })],
  ])('insert em %s grava o user_id do login, nunca o enviado', async (_table, run) => {
    fake = fakeSupabase({ data: {}, error: null })
    await run()
    const [, row] = fake.queries[0].calls.find(([m]) => m === 'insert')
    expect(row.user_id).toBe(USER.id)
  })
})

describe('categoryService', () => {
  it('ordena as categorias em português (acentos no lugar certo)', async () => {
    const { client } = fakeSupabase({
      data: [{ name: 'Transporte' }, { name: 'Saúde' }, { name: 'Alimentação' }, { name: 'Educação' }],
      error: null,
    })
    const names = (await categoryService.listCategories(client, USER.id)).map((c) => c.name)
    expect(names).toEqual(['Alimentação', 'Educação', 'Saúde', 'Transporte'])
  })

  it('nome repetido (23505) vira mensagem amigável', async () => {
    const { client } = fakeSupabase({ data: null, error: pgError('23505') })
    await expect(categoryService.createCategory(client, USER.id, { name: 'Lazer' })).rejects.toThrow(
      new ValidationError('Já existe uma categoria com esse nome.')
    )
  })

  it.each(['23503', '23001'])('excluir categoria com gastos (%s) vira mensagem amigável', async (code) => {
    const { client } = fakeSupabase({ data: null, error: pgError(code) })
    await expect(categoryService.deleteCategory(client, USER.id, CATEGORY_ID)).rejects.toThrow(
      'Não é possível excluir: existem gastos nessa categoria.'
    )
  })

  it('outros erros do banco passam adiante sem tradução', async () => {
    const error = pgError('42P01', 'relation does not exist')
    const { client } = fakeSupabase({ data: null, error })
    await expect(categoryService.listCategories(client, USER.id)).rejects.toBe(error)
  })
})

describe('expenseService: somas', () => {
  it('soma por mês, convertendo o numeric (que chega como texto)', async () => {
    const { client } = fakeSupabase({
      data: [
        { monthly_finance_id: 'm1', amount: '10.10' },
        { monthly_finance_id: 'm1', amount: 20.2 },
        { monthly_finance_id: 'm2', amount: '5' },
      ],
      error: null,
    })
    const totals = await expenseService.sumByMonthlyFinance(client, USER.id)
    expect(totals.m1).toBeCloseTo(30.3, 10)
    expect(totals.m2).toBe(5)
  })

  it('soma por categoria só dentro do intervalo de datas pedido', async () => {
    const { client, queries } = fakeSupabase({
      data: [
        { category_id: 'c1', amount: '100' },
        { category_id: 'c1', amount: '50.5' },
        { category_id: 'c2', amount: '7' },
      ],
      error: null,
    })
    const totals = await expenseService.sumByCategory(client, USER.id, { min: '2026-10-01', max: '2026-10-31' })
    expect(totals).toEqual({ c1: 150.5, c2: 7 })
    expect(queries[0].calls).toContainEqual(['gte', 'expense_date', '2026-10-01'])
    expect(queries[0].calls).toContainEqual(['lte', 'expense_date', '2026-10-31'])
  })

  it('sem gastos, devolve objeto vazio', async () => {
    const { client } = fakeSupabase({ data: [], error: null })
    expect(await expenseService.sumByMonthlyFinance(client, USER.id)).toEqual({})
  })
})

describe('financeService.getOrCreateFinance', () => {
  const finance = { id: FINANCE_ID, month: 10, year: 2026, salary: 0 }

  it('devolve o mês que já existe sem criar nada', async () => {
    const { client, queries } = fakeSupabase({ data: finance, error: null })
    expect(await financeService.getOrCreateFinance(client, USER.id, 10, 2026)).toBe(finance)
    expect(queries).toHaveLength(1)
  })

  it('cria o mês com salário 0 quando ainda não existe', async () => {
    const { client, queries } = fakeSupabase({ data: null, error: null }, { data: finance, error: null })
    expect(await financeService.getOrCreateFinance(client, USER.id, 10, 2026)).toBe(finance)
    const [, row] = queries[1].calls.find(([m]) => m === 'insert')
    expect(row).toEqual({ user_id: USER.id, month: 10, year: 2026, salary: 0 })
  })

  it('se outra requisição criou o mês ao mesmo tempo (23505), busca o registro dela', async () => {
    const { client, queries } = fakeSupabase(
      { data: null, error: null },
      { data: null, error: pgError('23505') },
      { data: finance, error: null }
    )
    expect(await financeService.getOrCreateFinance(client, USER.id, 10, 2026)).toBe(finance)
    expect(queries).toHaveLength(3)
  })

  it('outros erros na criação passam adiante', async () => {
    const error = pgError('42501', 'permission denied')
    const { client } = fakeSupabase({ data: null, error: null }, { data: null, error })
    await expect(financeService.getOrCreateFinance(client, USER.id, 10, 2026)).rejects.toBe(error)
  })
})

describe('budgetService', () => {
  it('ordena as caixinhas pelo nome da categoria, em português', async () => {
    const { client } = fakeSupabase({
      data: [{ category: { name: 'Saúde' } }, { category: { name: 'Lazer' } }, { category: { name: 'Água' } }],
      error: null,
    })
    const names = (await budgetService.listBudgets(client, USER.id, 10, 2026)).map((b) => b.category.name)
    expect(names).toEqual(['Água', 'Lazer', 'Saúde'])
  })

  it('caixinha repetida no mês (23505) vira mensagem amigável', async () => {
    const { client } = fakeSupabase({ data: null, error: pgError('23505') })
    await expect(
      budgetService.createBudget(client, USER.id, { category_id: CATEGORY_ID, month: 10, year: 2026, limit_amount: 1 })
    ).rejects.toThrow('Já existe uma caixinha para essa categoria neste mês.')
  })

  it('update só altera o limite', async () => {
    const { client, queries } = fakeSupabase({ data: {}, error: null })
    await budgetService.updateBudget(client, USER.id, BUDGET_ID, 300)
    expect(queries[0].calls).toContainEqual(['update', { limit_amount: 300 }])
  })
})
