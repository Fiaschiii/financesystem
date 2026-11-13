// Acesso ao banco para a tabela budgets ("caixinhas": limite de gasto por
// categoria em um mês/ano).

import { ValidationError } from '../utils/validators.js'

const SELECT = 'id, category_id, month, year, limit_amount, category:categories(id, name)'

function mapError(error) {
  if (error.code === '23505') {
    return new ValidationError('Já existe uma caixinha para essa categoria neste mês.')
  }
  return error
}

export async function listBudgets(supabase, userId, month, year) {
  const { data, error } = await supabase
    .from('budgets')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)

  if (error) throw error

  // Ordena em JS (pt-BR), igual às categorias.
  return data.sort((a, b) => a.category.name.localeCompare(b.category.name, 'pt-BR'))
}

export async function createBudget(supabase, userId, fields) {
  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...fields, user_id: userId })
    .select(SELECT)
    .single()

  if (error) throw mapError(error)
  return data
}

// Só o limite pode mudar: categoria, mês e ano identificam o registro.
export async function updateBudget(supabase, userId, id, limitAmount) {
  const { data, error } = await supabase
    .from('budgets')
    .update({ limit_amount: limitAmount })
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT)
    .maybeSingle()

  if (error) throw mapError(error)
  return data // null se não existe (ou não é do usuário)
}

export async function deleteBudget(supabase, userId, id) {
  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data // null se não existia (ou não é do usuário)
}
