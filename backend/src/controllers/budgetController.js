import * as budgetService from '../services/budgetService.js'
import * as categoryService from '../services/categoryService.js'
import * as expenseService from '../services/expenseService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { currentMonthYear, monthRange } from '../utils/date.js'
import { ValidationError, parseMonth, parseYear, parseMoney, parseUuid } from '../utils/validators.js'

// A categoria precisa ser do próprio usuário. O banco só confere que ela
// existe (chaves estrangeiras ignoram o RLS), então a checagem é feita aqui.
async function assertOwnCategory(req, categoryId) {
  const category = await categoryService.getCategoryById(req.supabase, req.user.id, categoryId)
  if (!category) {
    throw new ValidationError('Categoria inválida.')
  }
}

// GET /api/budgets?month=10&year=2026  (sem parâmetros: mês atual)
// Cada caixinha vem com `spent`: quanto já foi gasto na categoria naquele mês.
export const list = asyncHandler(async (req, res) => {
  let { month, year } = currentMonthYear()

  const { month: queryMonth, year: queryYear } = req.query
  if (queryMonth !== undefined || queryYear !== undefined) {
    if (queryMonth === undefined || queryYear === undefined) {
      throw new ValidationError('Informe month e year juntos (ou nenhum, para o mês atual).')
    }
    month = parseMonth(queryMonth)
    year = parseYear(queryYear)
  }

  const budgets = await budgetService.listBudgets(req.supabase, req.user.id, month, year)
  const spentByCategory = await expenseService.sumByCategory(
    req.supabase,
    req.user.id,
    monthRange(month, year)
  )

  const withSpent = budgets.map((budget) => ({
    ...budget,
    spent: Math.round((spentByCategory[budget.category_id] ?? 0) * 100) / 100,
  }))

  res.json({ month, year, budgets: withSpent })
})

// POST /api/budgets  { category_id, month, year, limit_amount }
export const create = asyncHandler(async (req, res) => {
  const category_id = parseUuid(req.body?.category_id, 'Categoria inválida.')
  const month = parseMonth(req.body?.month)
  const year = parseYear(req.body?.year)
  const limit_amount = parseMoney(req.body?.limit_amount, 'Limite')

  await assertOwnCategory(req, category_id)

  const budget = await budgetService.createBudget(req.supabase, req.user.id, {
    category_id,
    month,
    year,
    limit_amount,
  })
  res.status(201).json({ budget })
})

// PUT /api/budgets/:id  { limit_amount }
export const update = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)
  const limit_amount = parseMoney(req.body?.limit_amount, 'Limite')

  const budget = await budgetService.updateBudget(req.supabase, req.user.id, id, limit_amount)
  if (!budget) {
    return res.status(404).json({ error: 'Caixinha não encontrada.' })
  }
  res.json({ budget })
})

// DELETE /api/budgets/:id
export const remove = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)

  const deleted = await budgetService.deleteBudget(req.supabase, req.user.id, id)
  if (!deleted) {
    return res.status(404).json({ error: 'Caixinha não encontrada.' })
  }
  res.status(204).end()
})
