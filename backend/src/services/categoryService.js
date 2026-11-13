// Acesso ao banco para a tabela categories.

import { ValidationError } from '../utils/validators.js'

const SELECT = 'id, name, description'

// Traduz erros de constraint do Postgres pra mensagens que fazem sentido pro usuário.
function mapError(error) {
  if (error.code === '23505') {
    return new ValidationError('Já existe uma categoria com esse nome.')
  }
  // 23503 = foreign_key_violation; 23001 = restrict_violation (o PostgreSQL 18+
  // usa esse código quando a chave estrangeira é "on delete restrict").
  if (error.code === '23503' || error.code === '23001') {
    return new ValidationError('Não é possível excluir: existem gastos nessa categoria.')
  }
  return error
}

export async function listCategories(supabase, userId) {
  const { data, error } = await supabase
    .from('categories')
    .select(SELECT)
    .eq('user_id', userId)

  if (error) throw error

  // Ordena em JS (pt-BR) pra "Saúde" e "Alimentação" não irem parar no fim
  // por causa da collation do banco.
  return data.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

// Confirma que a categoria existe E é do usuário (o RLS esconde as dos outros).
export async function getCategoryById(supabase, userId, id) {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data // null se não existe ou não é do usuário
}

export async function createCategory(supabase, userId, fields) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...fields, user_id: userId })
    .select(SELECT)
    .single()

  if (error) throw mapError(error)
  return data
}

export async function updateCategory(supabase, userId, id, fields) {
  const { data, error } = await supabase
    .from('categories')
    .update(fields)
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT)
    .maybeSingle()

  if (error) throw mapError(error)
  return data // null se não existe (ou não é do usuário)
}

export async function deleteCategory(supabase, userId, id) {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) throw mapError(error)
  return data // null se não existia (ou não é do usuário)
}
