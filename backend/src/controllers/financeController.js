import * as financeService from '../services/financeService.js'
import * as expenseService from '../services/expenseService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { currentMonthYear } from '../utils/date.js'
import { parseMonth, parseYear, parseMoney, parseUuid } from '../utils/validators.js'

// GET /api/finance  (todos os meses já cadastrados, para o Histórico)
export const listAll = asyncHandler(async (req, res) => {
  const finances = await financeService.listAllFinances(req.supabase, req.user.id)
  const spentByMonth = await expenseService.sumByMonthlyFinance(req.supabase, req.user.id)

  const history = finances.map((finance) => ({
    ...finance,
    totalSpent: Math.round((spentByMonth[finance.id] ?? 0) * 100) / 100,
  }))

  res.json({ history })
})

// GET /api/finance/current
export const getCurrent = asyncHandler(async (req, res) => {
  const { month, year } = currentMonthYear()
  const finance = await financeService.getFinanceByMonth(req.supabase, req.user.id, month, year)
  res.json({ month, year, finance })
})

// GET /api/finance/:year/:month
export const getByMonth = asyncHandler(async (req, res) => {
  const year = parseYear(req.params.year)
  const month = parseMonth(req.params.month)
  const finance = await financeService.getFinanceByMonth(req.supabase, req.user.id, month, year)
  res.json({ month, year, finance })
})

// POST /api/finance  { month, year, salary }
export const create = asyncHandler(async (req, res) => {
  const month = parseMonth(req.body?.month)
  const year = parseYear(req.body?.year)
  const salary = parseMoney(req.body?.salary, 'Salário')

  try {
    const finance = await financeService.createFinance(req.supabase, req.user.id, {
      month,
      year,
      salary,
    })
    res.status(201).json({ finance })
  } catch (error) {
    // 23505 = violação de unicidade (usuário + mês + ano já cadastrados)
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'Já existe um salário cadastrado para este mês. Recarregue a página para editá-lo.',
      })
    }
    throw error
  }
})

// PUT /api/finance/:id  { salary }
export const update = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)
  const salary = parseMoney(req.body?.salary, 'Salário')

  const finance = await financeService.updateSalary(req.supabase, req.user.id, id, salary)

  if (!finance) {
    return res.status(404).json({ error: 'Registro não encontrado.' })
  }
  res.json({ finance })
})
