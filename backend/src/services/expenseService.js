// Acesso ao banco para a tabela expenses. Como nos outros serviços, recebe o
// cliente da requisição (já autenticado como o usuário), então o RLS vale.

// Traz a categoria junto, pra a tela não precisar cruzar os dados.
const SELECT = '*, category:categories(id, name)'

export async function listExpenses(supabase, userId, monthlyFinanceId) {
  const { data, error } = await supabase
    .from('expenses')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('monthly_finance_id', monthlyFinanceId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getExpenseById(supabase, userId, id) {
  const { data, error } = await supabase
    .from('expenses')
    .select(SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createExpense(supabase, userId, values) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...values, user_id: userId })
    .select(SELECT)
    .single()

  if (error) throw error
  return data
}

export async function updateExpense(supabase, userId, id, values) {
  const { data, error } = await supabase
    .from('expenses')
    .update(values)
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT)
    .maybeSingle()

  if (error) throw error
  return data // null se não existe (ou não é do usuário)
}

// Soma dos gastos por mês (monthly_finance_id), para o Histórico.
export async function sumByMonthlyFinance(supabase, userId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('monthly_finance_id, amount')
    .eq('user_id', userId)

  if (error) throw error

  const totals = {}
  for (const { monthly_finance_id, amount } of data) {
    totals[monthly_finance_id] = (totals[monthly_finance_id] ?? 0) + Number(amount)
  }
  return totals
}

// Soma dos gastos por categoria num intervalo de datas (para as caixinhas).
export async function sumByCategory(supabase, userId, dateRange) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category_id, amount')
    .eq('user_id', userId)
    .gte('expense_date', dateRange.min)
    .lte('expense_date', dateRange.max)

  if (error) throw error

  const totals = {}
  for (const { category_id, amount } of data) {
    totals[category_id] = (totals[category_id] ?? 0) + Number(amount)
  }
  return totals
}

export async function deleteExpense(supabase, userId, id) {
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data // null se não existia (ou não é do usuário)
}
