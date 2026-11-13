import * as expenseService from '../services/expenseService.js'
import * as categoryService from '../services/categoryService.js'
import * as financeService from '../services/financeService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { currentMonthYear } from '../utils/date.js'
import {
  ValidationError,
  parseMonth,
  parseYear,
  parseMoney,
  parseUuid,
  parseText,
  parseExpenseType,
  parseDate,
} from '../utils/validators.js'

// Lê e valida os campos do gasto.
// - criação (partial: false): todos os campos obrigatórios precisam vir
// - edição (partial: true): só valida o que foi enviado
// Campos desconhecidos (user_id, monthly_finance_id...) são ignorados: quem
// define dono e mês do gasto é o servidor, nunca o cliente.
function parseExpenseFields(body = {}, { partial }) {
  const fields = {}
  const sent = (key) => body[key] !== undefined
  let date = null

  if (!partial || sent('description')) {
    fields.description = parseText(body.description, 'Descrição', { max: 120 })
  }
  if (!partial || sent('amount')) {
    fields.amount = parseMoney(body.amount, 'Valor', { allowZero: false })
  }
  if (!partial || sent('category_id')) {
    fields.category_id = parseUuid(body.category_id, 'Categoria inválida.')
  }
  if (!partial || sent('type')) {
    fields.type = parseExpenseType(body.type)
  }
  if (!partial || sent('expense_date')) {
    date = parseDate(body.expense_date, 'Data')
    fields.expense_date = date.iso
  }
  if (!partial || sent('notes')) {
    fields.notes = parseText(body.notes, 'Observação', { max: 500, required: false })
  }

  if (partial && Object.keys(fields).length === 0) {
    throw new ValidationError('Informe ao menos um campo para atualizar.')
  }
  return { fields, date }
}

// A categoria precisa ser do próprio usuário. O banco só confere que ela
// existe (chaves estrangeiras ignoram o RLS), então a checagem é feita aqui.
async function assertOwnCategory(req, categoryId) {
  const category = await categoryService.getCategoryById(req.supabase, req.user.id, categoryId)
  if (!category) {
    throw new ValidationError('Categoria inválida.')
  }
}

// GET /api/expenses?month=10&year=2026  (sem parâmetros: mês atual)
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

  const finance = await financeService.getFinanceByMonth(req.supabase, req.user.id, month, year)
  // Mês sem registro = mês sem gastos. Listar não cria nada.
  const expenses = finance
    ? await expenseService.listExpenses(req.supabase, req.user.id, finance.id)
    : []

  res.json({ month, year, expenses })
})

// POST /api/expenses
export const create = asyncHandler(async (req, res) => {
  const { fields, date } = parseExpenseFields(req.body, { partial: false })
  await assertOwnCategory(req, fields.category_id)

  // O gasto pertence ao mês da sua data; se o mês ainda não existe, nasce com salário 0.
  const finance = await financeService.getOrCreateFinance(
    req.supabase,
    req.user.id,
    date.month,
    date.year
  )

  const expense = await expenseService.createExpense(req.supabase, req.user.id, {
    ...fields,
    monthly_finance_id: finance.id,
  })
  res.status(201).json({ expense })
})

// PUT /api/expenses/:id  (atualiza só os campos enviados)
export const update = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)
  const { fields, date } = parseExpenseFields(req.body, { partial: true })

  // Confere que o gasto existe ANTES de mexer em qualquer outra coisa
  // (senão um id inventado ainda criaria um registro de mês vazio).
  const existing = await expenseService.getExpenseById(req.supabase, req.user.id, id)
  if (!existing) {
    return res.status(404).json({ error: 'Gasto não encontrado.' })
  }

  if (fields.category_id) {
    await assertOwnCategory(req, fields.category_id)
  }

  // Mudar a data para outro mês move o gasto para o registro daquele mês.
  if (date) {
    const finance = await financeService.getOrCreateFinance(
      req.supabase,
      req.user.id,
      date.month,
      date.year
    )
    fields.monthly_finance_id = finance.id
  }

  const expense = await expenseService.updateExpense(req.supabase, req.user.id, id, fields)
  if (!expense) {
    return res.status(404).json({ error: 'Gasto não encontrado.' })
  }
  res.json({ expense })
})

// DELETE /api/expenses/:id
export const remove = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)

  const deleted = await expenseService.deleteExpense(req.supabase, req.user.id, id)
  if (!deleted) {
    return res.status(404).json({ error: 'Gasto não encontrado.' })
  }
  res.status(204).end()
})
